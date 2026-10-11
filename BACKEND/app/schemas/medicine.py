from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import date, datetime
from uuid import UUID


class MedicineBase(BaseModel):
    medicine_name: str = Field(..., min_length=1, max_length=150, description="Brand or generic name of medicine")
    dosage: Optional[str] = Field(None, max_length=50, description="Dosage quantity, e.g. 500, 10, 1")
    dosage_unit: Optional[str] = Field(None, max_length=30, description="Unit e.g. tablets, capsules, ml, drops, puffs")
    frequency: Optional[str] = Field(None, max_length=100, description="Intake frequency e.g. Once daily, Twice daily")
    route: Optional[str] = Field(None, max_length=50, description="Administration route e.g. Oral, Topical, Inhalation")
    start_date: Optional[date] = Field(None, description="Prescription or regimen start date")
    end_date: Optional[date] = Field(None, description="Prescription or regimen end date")
    duration_days: Optional[int] = Field(None, gt=0, description="User-defined regimen duration in days")
    total_quantity: Optional[float] = Field(None, ge=0, description="Total stock quantity available initially or restocked")
    remaining_quantity: Optional[float] = Field(None, ge=0, description="Current remaining stock quantity")
    daily_usage: Optional[float] = Field(1.0, gt=0, description="Quantity consumed per day")
    refill_reminder_date: Optional[date] = Field(None, description="Refill reminder date")
    refill_reminder_days_before: Optional[int] = Field(3, ge=1, description="Days before stock depletion to notify")
    stock_status: Optional[str] = Field("AVAILABLE", description="Stock status: AVAILABLE, LOW_STOCK, OUT_OF_STOCK")
    status: Optional[str] = Field("ACTIVE", description="Medication status: ACTIVE, COMPLETED, DISCONTINUED")
    prescribed_by: Optional[str] = Field(None, max_length=100, description="Prescribing physician or specialist")
    instructions: Optional[str] = Field(None, max_length=1000, description="Usage instructions e.g. Take with food")
    is_active: bool = Field(True, description="Whether the medication is currently active")


class MedicineCreate(MedicineBase):
    family_member_id: UUID = Field(..., description="ID of the family member this medicine is prescribed for")


class MedicineUpdate(BaseModel):
    medicine_name: Optional[str] = Field(None, min_length=1, max_length=150)
    dosage: Optional[str] = Field(None, max_length=50)
    dosage_unit: Optional[str] = Field(None, max_length=30)
    frequency: Optional[str] = Field(None, max_length=100)
    route: Optional[str] = Field(None, max_length=50)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    duration_days: Optional[int] = Field(None, gt=0)
    total_quantity: Optional[float] = Field(None, ge=0)
    remaining_quantity: Optional[float] = Field(None, ge=0)
    daily_usage: Optional[float] = Field(None, gt=0)
    refill_reminder_date: Optional[date] = None
    refill_reminder_days_before: Optional[int] = Field(None, ge=1)
    stock_status: Optional[str] = None
    status: Optional[str] = None
    prescribed_by: Optional[str] = Field(None, max_length=100)
    instructions: Optional[str] = Field(None, max_length=1000)
    is_active: Optional[bool] = None


class MedicineStockUpdate(BaseModel):
    remaining_quantity: Optional[float] = Field(None, ge=0, description="Explicit new remaining stock quantity")
    restock_amount: Optional[float] = Field(None, gt=0, description="Amount to add to current remaining stock")
    quantity_consumed: Optional[float] = Field(None, gt=0, description="Amount consumed to deduct from stock")
    note: Optional[str] = Field(None, max_length=255, description="Reason or note for stock update")


class MedicineResponse(MedicineBase):
    id: UUID
    family_member_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
