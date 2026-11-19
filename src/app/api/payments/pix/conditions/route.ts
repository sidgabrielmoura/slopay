import type { NextRequest } from "next/server";
import { pixConditionsSchema } from "@/features/account/pix-conditions";
import { forwardPixRequest } from "@/lib/server/pix-payments";

export function GET(request: NextRequest) {
  return forwardPixRequest(request, "/payments/pix/conditions", pixConditionsSchema);
}
