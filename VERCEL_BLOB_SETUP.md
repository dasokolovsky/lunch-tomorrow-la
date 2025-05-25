# Vercel Blob Storage Setup

## Environment Variables Required

Add this to your `.env.local` file:

```
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here
```

## How to Get Your Vercel Blob Token

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project** (lunch-tomorrow-la)
3. **Go to Settings** → **Environment Variables**
4. **Add New Variable**:
   - Name: `BLOB_READ_WRITE_TOKEN`
   - Value: (will be generated automatically when you enable Blob storage)

## Enable Vercel Blob Storage

1. **In your Vercel project settings**, go to **Storage**
2. **Click "Create Database"** → **Blob**
3. **Follow the setup wizard**
4. **Copy the generated token** to your environment variables

## Local Development

For local development, you can also use Vercel CLI:

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Link your project
vercel link

# Pull environment variables
vercel env pull .env.local
```

## Testing the Setup

Once configured, you can test the upload functionality:

1. Go to `/admin/menu`
2. Click "Add Menu Item"
3. Try uploading an image using the drag & drop area
4. The image should upload to Vercel Blob and display in the preview

## File Specifications

- **Supported formats**: JPG, PNG, WebP
- **Maximum file size**: 5MB
- **Automatic naming**: `menu-item-{timestamp}-{random}.{ext}`
- **Public access**: All uploaded images are publicly accessible
