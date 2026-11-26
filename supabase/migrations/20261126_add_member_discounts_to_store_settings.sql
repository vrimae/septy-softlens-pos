-- Migration: Add configurable member discount amounts to store_settings
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS discount_member_gold NUMERIC(15,2) DEFAULT 3000.00,
ADD COLUMN IF NOT EXISTS discount_member_vip NUMERIC(15,2) DEFAULT 5000.00;
