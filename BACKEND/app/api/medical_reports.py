from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from typing import List, Optional
from datetime import date
from uuid import UUID
import uuid
import os
import mimetypes

from app.auth.dependencies import get_current_user, get_supabase
from app.auth.jwt import UserTokenPayload
from app.api.health_records import verify_member_access
from app.schemas.medical_report import (
    MedicalReportResponse,
)
from app.db.supabase import get_service_role_client
from app.config import settings
from supabase import Client

router = APIRouter(prefix="/medical-reports", tags=["Medical Reports"])

# ---------------------------------------------------------------------------
# Storage constants
# The bucket is named "medical-reports" in Supabase (private).
# When users/docs refer to "health-records bucket" that is an alias for the same bucket.
# ---------------------------------------------------------------------------
STORAGE_BUCKET = settings.HEALTH_RECORDS_BUCKET  # "medical-reports"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB hard limit

# Allowed MIME types and their corresponding extensions (cross-validated)
ALLOWED_MIME_TO_EXT: dict[str, set[str]] = {
    "application/pdf": {".pdf"},
    "image/jpeg": {".jpg", ".jpeg"},
    "image/jpg": {".jpg", ".jpeg"},
    "image/png": {".png"},
}

ALLOWED_MIME_TYPES = set(ALLOWED_MIME_TO_EXT.keys())
ALLOWED_EXTENSIONS = {ext for exts in ALLOWED_MIME_TO_EXT.values() for ext in exts}


def _validate_file(filename: str, content_type: str) -> None:
    """
    Cross-validates file extension against declared MIME type.
    Raises HTTP 400 on any mismatch or disallowed type.
    """
    file_ext = os.path.splitext(filename or "")[1].lower()
    mime = (content_type or "").lower().split(";")[0].strip()

    if mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported MIME type '{mime}'. Allowed: PDF, JPEG, PNG."
        )
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{file_ext}'. Allowed: .pdf, .jpg, .jpeg, .png"
        )
    # Cross-check: declared extension must be valid for the declared MIME type
    allowed_exts_for_mime = ALLOWED_MIME_TO_EXT.get(mime, set())
    if file_ext not in allowed_exts_for_mime:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"File extension '{file_ext}' does not match MIME type '{mime}'. "
                "Extension and content type must be consistent."
            )
        )


def _sanitize_filename(filename: Optional[str]) -> str:
    """Returns only the basename, stripping any directory traversal components."""
    return os.path.basename(filename or "upload")


def get_signed_url(storage_path: str, expires_in: int = 300) -> Optional[str]:
    """
    Generates a secure, short-lived signed URL for a private bucket object.
    Uses the service-role client so the URL is always generable regardless of
    the caller's auth state (authorization is checked at the API layer).
    """
    try:
        svc = get_service_role_client()
        res = svc.storage.from_(STORAGE_BUCKET).create_signed_url(storage_path, expires_in)
        if isinstance(res, dict):
            return res.get("signedURL") or res.get("signed_url") or res.get("signedUrl")
        return str(res) if res else None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# POST /medical-reports   — upload
# ---------------------------------------------------------------------------
@router.post("", response_model=MedicalReportResponse, status_code=status.HTTP_201_CREATED)
async def upload_medical_report(
    file: UploadFile = File(..., description="PDF, JPG, JPEG, or PNG health report file (max 10 MB)"),
    family_member_id: UUID = Form(..., description="Target family member UUID"),
    report_type: str = Form("GENERAL", description="Classification: LAB_REPORT, PRESCRIPTION, IMAGING_SCAN, DISCHARGE_SUMMARY, GENERAL, OTHER"),
    report_date: Optional[date] = Form(None, description="Date the report was issued (defaults to today)"),
    description: Optional[str] = Form(None, description="Optional notes or summary"),
    current_user: UserTokenPayload = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Upload a medical / health record file (PDF, JPG, JPEG, PNG).

    Security:
    - Caller must be the family member themselves or hold ACTIVE FULL_ACCESS consent.
    - File binary is stored in the private `medical-reports` Supabase Storage bucket
      using the service-role key (bypasses bucket RLS); authorization is enforced here.
    - Metadata (path, name, type, size, owner) is written to PostgreSQL via the
      user-scoped client so table RLS still applies.
    - Max upload size: 10 MB.
    """
    # 1. Authorization — must be self or have FULL_ACCESS consent
    member = verify_member_access(
        supabase=supabase,
        family_member_id=family_member_id,
        user_id=current_user.sub,
        require_full_access=True
    )

    # 2. Validate file extension and MIME type (cross-validated)
    sanitized_filename = _sanitize_filename(file.filename)
    _validate_file(sanitized_filename, file.content_type or "")

    # 3. Read file bytes and enforce size limit
    contents = await file.read()
    file_size = len(contents)

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"File size {file_size / (1024 * 1024):.2f} MB exceeds the 10 MB maximum. "
                "Please compress the file and try again."
            )
        )

    # 4. Build a safe, unique storage path — no traversal possible
    content_type = (file.content_type or "application/octet-stream").lower().split(";")[0].strip()
    storage_path = f"{family_member_id}/{uuid.uuid4()}_{sanitized_filename}"

    # 5. Upload binary to private Supabase Storage using service-role client
    #    (authorization was already verified in step 1)
    try:
        svc = get_service_role_client()
        svc.storage.from_(STORAGE_BUCKET).upload(
            storage_path,
            contents,
            file_options={"content-type": content_type}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file to secure storage: {str(e)}"
        )

    # 6. Persist metadata to PostgreSQL (user-scoped client → RLS enforced on table)
    report_dict = {
        "family_member_id": str(family_member_id),
        "uploaded_by": current_user.sub,
        "file_name": sanitized_filename,
        "storage_path": storage_path,
        "report_type": report_type.upper(),
        "mime_type": content_type,
        "file_size": file_size,
        "report_date": str(report_date) if report_date else str(date.today()),
        "description": description,
    }

    res = supabase.table("medical_reports").insert(report_dict).execute()
    if not res.data:
        # Rollback: remove the already-uploaded file
        try:
            svc.storage.from_(STORAGE_BUCKET).remove([storage_path])
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to save report metadata to database."
        )

    report_record = res.data[0]
    report_record["download_url"] = get_signed_url(storage_path, expires_in=300)

    # 7. Audit log
    from app.services.audit import AuditService, AuditAction, AuditResourceType
    AuditService.log_action(
        supabase=supabase,
        actor_user_id=current_user.sub,
        action=AuditAction.MEDICAL_REPORT_UPLOADED.value,
        resource_type=AuditResourceType.MEDICAL_REPORT.value,
        resource_id=UUID(report_record["id"]),
        family_id=UUID(member["family_id"]) if member.get("family_id") else None,
        family_member_id=family_member_id,
        metadata={
            "file_name": sanitized_filename,
            "report_type": report_type.upper(),
            "file_size": file_size,
            "mime_type": content_type,
        }
    )
    return report_record


# ---------------------------------------------------------------------------
# GET /medical-reports   — list
# ---------------------------------------------------------------------------
@router.get("", response_model=List[MedicalReportResponse])
def list_medical_reports(
    family_member_id: Optional[UUID] = None,
    report_type: Optional[str] = None,
    current_user: UserTokenPayload = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    List medical reports accessible to the authenticated user.
    - Optionally filter by family_member_id and/or report_type.
    - Returns records for all members the user is authorized to view (self + active consents).
    - Each record includes a short-lived signed download URL (valid 5 minutes).
    """
    if family_member_id is not None:
        verify_member_access(
            supabase=supabase,
            family_member_id=family_member_id,
            user_id=current_user.sub,
            require_full_access=False
        )
        query = supabase.table("medical_reports").select("*").eq("family_member_id", str(family_member_id))
        if report_type:
            query = query.eq("report_type", report_type.upper())
        res = query.execute()
        reports = res.data if res.data else []
        for r in reports:
            r["download_url"] = get_signed_url(r["storage_path"], expires_in=300)
        return reports

    # Self members
    self_members = supabase.table("family_members").select("id").eq("user_id", current_user.sub).execute()
    authorized_member_ids = [m["id"] for m in (self_members.data or [])]

    # Members from active consents granted to current_user
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

    query = supabase.table("medical_reports").select("*").in_("family_member_id", authorized_member_ids)
    if report_type:
        query = query.eq("report_type", report_type.upper())
    res = query.execute()
    reports = res.data if res.data else []
    for r in reports:
        r["download_url"] = get_signed_url(r["storage_path"], expires_in=300)
    return reports


# ---------------------------------------------------------------------------
# GET /medical-reports/{id}   — get / download
# ---------------------------------------------------------------------------
@router.get("/{id}", response_model=MedicalReportResponse)
def get_medical_report(
    id: UUID,
    current_user: UserTokenPayload = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Retrieve metadata and a secure, short-lived signed URL for a specific medical report.
    The signed URL is valid for 5 minutes and grants temporary access to the private
    storage bucket file without exposing any permanent credentials.
    """
    res = supabase.table("medical_reports").select("*").eq("id", str(id)).execute()
    if not res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical report not found")
    report = res.data[0]

    member = verify_member_access(
        supabase=supabase,
        family_member_id=UUID(report["family_member_id"]),
        user_id=current_user.sub,
        require_full_access=False
    )

    report["download_url"] = get_signed_url(report["storage_path"], expires_in=300)

    # Audit: record download access
    from app.services.audit import AuditService, AuditAction, AuditResourceType
    AuditService.log_action(
        supabase=supabase,
        actor_user_id=current_user.sub,
        action=AuditAction.MEDICAL_REPORT_DOWNLOADED.value,
        resource_type=AuditResourceType.MEDICAL_REPORT.value,
        resource_id=id,
        family_id=UUID(member["family_id"]) if member.get("family_id") else None,
        family_member_id=UUID(report["family_member_id"]),
        metadata={"file_name": report.get("file_name")}
    )
    return report


# ---------------------------------------------------------------------------
# DELETE /medical-reports/{id}   — delete
# ---------------------------------------------------------------------------
@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medical_report(
    id: UUID,
    current_user: UserTokenPayload = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Delete a medical report: removes the file from Supabase Storage and the
    metadata row from PostgreSQL.  Requires ACTIVE FULL_ACCESS consent or self.
    """
    res = supabase.table("medical_reports").select("*").eq("id", str(id)).execute()
    if not res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical report not found")
    report = res.data[0]

    member = verify_member_access(
        supabase=supabase,
        family_member_id=UUID(report["family_member_id"]),
        user_id=current_user.sub,
        require_full_access=True
    )

    # 1. Remove file from Supabase Storage (service-role client — auth verified above)
    try:
        svc = get_service_role_client()
        svc.storage.from_(STORAGE_BUCKET).remove([report["storage_path"]])
    except Exception:
        pass  # Best-effort; proceed with DB deletion

    # 2. Delete metadata row
    supabase.table("medical_reports").delete().eq("id", str(id)).execute()

    # 3. Audit log
    from app.services.audit import AuditService, AuditAction, AuditResourceType
    AuditService.log_action(
        supabase=supabase,
        actor_user_id=current_user.sub,
        action=AuditAction.MEDICAL_REPORT_DELETED.value,
        resource_type=AuditResourceType.MEDICAL_REPORT.value,
        resource_id=id,
        family_id=UUID(member["family_id"]) if member.get("family_id") else None,
        family_member_id=UUID(report["family_member_id"]),
        metadata={"file_name": report.get("file_name")}
    )
    return None
