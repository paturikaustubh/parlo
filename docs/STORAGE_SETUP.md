# Storage Setup Instructions

To use the file upload functionality, create a Supabase Storage bucket:

## Manual Setup

1. Go to your Supabase project dashboard
2. Navigate to **Storage → New Bucket**
3. Bucket ID: `business-documents`
4. Access Level: **Public** (to allow direct URL access to uploaded files)

## SQL Setup

Run this via the Supabase SQL editor:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-documents',
  'business-documents',
  true,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
);
```

## Environment Variables

Add to your `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

The service role key (not the anon key) is required for server-side uploads to bypass Row Level Security.
