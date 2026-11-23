const developmentRoutes = [
  // These endpoints still read or operate on test integrations. Their UI routes are shared.
  "/api/integrations/sandbox", "/api/lookup",
  "/api/admin/operational-accounts",
  "/api/admin/balance-positions",
];

export function isDevelopmentRoute(pathname: string, method: string) {
  if (/^\/api\/admin\/pix-charges\/[^/]+\/qr-code$/.test(pathname)) return true;
  if (pathname.startsWith("/api/payments/pix/") && /\/(simulate|reconcile)$/.test(pathname)) return true;
  if (pathname.startsWith("/api/payments/") &&
      !/^\/api\/payments\/(pix|pix-withdrawals)(\/|$)/.test(pathname)) return true;
  const poolAccountsApi = "/api/admin/pool-accounts";
  if (method === "POST" && (pathname === poolAccountsApi || pathname.startsWith(poolAccountsApi + "/"))) {
    return true;
  }
  return developmentRoutes.some((path) => pathname === path || pathname.startsWith(path + "/"));
}
