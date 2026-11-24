import type { NextRequest } from "next/server";
import { forwardPixPricing } from "@/lib/server/pix-pricing-request";

export function GET(request: NextRequest) {
  return forwardPixPricing(request);
}

export function POST(request: NextRequest) {
  return forwardPixPricing(request);
}
