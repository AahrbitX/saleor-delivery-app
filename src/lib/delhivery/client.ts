import axios from "axios";

export interface DelhiveryShipmentPayload {
  shipments: Array<{
    name: string;
    add: string;
    pin: string;
    city: string;
    state: string;
    country: string;
    phone: string;
    order: string;
    payment_mode: "COD" | "Prepaid";
    return_pin: string;
    return_city: string;
    return_phone: string;
    return_add: string;
    return_state: string;
    return_country: string;
    products_desc: string;
    hsn_code: string;
    cod_amount: string;
    order_date: string;
    total_amount: string;
    seller_add: string;
    seller_name: string;
    seller_inv: string;
    quantity: string;
    waybill: string;
    shipment_width: string;
    shipment_height: string;
    weight: string;
    shipment_length: string;
    seller_gst_tin: string;
    shipping_mode: string;
    address_type: string;
  }>;
}

class DelhiveryClient {
  private baseUrl: string;
  private token: string;
  private clientName: string;

  constructor() {
    this.baseUrl = process.env.DELHIVERY_BASE_URL || "https://staging-express.delhivery.com";
    this.token = process.env.DELHIVERY_API_TOKEN || "";
    this.clientName = process.env.DELHIVERY_CLIENT_NAME || "";
  }

  private get headers() {
    return {
      Authorization: `Token ${this.token}`,
      "Content-Type": "application/json",
    };
  }

async checkPincode(pin: string) {
  console.log("=== DELHIVERY DEBUG ===");
  console.log("Token:", this.token ? `${this.token.substring(0, 8)}...` : "MISSING");
  console.log("BaseURL:", this.baseUrl);
  console.log("Full URL:", `${this.baseUrl}/api/dc/fetch/serviceability/pincode?product_type=Heavy&pincode=${pin}`);
  
  const res = await axios.get(
    `${this.baseUrl}/api/dc/fetch/serviceability/pincode`,
    {
      params: {
        product_type: "Heavy",  // ← changed from Express to Heavy
        pincode: pin,
      },
      headers: {
        Authorization: `Token ${this.token}`,
        Accept: "application/json",
      },
    }
  );
  
  console.log("Response status:", res.status);
  console.log("Response data:", JSON.stringify(res.data, null, 2));
  return res.data;
}
  async fetchWaybill(count: number = 1): Promise<string[]> {
    const res = await axios.get(
      `${this.baseUrl}/waybill/api/bulk/json/?count=${count}&cl=${this.clientName}`,
      { headers: this.headers }
    );
    return res.data?.waybill_list || [];
  }

  async createShipment(payload: DelhiveryShipmentPayload) {
    const formData = new URLSearchParams();
    formData.append("format", "json");
    formData.append(
      "data",
      JSON.stringify({
        shipment_date: new Date().toISOString().split("T")[0],
        pickup_location: { name: this.clientName },
        ...payload,
      })
    );

    const res = await axios.post(
      `${this.baseUrl}/api/cmu/create.json`,
      formData.toString(),
      {
        headers: {
          ...this.headers,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return res.data;
  }

  async trackShipment(waybill: string) {
    const res = await axios.get(
      `${this.baseUrl}/api/v1/packages/json/?waybill=${waybill}`,
      { headers: this.headers }
    );
    return res.data;
  }

  async cancelShipment(waybill: string) {
    const res = await axios.post(
      `${this.baseUrl}/api/p/edit`,
      { waybill, cancellation: true },
      { headers: this.headers }
    );
    return res.data;
  }

  async calculateRate(payload: {
    md: string;
    cgm: number;
    o_pin: string;
    d_pin: string;
    ss: string;
  }) {
    const res = await axios.get(`${this.baseUrl}/api/kinko/v1/invoice/charges/.json`, {
      params: payload,
      headers: this.headers,
    });
    return res.data;
  }
}

export const delhiveryClient = new DelhiveryClient();