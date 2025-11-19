-- Add RLS policies for receipts storage bucket
-- Allow authenticated users to upload PDFs to their tenant's folder
CREATE POLICY "Allow authenticated users to upload receipts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' 
  AND auth.uid() IN (
    SELECT user_id 
    FROM public.user_roles 
    WHERE tenant_id::text = (storage.foldername(name))[1]
  )
);

-- Allow authenticated users to read PDFs from their tenant's folder
CREATE POLICY "Allow authenticated users to read receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND auth.uid() IN (
    SELECT user_id 
    FROM public.user_roles 
    WHERE tenant_id::text = (storage.foldername(name))[1]
  )
);

-- Allow authenticated users to update/delete PDFs in their tenant's folder
CREATE POLICY "Allow authenticated users to update receipts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND auth.uid() IN (
    SELECT user_id 
    FROM public.user_roles 
    WHERE tenant_id::text = (storage.foldername(name))[1]
  )
);