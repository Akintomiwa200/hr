import { NextRequest, NextResponse } from "next/server";
import { handleZohoWebhook } from "@/lib/integrations/sync";
import { getIntegration } from "@/lib/integrations/store";
import type { IntegrationProvider } from "@/lib/integrations/types";

const PRODUCT_MAP = {
  people: "ZOHO_PEOPLE",
  recruit: "ZOHO_RECRUIT",
  books: "ZOHO_BOOKS",
  sign: "ZOHO_SIGN",
  mail: "ZOHO_MAIL",
} as const;

type ZohoProduct = keyof typeof PRODUCT_MAP;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ product: string }> }
) {
  const { product } = await params;
  if (!(product in PRODUCT_MAP)) {
    return NextResponse.json({ error: "Unknown product" }, { status: 404 });
  }

  const provider = PRODUCT_MAP[product as ZohoProduct] as IntegrationProvider;
  const integration = await getIntegration(provider, null);
  const signature = request.headers.get("x-zoho-webhook-signature");

  if (integration?.webhookSecret && signature !== integration.webhookSecret) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  const result = await handleZohoWebhook(
    product as ZohoProduct,
    payload,
    integration?.companyId ?? null
  );

  return NextResponse.json(result);
}
