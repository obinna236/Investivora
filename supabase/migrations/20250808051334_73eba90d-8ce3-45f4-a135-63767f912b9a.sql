-- Add reference column to deposits table for Paystack integration
ALTER TABLE public.deposits 
ADD COLUMN reference TEXT UNIQUE;