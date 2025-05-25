import { NextApiRequest, NextApiResponse } from "next";
import { del } from '@vercel/blob';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { imageUrl } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: "Image URL is required" });
    }

    // Verify this is a Vercel Blob URL
    if (!imageUrl.includes('blob.vercel-storage.com')) {
      return res.status(400).json({ 
        error: "Can only delete images from Vercel Blob storage" 
      });
    }

    // Delete the image from Vercel Blob
    await del(imageUrl);

    res.status(200).json({
      success: true,
      message: "Image deleted successfully",
      deletedUrl: imageUrl
    });

  } catch (error) {
    console.error('Error deleting image:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: "Image not found or already deleted" 
        });
      }
    }

    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
