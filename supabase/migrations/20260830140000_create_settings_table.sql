-- Create settings table to store site configuration including Cashfree payment settings
CREATE TABLE IF NOT EXISTS public.settings (
  id text PRIMARY KEY DEFAULT 'default',
  whatsapp_number text NOT NULL DEFAULT '917078718575',
  cashfree_app_id text NOT NULL DEFAULT '',
  cashfree_mode text NOT NULL DEFAULT 'PRODUCTION',
  shipping_fee numeric(10,2) NOT NULL DEFAULT 30,
  free_shipping_above numeric(10,2) NOT NULL DEFAULT 500,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default row if not present
INSERT INTO public.settings (id, whatsapp_number, cashfree_app_id, cashfree_mode, shipping_fee, free_shipping_above)
VALUES ('default', '917078718575', '', 'PRODUCTION', 30, 500)
ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON public.settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings are publicly readable"
ON public.settings FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Admins can insert settings"
ON public.settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update settings"
ON public.settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
