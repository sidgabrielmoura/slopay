import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MerchantPanel, PanelHeading } from "@/components/layout/merchant-panel";
import { merchantNavigation } from "@/components/layout/panel-navigation";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { developmentFeaturesEnabled } from "@/config/development";
import { panelSections } from "@/components/layout/panel-sections";
import { Button } from "@/components/ui/button";
import { ToastNotice } from "@/components/ui/toast-notice";
import { PreferencesScreen } from "@/features/preferences/components/preferences-screen";
import { LiveTransactionDetail } from "@/features/transactions/components/live-transaction-detail";
import { LiveTransactionsScreen } from "@/features/transactions/components/live-transactions-screen";
import { transactionReferencePattern, transactionSearchLimit } from "@/features/transactions/live-transactions";
import { transactionTabs, type TransactionTab } from "@/features/transactions/transaction-presentation";
import { formatDateTime } from "@/lib/dates";
import { loadDashboardOperation, loadDashboardTransaction } from "@/lib/server/dashboard";
import { requireSession } from "@/lib/server/session";

export default async function PanelPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string[] }>;
  searchParams: Promise<{ referencia?: string | string[]; origem?: string | string[] }>;
}) {
  const { section } = await params;
  const returnTo = "/" + section.map(encodeURIComponent).join("/");
  const page = Object.hasOwn(panelSections, returnTo) ? panelSections[returnTo] : undefined;
  const tab = (Object.keys(transactionTabs) as TransactionTab[]).find((key) => transactionTabs[key].path === returnTo);
  const reference = !tab && section[0] === "movimentacoes" && section.length === 2 && transactionReferencePattern.test(section[1])
    ? section[1]
    : undefined;
  if (!page && !tab && !reference) notFound();

  const user = await requireSession(returnTo, { operations: true });
  if (user.role === "ADMIN") redirect("/admin");
  const merchant = user.role === "MERCHANT";
  const panelNavigation = merchantNavigation(!merchant);
  const hasAccess = merchant || Boolean(user.merchantId);

  if (tab) {
    const { referencia } = await searchParams;
    const initialSearch = typeof referencia === "string" ? referencia.slice(0, transactionSearchLimit) : "";
    return (
      <MerchantPanel user={user}>
        {hasAccess ? (
          <LiveTransactionsScreen
            key={user.id + ":" + tab + ":" + initialSearch}
            merchantId={user.id}
            initialTab={tab}
            initialSearch={initialSearch}
            owner={merchant}
          />
        ) : (
          <PanelHeading title="Movimentações Pix" description="A conta vinculada está indisponível para consulta." />
        )}
      </MerchantPanel>
    );
  }

  if (reference) {
    if (!hasAccess) notFound();
    const { origem } = await searchParams;
    const backTo = typeof origem === "string" && Object.hasOwn(transactionTabs, origem)
      ? transactionTabs[origem as TransactionTab].path
      : transactionTabs.ALL.path;
    const result = await loadDashboardTransaction(reference);
    if (result.state === "ready") {
      return <MerchantPanel user={user}><LiveTransactionDetail data={result.data} backTo={backTo} share={merchant} /></MerchantPanel>;
    }

    let sample: Awaited<ReturnType<typeof loadDashboardOperation>> | null = null;
    if (result.state === "absent") {
      if (!merchant || !developmentFeaturesEnabled()) notFound();
      if (reference.startsWith("saque-") || reference.length > 48) notFound();
      sample = await loadDashboardOperation(reference);
      if (sample.state === "absent" || (sample.state === "ready" && sample.data.operation.status !== "SAMPLE")) notFound();
    }
    const operation = sample?.state === "ready" ? sample.data.operation : null;

    return (
      <MerchantPanel user={user}>
        <PanelHeading title="Detalhes da movimentação" />
        {operation ? (
          <div className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">{operation.description}</h2>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Referência</dt>
                <dd>{operation.reference}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd>Demonstração</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Valor</dt>
                <dd className="tabular-nums"><PanelAmount cents={operation.amountInCents} /></dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Criada em</dt>
                <dd><time dateTime={operation.createdAt}>{formatDateTime(operation.createdAt)}</time></dd>
              </div>
            </dl>
          </div>
        ) : (
          <ToastNotice message="A consulta está temporariamente indisponível. Recarregue a página." persistent />
        )}
        <Button asChild variant="outline"><Link href={backTo} prefetch={false}>Voltar às movimentações</Link></Button>
      </MerchantPanel>
    );
  }

  if (!page) notFound();
  return (
    <MerchantPanel user={user}>
      {returnTo === "/preferencias" ? (
        <PreferencesScreen />
      ) : (
        <>
          <PanelHeading title={page.title} description={page.description} />
          {page.links && (
            <nav aria-label={page.title} className="flex flex-wrap gap-2">
              {page.links.map((link) => (
                <Button key={link.path} asChild variant="outline">
                  <Link href={link.path} prefetch={false}>{link.title}</Link>
                </Button>
              ))}
            </nav>
          )}
          {returnTo === "/mais" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {panelNavigation.map((group) => (
                <section key={group.label} className="rounded-xl border border-border bg-card p-5">
                  <h2 className="mb-3 text-base font-semibold">{group.label}</h2>
                  <ul className="space-y-1">
                    {group.items.map((item) => (
                      <li key={item.path}>
                        <Link href={item.path} prefetch={false} className="flex min-h-11 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent">
                          <item.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </MerchantPanel>
  );
}
