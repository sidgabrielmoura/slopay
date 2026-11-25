"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, Pencil, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToastNotice } from "@/components/ui/toast-notice";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { formatBrazilianInput, formatCNPJ } from "@/lib/validators";
import { openingsPath } from "../account-openings";
import { adminCompanies, companiesPath, companiesQueryFrom, companyListParams, companySegments, companySizes, refreshAdminCompanyData, type CompanyDetail } from "../admin-companies";
import { operationalAccountsPath } from "../admin-operational-accounts";
import { retryAdminRead } from "../admin-query";
import { CompanyAudit, CompanyOperations } from "./admin-company-activity";
import { AdminCompanyEdit } from "./admin-company-edit";
import { CompanyAccessDialog } from "./company-change-dialog";
import { CompanySupportAction } from "./company-support-action";
import { AdminClientUserDeleteDialog } from "./admin-client-user-delete-dialog";
import { useAdminAccess } from "./admin-access-provider";
import { AdminPixPricingCard } from "./admin-pix-pricing-card";
import { CompanyAccessBadge, CompanyField, CompanyReadError, CompanyRowsSkeleton } from "./company-display";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";

export function AdminCompanyScreen({ user, companyId, editing }: {
  user: AdminIdentity; companyId: string; editing: boolean;
}) {
  const suffix = companyListParams(companiesQueryFrom(useSearchParams()));
  const detailPath = companiesPath + "/" + companyId;
  const detailHref = detailPath + suffix;
  const listHref = companiesPath + suffix;
  const refresh = useQueryClient();
  const { can } = useAdminAccess();
  const result = useQuery({
    queryKey: ["admin-company", user.id, companyId],
    queryFn: ({ signal }) => adminCompanies.detail(companyId, signal),
    staleTime: 10_000, retry: retryAdminRead, refetchInterval: 30_000,
  });
  const company = result.data;
  const missing = result.error instanceof ApiError && result.error.status === 404;

  function refreshCompany() {
    refreshAdminCompanyData(refresh, user.id);
  }

  return (
    <AdminPanel user={user}>
      <Button asChild variant="ghost" className="-ml-2 h-11 w-fit px-2 text-muted-foreground">
        <Link href={editing ? detailHref : listHref} prefetch={false}>
          <ArrowLeft aria-hidden="true" />{editing ? "Detalhes da empresa" : "Empresas"}
        </Link>
      </Button>
      <ToastNotice message={result.isError && !missing ? result.error.message : null} />
      {result.isPending && <p role="status" className="sr-only">Carregando empresa</p>}
      <SkeletonReveal flow revealed={!result.isPending} skeleton={<CompanyDetailSkeleton />}>
        {company ? editing ? (
          <div className="grid min-w-0 gap-5">
            <header className="grid min-w-0 gap-1">
              <h1 className="text-balance text-2xl font-semibold sm:text-3xl">Editar cadastro</h1>
              <p className="wrap-anywhere text-pretty text-sm text-muted-foreground">{company.tradeName ?? company.legalName} · {company.cnpj ? formatCNPJ(company.cnpj) : "Pessoa física"}</p>
            </header>
            {company.canManage && can("admin.companies.edit") && !company.owner.operationalClosedAt
              ? <AdminCompanyEdit company={company} detailHref={detailHref} onChange={refreshCompany} /> : (
              <Card className="grid justify-items-start gap-3 p-5">
                <p className="text-pretty text-sm text-muted-foreground">A edição está indisponível.</p>
                <Button asChild variant="outline" className="h-11"><Link href={detailHref}>Consultar cadastro</Link></Button>
              </Card>
            )}
          </div>
        ) : (
          <CompanyDetails company={company} adminId={user.id} editHref={detailPath + "/editar" + suffix} onChange={refreshCompany} />
        ) : missing ? (
          <Card className="grid min-h-48 content-center justify-items-center gap-4 p-6 text-center">
            <h1 className="text-balance text-lg font-semibold">Empresa não encontrada</h1>
            <Button asChild variant="outline" className="h-11"><Link href={listHref}>Voltar às empresas</Link></Button>
          </Card>
        ) : result.isError && <CompanyReadError title="Cadastro indisponível" retry={() => void result.refetch()} />}
      </SkeletonReveal>
    </AdminPanel>
  );
}

function CompanyDetailSkeleton() {
  return (
    <div className="grid min-w-0 gap-5">
      <div className="grid gap-2"><Skeleton className="h-8 w-48 animate-none" /><Skeleton className="h-4 w-36 animate-none" /></div>
      <div className="grid gap-5 xl:grid-cols-2"><CompanyRowsSkeleton count={2} /><CompanyRowsSkeleton count={2} /></div>
      <CompanyRowsSkeleton count={2} />
    </div>
  );
}

function CompanyDetails({ company, adminId, editHref, onChange }: {
  company: CompanyDetail; adminId: string; editHref: string; onChange: () => void;
}) {
  const development = useDevelopmentFeatures();
  const router = useRouter();
  const { can } = useAdminAccess();
  const [accessDialog, setAccessDialog] = useState(false);
  const [termination, setTermination] = useState<"close" | "delete">();
  const deleted = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const canEdit = company.canManage && can("admin.companies.edit") && !company.owner.operationalClosedAt;
  const canAudit = can("admin.audit.read");
  const changeAccess = company.canManage && can("admin.companies.access") && !company.owner.operationalClosedAt &&
    (company.owner.status === "ACTIVE" || company.owner.status === "SUSPENDED");
  const hasContact = company.contactName || company.contactRole || company.contactEmail || company.contactPhone;
  const openingHref = openingsPath + "/" + company.ownerId;
  return (
    <div className="grid min-w-0 gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid min-w-0 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 ref={heading} tabIndex={-1} className="min-w-0 wrap-anywhere text-balance text-2xl font-semibold outline-none sm:text-3xl">
              {company.tradeName ?? company.legalName}
            </h1>
            <CompanyAccessBadge status={company.owner.status} />
          </div>
          <p className="text-sm tabular-nums text-muted-foreground">{company.cnpj ? formatCNPJ(company.cnpj) : "Pessoa física"}</p>
        </div>
        {(canEdit || changeAccess || company.canSupport) && (
          <div className="flex flex-wrap gap-2">
            {company.canSupport && <CompanySupportAction companyId={company.id} companyName={company.tradeName ?? company.legalName} />}
            {canEdit && <Button asChild className="h-11">
              <Link href={editHref} prefetch={false}><Pencil aria-hidden="true" />Editar cadastro</Link>
            </Button>}
            {changeAccess && (
              <Button type="button" ref={trigger} variant="outline" className="h-11" onClick={() => setAccessDialog(true)}>
                <ShieldCheck aria-hidden="true" />{company.owner.status === "ACTIVE" ? "Suspender acesso" : "Reativar acesso"}
              </Button>
            )}
          </div>
        )}
      </header>

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader className="p-5 pb-4"><h2 className="text-balance text-lg font-semibold">Dados da empresa</h2></CardHeader>
          <CardContent className="px-5 pb-5">
            <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
              <CompanyField label="Razão social">{company.legalName}</CompanyField>
              <CompanyField label="Criada em"><span className="tabular-nums">{formatDateTime(company.createdAt, "date-only")}</span></CompanyField>
              <CompanyField label="Segmento">{company.segment ? companySegments[company.segment] : "Não informado"}</CompanyField>
              <CompanyField label="Porte">{company.companySize ? companySizes[company.companySize] : "Não informado"}</CompanyField>
              {company.website && <CompanyField label="Site">
                <a href={company.website} target="_blank" rel="noreferrer" className="inline-flex min-h-11 min-w-0 items-center gap-1.5 text-primary hover:underline">
                  <span className="min-w-0 wrap-anywhere">{new URL(company.website).hostname}</span><ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
                </a>
              </CompanyField>}
            </dl>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 p-5 pb-4">
            <h2 className="text-balance text-lg font-semibold">Titular</h2>
            <Button asChild variant="ghost" className="-mr-2 h-11 px-2">
              <Link href={openingHref} prefetch={false}>Ver abertura <ArrowUpRight aria-hidden="true" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
              <CompanyField label="Nome">{company.owner.fullName}</CompanyField>
              <CompanyField label="Acesso ao Slopay"><CompanyAccessBadge status={company.owner.status} /></CompanyField>
              <CompanyField label="E-mail">{company.owner.email}</CompanyField>
              <CompanyField label="Telefone">{formatBrazilianInput("PHONE", company.owner.phone) || "Não informado"}</CompanyField>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              <Badge variant={company.owner.isEmailVerified ? "success" : "warning"}>
                {company.owner.isEmailVerified ? "E-mail verificado" : "E-mail pendente"}
              </Badge>
              <Badge variant={company.owner.twoFactorEnabled ? "success" : "warning"}>
                {company.owner.twoFactorEnabled ? "Autenticador cadastrado" : "Autenticador pendente"}
              </Badge>
            </div>
          </CardContent>
        </Card>
        {hasContact && (
          <Card className="min-w-0 xl:col-span-2">
            <CardHeader className="p-5 pb-4"><h2 className="text-balance text-lg font-semibold">Contato comercial</h2></CardHeader>
            <CardContent className="px-5 pb-5">
              <dl className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <CompanyField label="Nome">{company.contactName ?? "Não informado"}</CompanyField>
                <CompanyField label="Cargo">{company.contactRole ?? "Não informado"}</CompanyField>
                <CompanyField label="E-mail">{company.contactEmail ?? "Não informado"}</CompanyField>
                <CompanyField label="Telefone">{formatBrazilianInput("PHONE", company.contactPhone ?? "") || "Não informado"}</CompanyField>
              </dl>
            </CardContent>
          </Card>
        )}
      </div>

      {!company.owner.operationalClosedAt && can("admin.pricing.company") && <AdminPixPricingCard adminId={adminId} companyId={company.id} />}
      {development ? <Tabs defaultValue="account" className="grid min-w-0 gap-3">
        <TabsList aria-label="Dados operacionais da empresa" className="grid h-auto w-full grid-cols-[1fr_1.35fr_1fr] gap-1 sm:w-fit sm:grid-cols-3">
          <TabsTrigger value="account" className="min-h-11 min-w-0 px-2 text-xs sm:px-4 sm:text-sm">Vínculo</TabsTrigger>
          <TabsTrigger value="operations" className="min-h-11 min-w-0 px-2 text-xs sm:px-4 sm:text-sm">Movimentações</TabsTrigger>
          {canAudit && <TabsTrigger value="audit" className="min-h-11 min-w-0 px-2 text-xs sm:px-4 sm:text-sm">Auditoria</TabsTrigger>}
        </TabsList>
        <TabsContent value="account" className="mt-0 min-w-0"><CompanyConnection company={company} openingHref={openingHref} /></TabsContent>
        <TabsContent value="operations" className="mt-0 min-w-0"><CompanyOperations adminId={adminId} companyId={company.id} /></TabsContent>
        {canAudit && <TabsContent value="audit" className="mt-0 min-w-0"><CompanyAudit adminId={adminId} companyId={company.id} /></TabsContent>}
      </Tabs> : canAudit && <CompanyAudit adminId={adminId} companyId={company.id} />}
      {company.terminationVersion != null && <Card className="grid min-w-0 gap-3 p-5">
        <h2 className="text-balance text-lg font-semibold">Encerramento da empresa</h2>
        <p className="text-pretty text-sm text-muted-foreground">O encerramento bloqueia novas operações. A exclusão exige um cadastro sem vínculos ou movimentações.</p>
        <div className="flex flex-wrap gap-2">
          {!company.owner.operationalClosedAt && <Button type="button" variant="outline" className="h-11" onClick={event => {
            trigger.current = event.currentTarget;
            setTermination("close");
          }}>Encerrar empresa</Button>}
          <Button type="button" variant="ghost" className="h-11 text-destructive" onClick={event => {
            trigger.current = event.currentTarget;
            setTermination("delete");
          }}>Excluir empresa</Button>
        </div>
      </Card>}
      {termination && company.terminationVersion != null && <AdminClientUserDeleteDialog
        target={{ id: company.id, name: company.tradeName ?? company.legalName, email: company.owner.email, version: company.terminationVersion, operation: termination, company: true }}
        onChanged={onChange} onDeleted={() => { if (termination === "delete") deleted.current = true; }}
        onClose={() => {
          setTermination(undefined);
          onChange();
          if (deleted.current) router.replace(companiesPath);
          else (trigger.current?.isConnected ? trigger.current : heading.current)?.focus();
        }} />}
      {accessDialog && <CompanyAccessDialog company={company} onChange={onChange}
        onClose={() => setAccessDialog(false)} restoreFocus={() => (trigger.current ?? heading.current)?.focus()} />}
    </div>
  );
}

function CompanyConnection({ company, openingHref }: { company: CompanyDetail; openingHref: string }) {
  const connection = company.integration;
  return (
    <Card className="min-w-0">
      <CardHeader className="gap-2 p-5 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-balance text-lg font-semibold">Conta Sandbox</h2>
          <Badge variant={connection ? "info" : "secondary"}>{connection ? "Vinculada" : "Sem vínculo"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {connection ? (
          <div className="grid justify-items-start gap-4">
            <dl className="grid w-full min-w-0 gap-4 sm:grid-cols-3">
              <CompanyField label="Vinculada em"><span className="tabular-nums">{formatDateTime(connection.linkedAt, "medium")}</span></CompanyField>
              <CompanyField label="Credencial verificada em"><span className="tabular-nums">{formatDateTime(connection.verifiedAt, "medium")}</span></CompanyField>
              <CompanyField label="Saques via API">{connection.withdrawalsEnabled ? "Habilitados" : "Desabilitados"}</CompanyField>
            </dl>
            {connection.id && <Button asChild variant="outline" className="h-11">
              <Link href={operationalAccountsPath + "/" + connection.id} prefetch={false}>Ver conta operacional <ArrowUpRight aria-hidden="true" /></Link>
            </Button>}
          </div>
        ) : (
          <div className="grid justify-items-start gap-3">
            <p className="text-pretty text-sm text-muted-foreground">Acompanhe o vínculo na abertura de contas.</p>
            <Button asChild variant="outline" className="h-11"><Link href={openingHref}>Abrir cadastro do titular</Link></Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
