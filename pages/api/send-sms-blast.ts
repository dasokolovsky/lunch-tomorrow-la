import type { NextApiRequest, NextApiResponse } from "next";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const fromNumber = process.env.TWILIO_FROM_NUMBER!; // or Messaging Service SID

const client = twilio(accountSid, authToken);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const { phones, message } = req.body;
  if (!Array.isArray(phones) || !message) {
    res.status(400).json({ error: "Missing phones or message" });
    return;
  }
  try {
    // Send SMS to each phone
    const results = await Promise.all(
      phones.map((to: string) =>
        client.messages.create({
          to,
          from: fromNumber,
          body: message
        })
      )
    );
    res.status(200).json({ success: true, count: results.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to send SMS" });
  }
}