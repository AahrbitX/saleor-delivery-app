import type { NextApiRequest, NextApiResponse } from "next";
import { delhiveryClient } from "@/lib/delhivery/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { waybill } = req.query;
  if (!waybill || typeof waybill !== "string") {
    return res.status(400).json({ error: "waybill query param required" });
  }

  try {
    const result = await delhiveryClient.trackShipment(waybill);
    const shipment = result.ShipmentData?.[0]?.Shipment;

    if (!shipment) {
      return res.status(404).json({ error: "Shipment not found" });
    }

    return res.status(200).json({
      status: shipment.Status.Status,
      statusTime: shipment.Status.StatusDateTime,
      location: shipment.Status.StatusLocation,
      instructions: shipment.Status.Instructions,
      awb: shipment.AWB,
      origin: shipment.Origin,
      destination: shipment.Destination,
      pickupDate: shipment.PickUpDate,
    });
  } catch (err) {
    console.error("Tracking error:", err);
    return res.status(500).json({ error: "Failed to fetch tracking info" });
  }
}