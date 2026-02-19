import { createManifestHandler } from "@saleor/app-sdk/handlers/next";
import { AppManifest } from "@saleor/app-sdk/types";
import { orderCreatedWebhook } from "./webhooks/order-created";
import packageJson from "../../../package.json";

export default createManifestHandler({
  async manifestFactory({ appBaseUrl }) {
    const iframeBaseUrl = process.env.APP_IFRAME_BASE_URL ?? appBaseUrl;
    const apiBaseURL = process.env.APP_API_BASE_URL ?? appBaseUrl;

    const manifest: AppManifest = {
      name: "Delhivery Shipping App",
      tokenTargetUrl: `${apiBaseURL}/api/register`,
      appUrl: iframeBaseUrl,
      permissions: ["MANAGE_ORDERS"],
      id: "saleor.app.delhivery",
      version: packageJson.version,
      webhooks: [
        orderCreatedWebhook.getWebhookManifest(apiBaseURL),
      ],
      extensions: [],
    };

    return manifest;
  },
});