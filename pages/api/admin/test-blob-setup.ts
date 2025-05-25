import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const results: any = {
      environment_check: {},
      blob_availability: {},
      recommendations: []
    };

    // Check environment variables
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    
    results.environment_check = {
      blob_token_configured: !!blobToken,
      blob_token_length: blobToken ? blobToken.length : 0,
      node_env: process.env.NODE_ENV
    };

    // Check if we can import Vercel Blob
    try {
      const { put } = await import('@vercel/blob');
      results.blob_availability = {
        package_available: true,
        put_function_available: typeof put === 'function'
      };
    } catch (importError) {
      results.blob_availability = {
        package_available: false,
        error: importError instanceof Error ? importError.message : String(importError)
      };
    }

    // Provide recommendations
    if (!blobToken) {
      results.recommendations.push("Set up BLOB_READ_WRITE_TOKEN environment variable");
      results.recommendations.push("Enable Vercel Blob storage in your Vercel project settings");
    }

    if (!results.blob_availability.package_available) {
      results.recommendations.push("Install @vercel/blob package: npm install @vercel/blob");
    }

    results.ready_for_upload = blobToken && results.blob_availability.package_available;

    res.status(200).json(results);

  } catch (error) {
    console.error('Error testing blob setup:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
