import type { NextApiRequest, NextApiResponse } from 'next';

// Simple health check endpoint for connectivity testing
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow HEAD and GET requests
  if (req.method !== 'HEAD' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return a simple OK response
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    online: true 
  });
}
