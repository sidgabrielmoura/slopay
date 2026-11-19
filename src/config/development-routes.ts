const developmentRoutes = [
  // These endpoints still read or operate on test integrations. Their UI routes are shared.
  "/api/payments", "/api/integrations", "/api/dashboard", "/api/public/receipt", "/api/lookup",
  "/api/admin/approval-rules", "/api/admin/operational-accounts",
  "/api/admin/pix-transactions", "/api/admin/pix-charges", "/api/admin/pix-fees",
  "/api/admin/pix-withdrawal-batches", "/api/admin/withdrawal-approvals",
  "/api/admin/global-statement", "/api/admin/balance-positions", "/api/admin/financial-reports",
  "/api/admin/webhooks",
];

export function isDevelopmentRoute(pathname: string) {
  return developmentRoutes.some((path) => pathname === path || pathname.startsWith(path + "/"));
}
