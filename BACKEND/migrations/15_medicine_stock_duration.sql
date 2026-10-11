-- Phase 2 Medicine Stock & Duration Tracking Migration
-- Family Health Guardian

-- 1. Add stock and duration columns to medicines table
ALTER TABLE public.medicines
ADD COLUMN IF NOT EXISTS total_quantity NUMERIC,
ADD COLUMN IF NOT EXISTS remaining_quantity NUMERIC,
ADD COLUMN IF NOT EXISTS daily_usage NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS duration_days INTEGER,
ADD COLUMN IF NOT EXISTS refill_reminder_date DATE,
ADD COLUMN IF NOT EXISTS refill_reminder_days_before INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'AVAILABLE',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

-- 2. Add validation check constraints
DO $$ BEGIN
    ALTER TABLE public.medicines
    ADD CONSTRAINT check_positive_total_quantity CHECK (total_quantity IS NULL OR total_quantity >= 0);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.medicines
    ADD CONSTRAINT check_positive_remaining_quantity CHECK (remaining_quantity IS NULL OR remaining_quantity >= 0);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.medicines
    ADD CONSTRAINT check_positive_daily_usage CHECK (daily_usage IS NULL OR daily_usage > 0);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.medicines
    ADD CONSTRAINT check_positive_duration_days CHECK (duration_days IS NULL OR duration_days > 0);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Indexes for fast queries by stock status, reminder date, and active state
CREATE INDEX IF NOT EXISTS idx_medicines_stock_status ON public.medicines(stock_status);
CREATE INDEX IF NOT EXISTS idx_medicines_refill_reminder_date ON public.medicines(refill_reminder_date);
CREATE INDEX IF NOT EXISTS idx_medicines_status ON public.medicines(status);
