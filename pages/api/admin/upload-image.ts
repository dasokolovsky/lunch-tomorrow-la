import { NextApiRequest, NextApiResponse } from "next";
import { put } from '@vercel/blob';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Disable default body parser to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
// const TARGET_WIDTH = 400;
// const TARGET_HEIGHT = 300;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Parse the multipart form data
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
      filter: ({ mimetype }) => {
        return ALLOWED_TYPES.includes(mimetype || '');
      }
    });

    const [, files] = await form.parse(req);

    const file = Array.isArray(files.image) ? files.image[0] : files.image;

    if (!file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.mimetype || '')) {
      return res.status(400).json({
        error: "Invalid file type. Only JPG, PNG, and WebP are allowed."
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = path.extname(file.originalFilename || '').toLowerCase();
    const fileName = `menu-item-${timestamp}-${randomString}${fileExtension}`;

    // Read the file
    const fileBuffer = fs.readFileSync(file.filepath);

    // Upload to Vercel Blob
    const blob = await put(fileName, fileBuffer, {
      access: 'public',
      contentType: file.mimetype || 'image/jpeg',
    });

    if (!blob.url) {
      console.error('Upload failed: No URL returned');
      return res.status(500).json({
        error: "Failed to upload image",
        details: "No URL returned from blob storage"
      });
    }

    // Clean up temporary file
    try {
      fs.unlinkSync(file.filepath);
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp file:', cleanupError);
    }

    // Return success response
    res.status(200).json({
      success: true,
      fileName: fileName,
      publicUrl: blob.url,
      fileSize: file.size,
      mimeType: file.mimetype,
      originalName: file.originalFilename,
      blobUrl: blob.url
    });

  } catch (error) {
    console.error('Error uploading image:', error);

    if (error instanceof Error) {
      if (error.message.includes('maxFileSize')) {
        return res.status(400).json({
          error: "File too large. Maximum size is 5MB."
        });
      }
    }

    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
