import type { NextApiRequest, NextApiResponse } from "next";
import { delhiveryClient } from "../../../lib/delhivery/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const pin = req.query.pin as string;

  if (!pin) {
    return res.status(400).json({ error: "Pin code is required" });
  }

  try {
    const data = await delhiveryClient.checkPincode(pin);
    return res.status(200).json(data);
  } catch (err: any) {
    console.error("Serviceability check failed:", err?.response?.data || err.message);
    return res.status(500).json({ error: "Serviceability check failed" });
  }
}