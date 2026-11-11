import { NextResponse, type NextRequest } from "next/server";
import { cleanDocument, isValidCPF } from "@/lib/validators";

export function GET(request: NextRequest) {
  const cpf = cleanDocument(request.nextUrl.searchParams.get("cpf") || "");
  const headers = { "Cache-Control": "no-store" };
  if (!isValidCPF(cpf)) {
    return NextResponse.json({ error: "CPF inválido." }, { status: 400, headers });
  }
  return NextResponse.json({
    success: true,
    verified: false,
    hasExternalProvider: false,
    cleanCpf: cpf,
  }, { headers });
}
