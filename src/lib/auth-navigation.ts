const privateSegments = new Set([
  "inicio", "admin", "pix", "movimentacoes", "aprovacoes",
  "integracoes", "conta", "conta-em-validacao", "indicadores",
  "preferencias", "mais", "ajuda",
]);

export function safeReturnTo(raw: string | null | undefined, fallback = "/inicio"): string {
  if (!raw || raw.length > 2048 || !raw.startsWith("/") || raw.startsWith("//") ||
      /[\\\u0000-\u0020\u007f]/.test(raw)) {
    return fallback;
  }

  const base = "https://slopay.invalid";
  const destination = new URL(raw, base);
  const section = destination.pathname.split("/")[1];
  if (destination.origin !== base || !privateSegments.has(section)) {
    return fallback;
  }

  return destination.pathname + destination.search;
}

export function authEntry(path: "/entrar" | "/renovar", returnTo: string): string {
  const params = new URLSearchParams({ returnTo: safeReturnTo(returnTo) });
  return `${path}?${params}`;
}
