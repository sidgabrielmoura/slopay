const developmentRoutes = [
  "/pix", "/movimentacoes", "/comprovantes", "/comprovante", "/aprovacoes",
  "/controle-financeiro", "/indicadores", "/conta/taxas-e-limites", "/conta/regras-de-aprovacao",
  "/integracoes",
  "/admin/contas", "/admin/operacoes", "/admin/cobrancas", "/admin/lotes",
  "/admin/aprovacoes-financeiras", "/admin/extrato", "/admin/saldos", "/admin/relatorios",
  "/admin/taxas-e-limites", "/admin/regras-de-aprovacao", "/admin/webhooks",
  "/api/payments", "/api/integrations", "/api/dashboard", "/api/public/receipt", "/api/lookup",
  "/api/admin/dashboard", "/api/admin/approval-rules", "/api/admin/operational-accounts",
  "/api/admin/pix-transactions", "/api/admin/pix-charges", "/api/admin/pix-fees",
  "/api/admin/pix-withdrawal-batches", "/api/admin/withdrawal-approvals",
  "/api/admin/global-statement", "/api/admin/balance-positions", "/api/admin/financial-reports",
  "/api/admin/webhooks",
];

export function isDevelopmentRoute(pathname: string) {
  return developmentRoutes.some((path) => pathname === path || pathname.startsWith(path + "/"));
}
