CREATE POLICY "Anyone can upload payment proofs"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Admins can read payment proofs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));