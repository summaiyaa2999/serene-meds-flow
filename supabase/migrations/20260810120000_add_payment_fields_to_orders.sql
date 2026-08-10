-- Add payment identifier columns to public.orders table for Cashfree integration
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cf_payment_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_id text;
