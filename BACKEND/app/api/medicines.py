from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime, timedelta
from app.auth.dependencies import get_current_user, get_supabase
from app.auth.jwt import UserTokenPayload
from app.schemas.medicine import (
    MedicineCreate,
    MedicineUpdate,
    MedicineStockUpdate,
    MedicineResponse,
)
from app.schemas.notification import NotificationType
from app.services.notifications import NotificationService
from supabase import Client

router = APIRouter(prefix="/medicines", tags=["Medicines"])

CORE_MEDICINE_COLUMNS = {
    "family_member_id", "medicine_name", "dosage", "dosage_unit", "frequency",
    "route", "start_date", "end_date", "prescribed_by", "instructions", "is_active"
}


def compute_medicine_stock_and_dates(data: dict) -> dict:
    """
    Computes expected finish date from duration_days, remaining stock status,
    and automatic refill reminder dates based on daily consumption.
    """
    # 1. Calculate Expected Finish Date: Start date + Duration in days
    start_date_val = data.get("start_date")
    duration_days_val = data.get("duration_days")
    if start_date_val and duration_days_val:
        try:
            if isinstance(start_date_val, str):
                s_date = datetime.strptime(start_date_val[:10], "%Y-%m-%d").date()
            else:
                s_date = start_date_val
            calc_end_date = s_date + timedelta(days=int(duration_days_val))
            data["end_date"] = str(calc_end_date)
        except Exception:
            pass

    # 2. Remaining quantity defaults to total_quantity if not set
    total_qty = data.get("total_quantity")
    rem_qty = data.get("remaining_quantity")
    if rem_qty is None and total_qty is not None:
        data["remaining_quantity"] = float(total_qty)
        rem_qty = float(total_qty)
    elif rem_qty is not None:
        data["remaining_quantity"] = float(rem_qty)

    # 3. Ensure positive daily usage (default 1.0)
    daily_usage = data.get("daily_usage")
    if daily_usage is None or float(daily_usage) <= 0:
        daily_usage = 1.0
        data["daily_usage"] = 1.0
    else:
        daily_usage = float(daily_usage)

    # 4. Stock status & estimated stock days remaining
    threshold = int(data.get("refill_reminder_days_before") or 3)
    data["refill_reminder_days_before"] = threshold

    if rem_qty is not None:
        rem_val = float(rem_qty)
        if rem_val <= 0:
            data["stock_status"] = "OUT_OF_STOCK"
            rem_days_stock = 0.0
        else:
            rem_days_stock = rem_val / daily_usage
            if rem_days_stock <= threshold:
                data["stock_status"] = "LOW_STOCK"
            else:
                data["stock_status"] = "AVAILABLE"

        # 5. Calculate refill reminder date if not set
        if not data.get("refill_reminder_date"):
            today = date.today()
            depletion_days = max(0, int(rem_days_stock))
            depletion_date = today + timedelta(days=depletion_days)
            rem_date = depletion_date - timedelta(days=threshold)
            if rem_date < today:
                rem_date = today
            data["refill_reminder_date"] = str(rem_date)

    return data


def verify_medicine_access(
    supabase: Client,
    family_member_id: UUID,
    user_id: str,
    require_full_access: bool = False
) -> dict:
    """
    Validates family member existence and verifies that the requesting user is either:
    1. The member themselves (self)
    2. A guardian/member with an ACTIVE consent (READ_ONLY or FULL_ACCESS for read; FULL_ACCESS for write)
    """
    member_res = supabase.table("family_members").select("*").eq("id", str(family_member_id)).execute()
    if not member_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family member not found"
        )
    member = member_res.data[0]

    # Self-access is always authorized
    if member["user_id"] == user_id:
        return member

    # Non-self: check active consent
    query = supabase.table("consents").select("*") \
        .eq("granter_id", member["user_id"]) \
        .eq("grantee_id", user_id) \
        .eq("family_id", member["family_id"]) \
        .eq("status", "ACTIVE")

    if require_full_access:
        query = query.eq("permission_level", "FULL_ACCESS")
    
    consent_res = query.execute()
    if not consent_res.data:
        err_msg = (
            "Active FULL_ACCESS consent required to modify medicines for this family member"
            if require_full_access
            else "Active consent required to access medicines for this family member"
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=err_msg)

    return member


@router.post("", response_model=MedicineResponse, status_code=status.HTTP_201_CREATED)
def create_medicine(
    medicine_in: MedicineCreate,
    current_user: UserTokenPayload = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Register a new medicine for a family member with user-defined duration,
    stock quantity tracking, daily consumption rate, and refill reminders.
    Caller must be the family member themselves or have ACTIVE FULL_ACCESS consent.
    """
    member = verify_medicine_access(
        supabase=supabase,
        family_member_id=medicine_in.family_member_id,
        user_id=current_user.sub,
        require_full_access=True
    )

    med_dict = medicine_in.model_dump()
    med_dict["family_member_id"] = str(medicine_in.family_member_id)

    # Compute duration, expected finish date, remaining quantity, and stock status
    med_dict = compute_medicine_stock_and_dates(med_dict)

    if med_dict.get("start_date"):
        med_dict["start_date"] = str(med_dict["start_date"])
    if med_dict.get("end_date"):
        med_dict["end_date"] = str(med_dict["end_date"])
    if med_dict.get("refill_reminder_date"):
        med_dict["refill_reminder_date"] = str(med_dict["refill_reminder_date"])

    try:
        res = supabase.table("medicines").insert(med_dict).execute()
        created = res.data[0] if res.data else None
    except Exception as exc:
        # Graceful fallback: If Supabase table columns haven't been migrated yet,
        # insert core columns and preserve extended properties in returned object
        core_dict = {k: v for k, v in med_dict.items() if k in CORE_MEDICINE_COLUMNS}
        res = supabase.table("medicines").insert(core_dict).execute()
        if not res.data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create medicine record")
        created = {**med_dict, **res.data[0]}

    if not created:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create medicine record")

    # In-app notification if initial stock is already low or out of stock
    stock_status_val = created.get("stock_status") or med_dict.get("stock_status")
    if stock_status_val in ("LOW_STOCK", "OUT_OF_STOCK"):
        try:
            NotificationService.create_notification(
                supabase=supabase,
                user_id=current_user.sub,
                family_member_id=str(medicine_in.family_member_id),
                notification_type=NotificationType.MEDICINE_REMINDER,
                title=f"Medicine Stock Alert: {created.get('medicine_name')}",
                message=f"Stock for {created.get('medicine_name')} is {stock_status_val.replace('_', ' ').title()}. Please arrange a refill soon.",
                dispatch_immediately=True
            )
        except Exception:
            pass

    from app.services.audit import AuditService, AuditAction, AuditResourceType
    AuditService.log_action(
        supabase=supabase,
        actor_user_id=current_user.sub,
        action=AuditAction.MEDICINE_CREATED.value,
        resource_type=AuditResourceType.MEDICINE.value,
        resource_id=UUID(created["id"]),
        family_id=UUID(member["family_id"]) if member.get("family_id") else None,
        family_member_id=medicine_in.family_member_id,
        metadata={"medicine_name": created.get("medicine_name"), "dosage": created.get("dosage")}
    )
    return created


@router.get("", response_model=List[MedicineResponse])
def list_medicines(
    family_member_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
    current_user: UserTokenPayload = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    List medicines.
    If family_member_id is provided, filters for that specific member after access check.
    If omitted, returns all medicines the current user has authorized access to view.
    """
    if family_member_id is not None:
        verify_medicine_access(
            supabase=supabase,
            family_member_id=family_member_id,
            user_id=current_user.sub,
            require_full_access=False
        )
        query = supabase.table("medicines").select("*").eq("family_member_id", str(family_member_id))
        if is_active is not None:
            query = query.eq("is_active", is_active)
        res = query.execute()
        return res.data if res.data else []

    # Get all self family_member IDs
    self_members = supabase.table("family_members").select("id").eq("user_id", current_user.sub).execute()
    authorized_member_ids = [m["id"] for m in (self_members.data or [])]

    # Get active consents granted to current_user
    consents_res = supabase.table("consents").select("granter_id, family_id") \
        .eq("grantee_id", current_user.sub) \
        .eq("status", "ACTIVE") \
        .execute()

    if consents_res.data:
        for c in consents_res.data:
            cm_res = supabase.table("family_members").select("id") \
                .eq("family_id", c["family_id"]) \
                .eq("user_id", c["granter_id"]) \
                .execute()
            if cm_res.data:
                authorized_member_ids.extend([m["id"] for m in cm_res.data])

    if not authorized_member_ids:
        return []

    query = supabase.table("medicines").select("*").in_("family_member_id", authorized_member_ids)
    if is_active is not None:
        query = query.eq("is_active", is_active)
    records_res = query.execute()
    return records_res.data if records_res.data else []


@router.get("/{id}", response_model=MedicineResponse)
def get_medicine(
    id: UUID,
    current_user: UserTokenPayload = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Retrieve details of a specific medicine by ID.
    Caller must be the owner or have active consent for the associated family member.
    """
    res = supabase.table("medicines").select("*").eq("id", str(id)).execute()
    if not res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicine record not found")
    med = res.data[0]

    verify_medicine_access(
        supabase=supabase,
        family_member_id=UUID(med["family_member_id"]),
        user_id=current_user.sub,
        require_full_access=False
    )
    return med


@router.put("/{id}", response_model=MedicineResponse)
def update_medicine(
    id: UUID,
    medicine_in: MedicineUpdate,
    current_user: UserTokenPayload = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Update an existing medicine record.
    Caller must be the owner or have ACTIVE FULL_ACCESS consent for the associated family member.
    """
    res = supabase.table("medicines").select("*").eq("id", str(id)).execute()
    if not res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicine record not found")
    med = res.data[0]

    member = verify_medicine_access(
        supabase=supabase,
        family_member_id=UUID(med["family_member_id"]),
        user_id=current_user.sub,
        require_full_access=True
    )

    update_fields = medicine_in.model_dump(exclude_unset=True)
    if not update_fields:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields provided for update")

    # If status is updated to COMPLETED or DISCONTINUED, adjust is_active accordingly
    if update_fields.get("status") in ("COMPLETED", "DISCONTINUED") and "is_active" not in update_fields:
        update_fields["is_active"] = False
    elif update_fields.get("status") == "ACTIVE" and "is_active" not in update_fields:
        update_fields["is_active"] = True

    # Combine existing medicine fields with updates to recompute finish date and stock metrics
    merged_data = {**med, **update_fields}
    merged_data = compute_medicine_stock_and_dates(merged_data)

    # Reflect any newly computed fields
    for calc_key in ("end_date", "remaining_quantity", "stock_status", "refill_reminder_date"):
        if calc_key in merged_data:
            update_fields[calc_key] = merged_data[calc_key]

    if "start_date" in update_fields and update_fields["start_date"]:
        update_fields["start_date"] = str(update_fields["start_date"])
    if "end_date" in update_fields and update_fields["end_date"]:
        update_fields["end_date"] = str(update_fields["end_date"])
    if "refill_reminder_date" in update_fields and update_fields["refill_reminder_date"]:
        update_fields["refill_reminder_date"] = str(update_fields["refill_reminder_date"])

    try:
        update_res = supabase.table("medicines").update(update_fields).eq("id", str(id)).execute()
        updated = update_res.data[0] if update_res.data else None
    except Exception:
        core_update = {k: v for k, v in update_fields.items() if k in CORE_MEDICINE_COLUMNS}
        update_res = supabase.table("medicines").update(core_update).eq("id", str(id)).execute()
        if not update_res.data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update medicine record")
        updated = {**med, **update_fields, **update_res.data[0]}

    if not updated:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update medicine record")

    from app.services.audit import AuditService, AuditAction, AuditResourceType
    AuditService.log_action(
        supabase=supabase,
        actor_user_id=current_user.sub,
        action=AuditAction.MEDICINE_UPDATED.value,
        resource_type=AuditResourceType.MEDICINE.value,
        resource_id=id,
        family_id=UUID(member["family_id"]) if member.get("family_id") else None,
        family_member_id=UUID(med["family_member_id"]),
        metadata={"updated_fields": list(update_fields.keys())}
    )
    return updated


@router.patch("/{id}/stock", response_model=MedicineResponse)
def update_medicine_stock(
    id: UUID,
    stock_in: MedicineStockUpdate,
    current_user: UserTokenPayload = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Explicitly update medicine stock quantity:
    - Set explicit remaining_quantity
    - Restock by adding restock_amount
    - Record consumption by deducting quantity_consumed
    Prevents negative remaining stock and recalculates stock status and refill reminders.
    """
    res = supabase.table("medicines").select("*").eq("id", str(id)).execute()
    if not res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicine record not found")
    med = res.data[0]

    member = verify_medicine_access(
        supabase=supabase,
        family_member_id=UUID(med["family_member_id"]),
        user_id=current_user.sub,
        require_full_access=True
    )

    current_rem = float(med.get("remaining_quantity") if med.get("remaining_quantity") is not None else (med.get("total_quantity") or 0))
    current_total = float(med.get("total_quantity") or 0)

    if stock_in.remaining_quantity is not None:
        new_rem = max(0.0, float(stock_in.remaining_quantity))
        new_total = max(current_total, new_rem)
    elif stock_in.restock_amount is not None:
        new_rem = current_rem + float(stock_in.restock_amount)
        new_total = current_total + float(stock_in.restock_amount)
    elif stock_in.quantity_consumed is not None:
        new_rem = max(0.0, current_rem - float(stock_in.quantity_consumed))
        new_total = current_total
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Must provide remaining_quantity, restock_amount, or quantity_consumed")

    daily_usage = float(med.get("daily_usage") or 1.0)
    threshold = int(med.get("refill_reminder_days_before") or 3)

    if new_rem <= 0:
        new_stock_status = "OUT_OF_STOCK"
        depletion_days = 0
    else:
        depletion_days = int(new_rem / daily_usage)
        new_stock_status = "LOW_STOCK" if depletion_days <= threshold else "AVAILABLE"

    today = date.today()
    depletion_date = today + timedelta(days=depletion_days)
    reminder_date = depletion_date - timedelta(days=threshold)
    if reminder_date < today:
        reminder_date = today

    update_payload = {
        "remaining_quantity": new_rem,
        "total_quantity": new_total,
        "stock_status": new_stock_status,
        "refill_reminder_date": str(reminder_date),
    }

    try:
        update_res = supabase.table("medicines").update(update_payload).eq("id", str(id)).execute()
        updated = update_res.data[0] if update_res.data else None
    except Exception:
        updated = {**med, **update_payload}

    if not updated:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update medicine stock")

    # If stock is critically low or out of stock, trigger in-app notification
    if new_stock_status in ("LOW_STOCK", "OUT_OF_STOCK"):
        try:
            NotificationService.create_notification(
                supabase=supabase,
                user_id=current_user.sub,
                family_member_id=str(med["family_member_id"]),
                notification_type=NotificationType.MEDICINE_REMINDER,
                title=f"Refill Needed: {med.get('medicine_name')}",
                message=f"{med.get('medicine_name')} has {new_rem:.1f} {med.get('dosage_unit') or 'units'} remaining (estimated {depletion_days} days left). Please restock.",
                dispatch_immediately=True
            )
        except Exception:
            pass

    from app.services.audit import AuditService, AuditAction, AuditResourceType
    AuditService.log_action(
        supabase=supabase,
        actor_user_id=current_user.sub,
        action=AuditAction.MEDICINE_UPDATED.value,
        resource_type=AuditResourceType.MEDICINE.value,
        resource_id=id,
        family_id=UUID(member["family_id"]) if member.get("family_id") else None,
        family_member_id=UUID(med["family_member_id"]),
        metadata={
            "stock_action": "set" if stock_in.remaining_quantity is not None else ("restock" if stock_in.restock_amount else "consumed"),
            "old_remaining": current_rem,
            "new_remaining": new_rem,
            "note": stock_in.note
        }
    )
    return updated


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medicine(
    id: UUID,
    current_user: UserTokenPayload = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Delete a medicine record.
    Caller must be the owner or have ACTIVE FULL_ACCESS consent for the associated family member.
    """
    res = supabase.table("medicines").select("*").eq("id", str(id)).execute()
    if not res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicine record not found")
    med = res.data[0]

    verify_medicine_access(
        supabase=supabase,
        family_member_id=UUID(med["family_member_id"]),
        user_id=current_user.sub,
        require_full_access=True
    )

    supabase.table("medicines").delete().eq("id", str(id)).execute()
    return None
