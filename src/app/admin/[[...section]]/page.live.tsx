import { Suspense } from "react";
import { developmentFeaturesEnabled } from "@/config/development";
import { AdminDashboardLoading, AdminDashboardScreen } from "@/features/admin/components/admin-dashboard-screen";
import { AdminActivityProvider } from "@/features/admin/components/admin-activity-provider";
import { AdminPendingLoading, AdminPendingScreen } from "@/features/admin/components/admin-pending-screen";
import { AdminAccountOpeningsScreen } from "@/features/admin/components/admin-account-openings-screen";
import { AdminAccountOpeningDetail } from "@/features/admin/components/admin-account-opening-detail";
import { AdminCompaniesScreen } from "@/features/admin/components/admin-companies-screen";
import { AdminCompanyScreen } from "@/features/admin/components/admin-company-screen";
import { AdminLiveBalancePositions } from "@/features/admin/components/admin-live-balance-positions";
import { AdminOperationalAccountsScreen } from "@/features/admin/components/admin-operational-accounts-screen";
import { AdminOperationalAccountScreen } from "@/features/admin/components/admin-operational-account-screen";
import { AdminPoolAccountsScreen } from "@/features/admin/components/admin-pool-accounts-screen";
import { AdminPixTransactionsScreen } from "@/features/admin/components/admin-pix-transactions-screen";
import { AdminPixChargesScreen } from "@/features/admin/components/admin-pix-charges-screen";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { LivePanel } from "@/features/auth/components/live-panel";
import { loadAdminDashboard } from "@/lib/server/admin-dashboard";
import { loadAdminPending } from "@/lib/server/admin-pending";
import type { SessionUser } from "@/lib/server/auth-backend";
import { requireSession } from "@/lib/server/session";

export default async function AdminPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section = [] } = await params;
  const returnTo = ["/admin", ...section.map(encodeURIComponent)].join("/");
  const development = developmentFeaturesEnabled();
  const user = await requireSession(returnTo, { admin: true });
  const identity = { id: user.id, fullName: user.fullName, email: user.email };

  if (!section.length) {
    return <AdminActivityProvider accountId={user.id}><Suspense fallback={<AdminDashboardLoading user={identity} />}><Dashboard user={identity} /></Suspense></AdminActivityProvider>;
  }

  if (section.length === 1 && section[0] === "pendencias") {
    return <AdminActivityProvider accountId={user.id}><Suspense fallback={<AdminPendingLoading user={identity} />}><Pending user={identity} /></Suspense></AdminActivityProvider>;
  }

  if (section[0] === "abertura-de-contas") {
    if (section.length === 1) {
      return <AdminActivityProvider accountId={user.id}><AdminAccountOpeningsScreen user={identity} /></AdminActivityProvider>;
    }
    const ownerId = z.uuid().safeParse(section[1]);
    if (section.length !== 2 || !ownerId.success) notFound();
    return <AdminActivityProvider accountId={user.id}><AdminAccountOpeningDetail key={ownerId.data} user={identity} ownerId={ownerId.data.toLowerCase()} /></AdminActivityProvider>;
  }

  if (section[0] === "empresas") {
    if (section.length === 1) {
      return <AdminActivityProvider accountId={user.id}><AdminCompaniesScreen user={identity} /></AdminActivityProvider>;
    }
    const companyId = z.uuid().safeParse(section[1]);
    const editing = section.length === 3 && section[2] === "editar";
    if (!companyId.success || (section.length !== 2 && !editing)) notFound();
    const id = companyId.data.toLowerCase();
    return <AdminActivityProvider accountId={user.id}><AdminCompanyScreen key={`${id}:${editing}`} user={identity} companyId={id} editing={editing} /></AdminActivityProvider>;
  }

  if (section[0] === "contas") {
    if (section.length === 1) {
      return <AdminActivityProvider accountId={user.id}>{development ? <AdminOperationalAccountsScreen user={identity} /> : <AdminLiveBalancePositions user={identity} operationalAccounts />}</AdminActivityProvider>;
    }
    const accountId = z.uuid().safeParse(section[1]);
    if (section.length !== 2 || !accountId.success) notFound();
    const id = accountId.data.toLowerCase();
    return <AdminActivityProvider accountId={user.id}>{development ? <AdminOperationalAccountScreen key={id} user={identity} accountId={id} /> : <AdminLiveBalancePositions key={id} user={identity} operationalAccounts accountId={id} />}</AdminActivityProvider>;
  }

  if (section.length === 1 && section[0] === "contas-bolsao") {
    return <AdminActivityProvider accountId={user.id}><AdminPoolAccountsScreen user={identity} development={development} /></AdminActivityProvider>;
  }

  if (section.length === 1 && section[0] === "operacoes") {
    return <AdminActivityProvider accountId={user.id}><AdminPixTransactionsScreen user={identity} /></AdminActivityProvider>;
  }

  if (section.length === 1 && section[0] === "cobrancas") {
    return <AdminActivityProvider accountId={user.id}><AdminPixChargesScreen user={identity} /></AdminActivityProvider>;
  }

  if (section.length === 2 && section[0] === "equipe") redirect("/admin/equipe");

  if (development && process.env.SLOPAY_SUPERADMIN_PREVIEW === "1") {
    const { AdminPreview } = await import("@/features/admin/components/admin-preview");
    return <AdminActivityProvider accountId={user.id}><AdminPreview section={section} user={{ fullName: user.fullName, email: user.email }} /></AdminActivityProvider>;
  }

  if (!development) notFound();
  return (
    <LivePanel
      title="Administração"
      message="As operações administrativas aguardam a homologação dos serviços do backend."
    />
  );
}

async function Dashboard({ user }: { user: Pick<SessionUser, "id" | "fullName" | "email"> }) {
  const initialReport = await loadAdminDashboard();
  return <AdminDashboardScreen user={user} initialReport={initialReport} />;
}

async function Pending({ user }: { user: Pick<SessionUser, "id" | "fullName" | "email"> }) {
  const initialReport = await loadAdminPending();
  return <AdminPendingScreen user={user} initialReport={initialReport} />;
}
