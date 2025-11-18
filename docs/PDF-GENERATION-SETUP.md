# PDF Generation Setup Guide (PDF-V2.1)

## 🚀 Quick Setup

### 1. Create Storage Bucket

The `receipts` bucket must be created manually in Supabase Dashboard:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/akchmpmzcupzjaeewdui/storage/buckets)
2. Click "New bucket"
3. Configure:
   - **Name**: `receipts`
   - **Public**: ✅ Yes (for guest access to folio PDFs)
   - **File size limit**: 10 MB
   - **Allowed MIME types**: `text/html`, `application/pdf`

### 2. Configure RLS Policies

After creating the bucket, add these policies in SQL Editor:

```sql
-- Allow authenticated users to upload receipts for their tenant
CREATE POLICY "Users can upload receipts for their tenant"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] IN (
    SELECT tenant_id::text 
    FROM user_roles 
    WHERE user_id = auth.uid()
  )
);

-- Allow public read access to receipts
CREATE POLICY "Public can view receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');

-- Allow users to delete receipts for their tenant
CREATE POLICY "Users can delete receipts for their tenant"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] IN (
    SELECT tenant_id::text 
    FROM user_roles 
    WHERE user_id = auth.uid()
  )
);
```

### 3. Verify Edge Function Deployment

Check that `generate-folio-pdf` is deployed:

```bash
supabase functions list
```

Should show `generate-folio-pdf` with status: deployed

### 4. Test PDF Generation

From Billing Center (`/dashboard/billing/:folioId`):

1. Click **Print** button
2. Check browser console for `PDF-V2.1` logs
3. Check edge function logs: `supabase functions logs generate-folio-pdf`
4. Verify PDF opens in new tab

Expected console logs:
```
PDF-V2.1: Request received
PDF-V2.1: Generating PDF { folio_id, tenant_id, format, include_qr }
PDF-V2.1: Fetching folio data...
PDF-V2.1: Folio data fetched { transaction_count, balance }
PDF-V2.1: Generating HTML folio...
PDF-V2.1: Uploading to storage...
PDF-V2.1: PDF generation complete { duration_ms }
```

### 5. Test Email Workflow

1. Click **Email** button
2. Enter guest email
3. Check email delivery
4. Verify PDF link works in email

### 6. Test Download Workflow

1. Click **Download** button
2. Verify file downloads with correct name
3. Check HTML file opens correctly

## 📋 Troubleshooting

### PDF Generation Fails

**Error**: `Failed to upload folio`

**Solution**: 
- Verify `receipts` bucket exists
- Check RLS policies are correctly configured
- Ensure edge function has `SUPABASE_SERVICE_ROLE_KEY`

### Email Not Sending

**Error**: `Email provider not configured`

**Solution**:
- Verify `RESEND_API_KEY` secret is set
- Check Resend domain verification at https://resend.com/domains
- Ensure sender email domain is verified

### No Logs in Edge Function

**Solution**:
- Verify function is deployed: `supabase functions list`
- Redeploy: `supabase functions deploy generate-folio-pdf`
- Check function invocation in Network tab

## 🔍 Version Markers

All logs include `PDF-V2.1` marker for tracking:
- Request received
- Data fetching steps
- HTML generation
- Storage upload
- Error scenarios
- Completion with duration

## ✅ Success Criteria

- [ ] Storage bucket `receipts` exists and is public
- [ ] RLS policies configured correctly
- [ ] Edge function deployed successfully
- [ ] Print opens PDF in new tab
- [ ] Download saves file locally
- [ ] Email sends with PDF link
- [ ] Console shows `PDF-V2.1` logs
- [ ] Edge function logs show successful executions
