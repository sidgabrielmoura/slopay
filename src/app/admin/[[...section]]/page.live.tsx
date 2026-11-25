import { Suspense } from "react";
import { developmentFeaturesEnabled } from "@/config/development";
import { AdminDashboardLoading, AdminDashboardScreen } from "@/features/admin/components/admin-dashboard-screen";
import { AdminActivityProvider } from "@/features/admin/components/admin-activity-provider";
import { AdminPendingLoading, AdminPendingScreen } from "@/features/admin/components/admin-pending-screen";
import { AdminAccountOpeningsScreen } from "@/features/admin/components/admin-account-openings-screen";
import { AdminAccountOpeningDetail } from "@/features/admin/components/admin-account-opening-detail";
import { AdminCompaniesScreen } from "@/features/admin/components/admin-companies-screen";
import { AdminCompanyScreen } from "@/features/admin/components/admin-company-screen";
import { AdminOperationalAccountScreen } from "@/features/admin/components/admin-operational-account-screen";
import { walletsHref } from "@/features/admin/admin-balance-positions";
import { adminPageSearchParams } from "@/features/admin/admin-navigation";
import { pixMovementHref, pixMovementQueryFrom, pixMovementSelection } from "@/features/admin/admin-pix-movements";
import { AdminPixMovementsScreen } from "@/features/admin/components/admin-pix-movements-screen";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { LivePanel } from "@/features/auth/components/live-panel";
import { loadAdminDashboard } from "@/lib/server/admin-dashboard";
import { loadAdminPending } from "@/lib/server/admin-pending";
import type { SessionUser } from "@/lib/server/auth-backend";
import { requireSession } from "@/lib/server/session";

export default async function AdminPage({ params, searchParams }: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section = [] } = await params;
  const filters = adminPageSearchParams(await searchParams);
  const path = ["/admin", ...section.map(encodeURIComponent)].join("/");
  const returnTo = path + (filters.size ? "?" + filters : "");
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
    if (section.length === 1) redirect(walletsHref(development ? "vinculos" : "saldos", filters));
    const accountId = z.uuid().safeParse(section[1]);
    if (section.length !== 2 || !accountId.success) notFound();
    const id = accountId.data.toLowerCase();
    if (!development) {
      filters.set("search", id);
      filters.delete("page");
      filters.delete("status");
      redirect(walletsHref("saldos", filters));
    }
    return <AdminOperationalAccountScreen key={id} user={identity} accountId={id} />;
  }

  if (section.length === 1 && section[0] === "contas-bolsao") {
    redirect(walletsHref(filters.get("aba") === "roteamento" ? "roteamento" : development ? "bolsao" : "saldos", filters));
  }

  if (section.length === 1 && section[0] === "operacoes") {
    return <AdminPixMovementsScreen user={identity} />;
  }

  if (section.length === 1 && section[0] === "cobrancas") {
    filters.set("view", "charges");
    redirect(pixMovementHref(pixMovementQueryFrom(filters), pixMovementSelection(filters)));
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
