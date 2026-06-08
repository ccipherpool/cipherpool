-- sql/77 — Add WhatsApp fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number       text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_enabled   boolean DEFAULT false;
