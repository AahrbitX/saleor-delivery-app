// import { SaleorAsyncWebhook } from "@saleor/app-sdk/handlers/next";
// import {
//   OrderCreatedDocument,
//   OrderCreatedSubscription,
//   PaymentChargeStatusEnum,
// } from "../../../../generated/graphql";
// import { delhiveryClient, DelhiveryShipmentPayload } from "../../../lib/delhivery/client";
// import { saleorApp } from "../../../saleor-app";

// // ── Types ──────────────────────────────────────────────────────────────────
// type OrderPayload = {
//   event?: {
//     order?: {
//       id: string;
//       number: string;
//       created: string;
//       status: string;
//       paymentStatus: PaymentChargeStatusEnum;
//       shippingAddress?: {
//         firstName: string;
//         lastName: string;
//         streetAddress1: string;
//         streetAddress2?: string | null;
//         city: string;
//         countryArea: string;
//         postalCode: string;
//         phone?: string | null;
//         country: { country: string; code: string };
//       } | null;
//       total: {
//         gross: { amount: number; currency: string };
//       };
//       lines: Array<{
//         productName: string;
//         quantity: number;
//         variant?: {
//           sku?: string | null;
//           weight?: { value: number; unit: string } | null;
//         } | null;
//       }>;
//     } | null;
//   } | null;
// };

// // ── Webhook Definition ─────────────────────────────────────────────────────
// export const orderCreatedWebhook = new SaleorAsyncWebhook<OrderCreatedSubscription>({
//   name: "Order Created",
//   webhookPath: "api/webhooks/order-created",
//   event: "ORDER_CREATED",
//   apl: saleorApp.apl,
//   query: OrderCreatedDocument,
// });

// // ── Handler ────────────────────────────────────────────────────────────────
// export default orderCreatedWebhook.createHandler(async (req, res, ctx) => {
//   const payload = ctx.payload as unknown as OrderPayload;
//   const order = payload?.event?.order;
//   console.log("=== RAW PAYLOAD ===");
//   console.log(JSON.stringify(ctx.payload, null, 2));
//   console.log("=== PAYLOAD KEYS ===");
//   console.log(Object.keys(ctx.payload || {}));
//   console.log("=== ORDER WEBHOOK RECEIVED ===");
//   console.log("Order:", JSON.stringify(order, null, 2));

//   if (!order) {
//     return res.status(400).json({ error: "No order in payload" });
//   }

//   const shippingAddress = order.shippingAddress;
//   if (!shippingAddress) {
//     return res.status(400).json({ error: "No shipping address" });
//   }

//   try {
//     // 1. Check pincode serviceability
//     const pin = shippingAddress.postalCode;
//     console.log("Checking serviceability for pin:", pin);

//     const serviceability = await delhiveryClient.checkPincode(pin);
//     console.log("Serviceability:", JSON.stringify(serviceability, null, 2));

//     if (!serviceability?.success || !serviceability?.data?.length) {
//       console.error(`Pincode ${pin} not serviceable`);
//       return res.status(200).json({ message: "Pincode not serviceable" });
//     }

//     // 2. Fetch waybill
//     const waybills = await delhiveryClient.fetchWaybill(1);
//     const waybill = waybills[0];
//     console.log("Waybill:", waybill);

//     if (!waybill) {
//       return res.status(500).json({ error: "Failed to fetch waybill" });
//     }

//     // 3. Calculate weight
//     const totalWeight = order.lines.reduce((acc: number, line) => {
//       const w = line.variant?.weight?.value ?? 500;
//       const wKg = line.variant?.weight?.unit === "g" ? w / 1000 : w;
//       return acc + wKg * line.quantity;
//     }, 0);

//     // 4. Build payload
//     const totalAmount = order.total.gross.amount.toString();
//     const paymentMode = (
//       order.paymentStatus === PaymentChargeStatusEnum.NotCharged ? "COD" : "Prepaid"
//     ) as "COD" | "Prepaid";

//     const shipmentPayload: DelhiveryShipmentPayload = {
//       shipments: [
//         {
//           name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
//           add: `${shippingAddress.streetAddress1} ${shippingAddress.streetAddress2 || ""}`.trim(),
//           pin: shippingAddress.postalCode,
//           city: shippingAddress.city,
//           state: shippingAddress.countryArea,
//           country: shippingAddress.country.country,
//           phone: shippingAddress.phone || "",
//           order: order.id,
//           payment_mode: paymentMode,
//           return_pin: process.env.DELHIVERY_WAREHOUSE_PIN!,
//           return_city: process.env.DELHIVERY_WAREHOUSE_CITY!,
//           return_phone: process.env.DELHIVERY_WAREHOUSE_PHONE!,
//           return_add: process.env.DELHIVERY_WAREHOUSE_ADDRESS!,
//           return_state: process.env.DELHIVERY_WAREHOUSE_STATE!,
//           return_country: "India",
//           products_desc: order.lines.map((l) => l.productName).join(", "),
//           hsn_code: "",
//           cod_amount: paymentMode === "COD" ? totalAmount : "0",
//           order_date: new Date(order.created).toISOString().split("T")[0],
//           total_amount: totalAmount,
//           seller_add: process.env.DELHIVERY_WAREHOUSE_ADDRESS!,
//           seller_name: process.env.DELHIVERY_WAREHOUSE_NAME!,
//           seller_inv: order.number?.toString() || order.id,
//           quantity: order.lines.reduce((a: number, l) => a + l.quantity, 0).toString(),
//           waybill,
//           shipment_width: "10",
//           shipment_height: "10",
//           weight: totalWeight.toFixed(2),
//           shipment_length: "10",
//           seller_gst_tin: "",
//           shipping_mode: "Surface",
//           address_type: "home",
//         },
//       ],
//     };

//     // 5. Create shipment
//     const result = await delhiveryClient.createShipment(shipmentPayload);
//     console.log("Delhivery shipment created:", JSON.stringify(result, null, 2));

//     return res.status(200).json({ success: true, waybill, delhiveryResponse: result });

//   } catch (err) {
//     console.error("Delhivery shipment creation failed:", err);
//     return res.status(500).json({ error: "Shipment creation failed" });
//   }
// });

// export const config = {
//   api: { bodyParser: false },
// };
import { SaleorAsyncWebhook } from "@saleor/app-sdk/handlers/next";
import {
  OrderCreatedDocument,
  OrderCreatedSubscription,
  PaymentChargeStatusEnum,
} from "../../../../generated/graphql";
import { delhiveryClient, DelhiveryShipmentPayload } from "../../../lib/delhivery/client";
import { saleorApp } from "../../../saleor-app";

// ── Types ──────────────────────────────────────────────────────────────────
type OrderLine = {
  productName: string;
  quantity: number;
  variant?: {
    sku?: string | null;
    weight?: { value: number; unit: string } | null;
  } | null;
};

type Order = {
  id: string;
  number: string;
  created: string;
  status: string;
  paymentStatus: PaymentChargeStatusEnum;
  shippingAddress?: {
    firstName: string;
    lastName: string;
    streetAddress1: string;
    streetAddress2?: string | null;
    city: string;
    countryArea: string;
    postalCode: string;
    phone?: string | null;
    country: { country: string; code: string };
  } | null;
  total: {
    gross: { amount: number; currency: string };
  };
  lines: OrderLine[];
};

// ✅ Saleor sends { order: {...} } directly — no event wrapper
type OrderPayload = {
  order?: Order | null;
};

// ── Webhook Definition ─────────────────────────────────────────────────────
export const orderCreatedWebhook = new SaleorAsyncWebhook<OrderCreatedSubscription>({
  name: "Order Created",
  webhookPath: "api/webhooks/order-created",
  event: "ORDER_CREATED",
  apl: saleorApp.apl,
  query: OrderCreatedDocument,
});

// ── Handler ────────────────────────────────────────────────────────────────
export default orderCreatedWebhook.createHandler(async (req, res, ctx) => {
  // ✅ Fixed: payload is { order: {...} } not { event: { order: {...} } }
  const payload = ctx.payload as unknown as OrderPayload;
  const order = payload?.order;

  console.log("=== ORDER WEBHOOK RECEIVED ===");
  console.log("Order ID:", order?.id);
  console.log("Order Number:", order?.number);
  console.log("Payment Status:", order?.paymentStatus);

  if (!order) {
    return res.status(400).json({ error: "No order in payload" });
  }

  const shippingAddress = order.shippingAddress;
  if (!shippingAddress) {
    return res.status(400).json({ error: "No shipping address" });
  }

  try {
    // 1. Check pincode serviceability
    const pin = shippingAddress.postalCode;
    console.log("Checking serviceability for pin:", pin);

    const serviceability = await delhiveryClient.checkPincode(pin);
    console.log("Serviceable:", serviceability?.success);

    if (!serviceability?.success || !serviceability?.data?.length) {
      console.error(`Pincode ${pin} not serviceable`);
      return res.status(200).json({ message: "Pincode not serviceable" });
    }

    // 2. Fetch waybill
    const waybills = await delhiveryClient.fetchWaybill(1);
    const waybill = waybills[0];
    console.log("Waybill:", waybill);

    if (!waybill) {
      return res.status(500).json({ error: "Failed to fetch waybill" });
    }

    // 3. Calculate weight
    const totalWeight = order.lines.reduce((acc: number, line: OrderLine) => {
      const w = line.variant?.weight?.value ?? 500;
      const wKg = line.variant?.weight?.unit === "KG" ? w : w / 1000;
      return acc + wKg * line.quantity;
    }, 0);

    // 4. Build shipment payload
    const totalAmount = order.total.gross.amount.toString();
    const paymentMode = (
      order.paymentStatus === PaymentChargeStatusEnum.NotCharged ? "COD" : "Prepaid"
    ) as "COD" | "Prepaid";

    const shipmentPayload: DelhiveryShipmentPayload = {
      shipments: [
        {
          name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
          add: `${shippingAddress.streetAddress1} ${shippingAddress.streetAddress2 || ""}`.trim(),
          pin: shippingAddress.postalCode,
          city: shippingAddress.city,
          state: shippingAddress.countryArea,
          country: shippingAddress.country.country,
          phone: shippingAddress.phone || "",
          order: order.number.toString(),
          payment_mode: paymentMode,
          return_pin: process.env.DELHIVERY_WAREHOUSE_PIN!,
          return_city: process.env.DELHIVERY_WAREHOUSE_CITY!,
          return_phone: process.env.DELHIVERY_WAREHOUSE_PHONE!,
          return_add: process.env.DELHIVERY_WAREHOUSE_ADDRESS!,
          return_state: process.env.DELHIVERY_WAREHOUSE_STATE!,
          return_country: "India",
          products_desc: order.lines.map((l: OrderLine) => l.productName).join(", "),
          hsn_code: "",
          cod_amount: paymentMode === "COD" ? totalAmount : "0",
          order_date: new Date(order.created).toISOString().split("T")[0],
          total_amount: totalAmount,
          seller_add: process.env.DELHIVERY_WAREHOUSE_ADDRESS!,
          seller_name: process.env.DELHIVERY_WAREHOUSE_NAME!,
          seller_inv: order.number?.toString() || order.id,
          quantity: order.lines
            .reduce((a: number, l: OrderLine) => a + l.quantity, 0)
            .toString(),
          waybill,
          shipment_width: "10",
          shipment_height: "10",
          weight: totalWeight > 0 ? totalWeight.toFixed(2) : "0.50",
          shipment_length: "10",
          seller_gst_tin: "",
          shipping_mode: "Surface",
          address_type: "home",
        },
      ],
    };

    // 5. Create shipment
    const result = await delhiveryClient.createShipment(shipmentPayload);
    console.log("Delhivery shipment created:", JSON.stringify(result, null, 2));

    return res.status(200).json({ success: true, waybill, delhiveryResponse: result });

  } catch (err) {
    console.error("Delhivery shipment creation failed:", err);
    return res.status(500).json({ error: "Shipment creation failed" });
  }
});

export const config = {
  api: { bodyParser: false },
};