import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  expenseCategoryFilterSchema,
  expenseCategoryUpdateSchema,
  expenseItemsSchema,
  expensePeriodSchema,
  expenseReferencePattern,
  expenseSummarySchema,
  expensesUnavailable,
} from "@/features/expenses/expenses";
import { requestBackend } from "@/lib/server/auth-backend";
import { pixResponse, validatePixPostOrigin as validateSameOrigin } from "@/lib/server/pix-payments";
import { readJson, RequestBodyError } from "@/lib/server/request-json";
import { accessCookie } from "@/lib/server/session";

type RouteContext = { params: Promise<{ segment?: string[] }> };

const reportFilters = z.strictObject({
  period: expensePeriodSchema.optional(),
});
const itemFilters = reportFilters.extend({
  category: expenseCategoryFilterSchema.optional(),
  page: z.string().regex(/^[1-9]\d{0,8}$/).optional(),
});
const messages: Record<number, string> = {
  400: "Confira os dados informados.",
  401: "Sua sessão expirou. Entre novamente.",
  403: "O controle financeiro requer uma conta de lojista ativa com autenticação em dois fatores.",
  404: "Saída Pix não encontrada.",
  429: "Aguarde um instante e tente novamente.",
};

async function relay(
  request: NextRequest,
  path: `/dashboard/expenses${string}`,
  schema: z.ZodType<object>,
  options: { searchParams?: URLSearchParams; body?: z.infer<typeof expenseCategoryUpdateSchema> },
) {
  const accessToken = request.cookies.get(accessCookie)?.value;
  if (!accessToken) return pixResponse({ message: messages[401] }, 401);
  try {
    const response = await requestBackend(path, {
      ...options, accessToken, signal: request.signal, method: options.body ? "PATCH" : "GET",
    });
    if (response.ok) {
      const data = schema.safeParse(await response.json());
      if (data.success) return pixResponse(data.data);
    } else {
      const message = messages[response.status];
      if (message) return pixResponse({ message }, response.status);
    }
  } catch {
    // The app can retry reads and repeat classification with the same category.
  }
  return pixResponse({ message: expensesUnavailable }, 503);
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const segment = (await params).segment ?? [];
  const items = segment.length === 1 && segment[0] === "items";
  if (segment.length && !items) return pixResponse({ message: messages[404] }, 404);
  const searchParams = request.nextUrl.searchParams;
  const filters = (items ? itemFilters : reportFilters).safeParse(Object.fromEntries(searchParams));
  if (!filters.success) return pixResponse({ message: messages[400] }, 400);
  const validatedParams = new URLSearchParams();
  for (const [key, value] of Object.entries(filters.data)) {
    if (typeof value === "string") validatedParams.set(key, value);
  }
  return relay(request, items ? "/dashboard/expenses/items" : "/dashboard/expenses",
    items ? expenseItemsSchema : expenseSummarySchema, { searchParams: validatedParams });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const segment = (await params).segment;
  if (segment?.length !== 2 || segment[0] !== "items" || !expenseReferencePattern.test(segment[1])) {
    return pixResponse({ message: messages[404] }, 404);
  }
  const invalidOrigin = validateSameOrigin(request, expensesUnavailable);
  if (invalidOrigin) return invalidOrigin;
  try {
    const parsed = expenseCategoryUpdateSchema.safeParse(await readJson(request, 1024));
    if (!parsed.success) return pixResponse({ message: messages[400] }, 400);
    return relay(request, `/dashboard/expenses/items/${segment[1]}`, expenseCategoryUpdateSchema, { body: parsed.data });
  } catch (error) {
    if (error instanceof RequestBodyError) return pixResponse({ message: error.message }, error.status);
    return pixResponse({ message: messages[400] }, 400);
  }
}
