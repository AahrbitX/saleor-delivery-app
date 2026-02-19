import { SaleorAsyncWebhook } from "@saleor/app-sdk/handlers/next";
import { saleorApp } from "../../../saleor-app";
import { delhiveryClient, DelhiveryShipmentPayload } from "../../../lib/delhivery/client";
import {
  OrderCreatedSubscription,
  OrderCreatedDocument,
  OrderStatus,
  PaymentChargeStatusEnum,
} from "../../../../generated/graphql";

// Extract the exact order type from the generated subscription
type OrderCreatedOrder = {
  readonly id: string;
  readonly number: string;
  readonly created: string;
  readonly status: OrderStatus;
  readonly paymentStatus: PaymentChargeStatusEnum;
  readonly shippingAddress?: {
    readonly firstName: string;
    readonly lastName: string;
    readonly streetAddress1: string;
    readonly streetAddress2?: string | null;
    readonly city: string;
    readonly countryArea: string;
    readonly postalCode: string;
    readonly phone?: string | null;
    readonly country: { readonly country: string; readonly code: string };
  } | null;
  readonly total: {
    readonly gross: { readonly amount: number; readonly currency: string };
  };
  readonly lines: ReadonlyArray<{
    readonly productName: string;
    readonly quantity: number;
    readonly variant?: {
      readonly sku?: string | null;
      readonly weight?: { readonly value: number; readonly unit: string } | null;
    } | null;
  }>;
};

type SafePayload = {
  event?: {
    order?: OrderCreatedOrder | null;
  } | null;
};

export const orderCreatedWebhook = new SaleorAsyncWebhook<OrderCreatedSubscription>({
  name: "Order Created",
  webhookPath: "api/webhooks/order-created",
  event: "ORDER_CREATED",
  apl: saleorApp.apl,
  query: OrderCreatedDocument,
});

export default orderCreatedWebhook.createHandler(async (req, res, ctx) => {
  // Cast through unknown to bypass the {} union problem
  const payload = ctx.payload as unknown as SafePayload;
  const order = payload?.event?.order;

  if (!order) {
    return res.status(400).json({ error: "No order in payload" });
  }

  const shippingAddress = order.shippingAddress;
  if (!shippingAddress) {
    return res.status(400).json({ error: "No shipping address" });
  }

  try {
    // 1. Validate pincode serviceability
    const pin = shippingAddress.postalCode;
    const serviceability = await delhiveryClient.checkPincode(pin);
    if (!serviceability?.length || serviceability[0]?.pre_paid !== "Y") {
      console.error(`Pincode ${pin} not serviceable by Delhivery`);
      return res.status(200).json({ message: "Pincode not serviceable" });
    }

    // 2. Fetch waybill
    const waybills = await delhiveryClient.fetchWaybill(1);
    const waybill = waybills[0];

    // 3. Calculate total weight — line is now typed via OrderCreatedOrder
    const totalWeight = order.lines.reduce((acc: number, line) => {
      const w = line.variant?.weight?.value ?? 500;
      const wKg = line.variant?.weight?.unit === "g" ? w / 1000 : w;
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
          order: order.id,
          payment_mode: paymentMode,
          return_pin: process.env.DELHIVERY_WAREHOUSE_PIN!,
          return_city: process.env.DELHIVERY_WAREHOUSE_CITY!,
          return_phone: process.env.DELHIVERY_WAREHOUSE_PHONE!,
          return_add: process.env.DELHIVERY_WAREHOUSE_ADDRESS!,
          return_state: process.env.DELHIVERY_WAREHOUSE_STATE!,
          return_country: "India",
          products_desc: order.lines.map((l) => l.productName).join(", "),
          hsn_code: "",
          cod_amount: paymentMode === "COD" ? totalAmount : "0",
          order_date: new Date(order.created).toISOString().split("T")[0],
          total_amount: totalAmount,
          seller_add: process.env.DELHIVERY_WAREHOUSE_ADDRESS!,
          seller_name: process.env.DELHIVERY_WAREHOUSE_NAME!,
          seller_inv: order.number?.toString() || order.id,
          quantity: order.lines
            .reduce((a: number, l) => a + l.quantity, 0)
            .toString(),
          waybill,
          shipment_width: "10",
          shipment_height: "10",
          weight: totalWeight.toFixed(2),
          shipment_length: "10",
          seller_gst_tin: "",
          shipping_mode: "Surface",
          address_type: "home",
        },
      ],
    };

    // 5. Create shipment in Delhivery
    const result = await delhiveryClient.createShipment(shipmentPayload);
    console.log("Delhivery shipment created:", result);

    return res.status(200).json({
      success: true,
      waybill,
      delhiveryResponse: result,
    });
  } catch (err) {
    console.error("Delhivery shipment creation failed:", err);
    return res.status(500).json({ error: "Shipment creation failed" });
  }
});

export const config = {
  api: { bodyParser: false },
};