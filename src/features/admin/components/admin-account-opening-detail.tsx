"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";

import { useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Building2, Check, Circle, Fingerprint, Mail } from "lucide-react";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { ToastNotice } from "@/components/ui/toast-notice";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { formatCentsToBrl } from "@/lib/money";
import { formatBrazilianInput, formatCNPJ } from "@/lib/validators";
import { accountTypeLabels, companyTypes, formatOpeningDate, formatPostalCode } from "@/features/account-validation/account-opening-application";
import {
  accountOpenings, openingHistoryLabels, openingParams, openingQueryFrom, openingsPath,
  type OpeningDetail, type OpeningReview, type OpeningStatus,
} from "../account-openings";
import { retryAdminRead } from "../admin-query";
import { AccountOpeningStatus } from "./account-opening-status";
import { OpeningApprovalDialog, OpeningReviewDialog } from "./account-opening-actions";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";

type Application = OpeningDetail["application"];
type Action = OpeningReview["action"] | "APPROVE";
const actionStates: OpeningStatus[] = ["READY", "UNDER_REVIEW", "RESUBMITTED"];
const nextStep: Record<OpeningStatus, string> = {
  AWAITING_EMAIL: "O titular precisa confirmar o endereço de e-mail.",
  AWAITING_MFA: "O titular precisa cadastrar o autenticador no próprio acesso.",
  AWAITING_APPLICATION: "O titular ainda está preenchendo a solicitação de abertura.",
  READY: "Assuma a análise para habilitar a aprovação.",
  UNDER_REVIEW: "Confira os dados enviados antes de aprovar o cadastro.",
  CHANGES_REQUESTED: "Acompanhe a resposta do titular pelo painel.",
  RESUBMITTED: "O titular atualizou o cadastro. Assuma a nova análise para habilitar a aprovação.",
  APPROVED: "O titular já pode acessar o painel do Slopay.",
  LINKED: "O vínculo Sandbox está registrado. Use o caminho do webhook para configurar as confirmações da conta.",
  REJECTED: "A recusa foi registrada. Reabra a análise se houver novos dados para avaliar.",
  RESTRICTED: "A situação do acesso precisa ser regularizada para seguir com o cadastro.",
  PILOT: "Este titular usa a carteira piloto configurada no ambiente de desenvolvimento.",
};

export function AdminAccountOpeningDetail({ user, ownerId }: { user: AdminIdentity; ownerId: string }) {
  const development = useDevelopmentFeatures();
  const listHref = openingsPath + openingParams(openingQueryFrom(useSearchParams()));
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<Action | null>(null);
  const origin = useRef<HTMLElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const client = useQueryClient();
  const result = useQuery({
    queryKey: ["admin-account-opening-detail", user.id, ownerId, page],
    queryFn: ({ signal }) => accountOpenings.detail(ownerId, page, signal),
    placeholderData: (previous, request) => request?.queryKey[1] === user.id && previous?.application.id === ownerId ? previous : undefined,
    staleTime: 10_000,
    refetchInterval: 30_000,
    retry: retryAdminRead,
  });
  const record = result.data;
  const application = record?.application;
  const analysisAssignedToAdmin = application?.status === "UNDER_REVIEW" && application.analystId === user.id;
  const nextStepStatus = application?.status === "UNDER_REVIEW" && !analysisAssignedToAdmin
    ? "READY"
    : application?.status;

  function update() {
    for (const key of ["admin-account-openings", "admin-account-opening-detail", "admin-pending", "admin-notifications", "admin-dashboard"]) {
      void client.invalidateQueries({ queryKey: [key, user.id] });
    }
  }

  function open(next: Action, target: HTMLElement) {
    origin.current = target;
    setAction(next);
  }

  const handoff = {
    onClose: () => setAction(null),
    onChange: update,
    restoreFocus: () => (origin.current?.isConnected ? origin.current : heading.current)?.focus(),
  };
  const missing = result.error instanceof ApiError && result.error.status === 404;

  return (
    <AdminPanel user={user}>
      <header className="grid min-w-0 gap-3">
        <Button asChild variant="ghost" className="-ml-2 h-11 w-fit px-2 text-muted-foreground">
          <Link href={listHref} prefetch={false}><ArrowLeft aria-hidden="true" />Abertura de contas</Link>
        </Button>
        <div className="grid gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 ref={heading} tabIndex={-1} className="min-w-0 wrap-anywhere text-balance text-2xl font-semibold outline-none sm:text-3xl">
              {application?.ownerName ?? "Detalhes do cadastro"}
            </h1>
            {application ? <AccountOpeningStatus status={application.status} /> : development && <Badge variant="secondary">Sandbox</Badge>}
          </div>
          {application && <p className="wrap-anywhere text-pretty text-sm text-muted-foreground">{application.legalName ?? application.ownerEmail}</p>}
        </div>
      </header>
      <ToastNotice message={result.isError && !missing ? result.error.message : null} />
      {result.isPending && <p role="status" className="sr-only">Carregando detalhes</p>}
      <SkeletonReveal flow revealed={!result.isPending} skeleton={<DetailSkeleton />}>
        {record && application ? (
          <div className="grid min-w-0 gap-5">
            <Card className="min-w-0">
              <CardHeader className="gap-2 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-balance text-lg font-semibold">Próxima etapa</h2>
                  {development && <Badge variant="secondary">Sandbox</Badge>}
                </div>
                <p className="text-pretty text-sm text-muted-foreground">
                  {analysisAssignedToAdmin && !application.submittedAt
                    ? "A aprovação fica disponível após o titular enviar a solicitação de abertura."
                    : nextStep[nextStepStatus ?? application.status]}
                </p>
              </CardHeader>
              <CardContent className="grid gap-4 px-5 pb-5">
                {application.reason && (
                  <div className="grid min-w-0 gap-1 rounded-lg border border-border bg-muted/50 p-4">
                    <span className="text-xs font-medium text-muted-foreground">
                      {application.status === "CHANGES_REQUESTED" || application.status === "RESUBMITTED" ? "Orientação registrada" : "Motivo registrado"}
                    </span>
                    <p className="wrap-anywhere whitespace-pre-wrap text-pretty text-sm">{application.reason}</p>
                  </div>
                )}
                <ApplicationActions application={application} analysisAssignedToAdmin={analysisAssignedToAdmin} open={open} />
              </CardContent>
            </Card>
            <div className="grid min-w-0 items-start gap-5 xl:grid-cols-2">
              <div className="grid min-w-0 gap-5">
                <Card>
                  <CardHeader className="p-5 pb-4">
                    <h2 className="text-balance text-lg font-semibold">Dados do titular</h2>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <dl className="grid gap-4 text-sm sm:grid-cols-2">
                      <Data label="Nome completo">{application.ownerName}</Data>
                      <Data label="CPF"><span className="tabular-nums">•••.•••.•••-{application.cpfSuffix}</span></Data>
                      <Data label="E-mail">{application.ownerEmail}</Data>
                      <Data label="Telefone">{formatBrazilianInput("PHONE", application.ownerPhone) || "—"}</Data>
                      <Data label="Data do cadastro">{formatDateTime(application.createdAt, "medium")}</Data>
                      <Data label="Analista responsável">{application.analystName ?? "Ainda sem responsável"}</Data>
                    </dl>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="p-5 pb-3">
                    <h2 className="text-balance text-lg font-semibold">{development ? "Validações e vínculo" : "Validações"}</h2>
                  </CardHeader>
                  <CardContent className="grid gap-4 px-5 pb-5">
                    <ul className="divide-y divide-border">
                      <CheckItem icon={<Mail />} label="E-mail confirmado" checked={application.emailVerified}
                        description={application.emailVerifiedAt ? formatDateTime(application.emailVerifiedAt, "medium") : undefined} />
                      <CheckItem icon={<Fingerprint />} label="Autenticador cadastrado" checked={application.mfaEnabled} />
                      {development && <CheckItem icon={<Building2 />} label="Conta Sandbox vinculada" checked={application.status === "LINKED"}
                        description={application.linkedAt ? formatDateTime(application.linkedAt, "medium") : application.status === "PILOT" ? "Carteira piloto" : undefined} />}
                    </ul>
                    {application.legalName && (
                      <dl className="grid gap-4 rounded-lg border border-border p-4 text-sm sm:grid-cols-2">
                        <Data label={application.accountType === "PF" ? "Titular" : "Razão social"}>{application.legalName}</Data>
                        {application.cnpj && <Data label="CNPJ">{formatCNPJ(application.cnpj)}</Data>}
                        {development && application.webhookPath && <Data label="Caminho do webhook" className="sm:col-span-2">
                          <code className="wrap-anywhere text-xs">{application.webhookPath}</code>
                        </Data>}
                      </dl>
                    )}
                  </CardContent>
                </Card>
                {application.submittedData && <ApplicationSubmission data={application.submittedData} submittedAt={application.submittedAt} />}
              </div>
              <OpeningHistory history={record.history} busy={result.isPlaceholderData} onPageChange={setPage} />
            </div>
          </div>
        ) : result.isError && (
          <Card className="grid min-h-64 content-center justify-items-center gap-4 p-6 text-center">
            <h2 className="text-balance text-lg font-semibold">{missing ? "Cadastro não encontrado" : "Detalhes indisponíveis"}</h2>
            {missing ? <Button asChild variant="outline" className="h-11"><Link href={listHref}>Voltar aos cadastros</Link></Button>
              : <Button type="button" variant="outline" className="h-11" onClick={() => void result.refetch()}>Tentar novamente</Button>}
          </Card>
        )}
      </SkeletonReveal>

      {application && action === "APPROVE" && <OpeningApprovalDialog application={application} {...handoff} />}
      {application && action && action !== "APPROVE" && <OpeningReviewDialog application={application} action={action} {...handoff} />}
    </AdminPanel>
  );
}

function ApplicationSubmission({ data, submittedAt }: {
  data: NonNullable<Application["submittedData"]>; submittedAt?: string | null;
}) {
  return (
    <Card>
      <CardHeader className="p-5 pb-3">
        <h2 className="text-lg font-semibold">Solicitação de abertura</h2>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <Data label="Tipo de conta">{accountTypeLabels[data.accountType]}</Data>
          <Data label="WhatsApp">{formatBrazilianInput("PHONE", data.whatsapp ?? "") || "—"}</Data>
          {data.birthDate && <Data label="Data de nascimento">{formatOpeningDate(data.birthDate)}</Data>}
          {data.companyType && <Data label="Tipo de empresa">{companyTypes.find((entry) => entry.value === data.companyType)?.label}</Data>}
          {data.representativeRole && <Data label="Vínculo com a empresa">{data.representativeRole}</Data>}
          <Data label="Atividade">{data.activity}</Data>
          {data.incomeInCents !== undefined && (
            <Data label={data.accountType === "PJ" ? "Faturamento mensal" : "Renda mensal"}>{formatCentsToBrl(data.incomeInCents)}</Data>
          )}
          <Data label="Endereço" className="sm:col-span-2">
            {[data.address, data.addressNumber, data.complement, data.province].filter(Boolean).join(", ")}
          </Data>
          <Data label="Cidade e CEP">{data.city} / {data.state} · {formatPostalCode(data.postalCode ?? "")}</Data>
          {submittedAt && <Data label="Último envio">{formatDateTime(submittedAt, "medium")}</Data>}
        </dl>
      </CardContent>
    </Card>
  );
}

function ApplicationActions({ application, analysisAssignedToAdmin, open }: {
  application: Application; analysisAssignedToAdmin: boolean; open: (action: Action, target: HTMLElement) => void;
}) {
  if (application.status === "REJECTED") {
    return <Button type="button" className="h-11 w-fit" onClick={(event) => open("REOPEN", event.currentTarget)}>Reabrir análise</Button>;
  }
  if (application.status === "CHANGES_REQUESTED") {
    return (
      <Button type="button" variant="outline" className="h-11 w-fit text-destructive"
        onClick={(event) => open("REJECT", event.currentTarget)}>Recusar cadastro</Button>
    );
  }
  if (!actionStates.includes(application.status)) return null;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {!analysisAssignedToAdmin && (
          <Button type="button" className="h-11" onClick={(event) => open("START_REVIEW", event.currentTarget)}>
            Assumir análise
          </Button>
        )}
        {analysisAssignedToAdmin && application.submittedAt && (
          <Button type="button" className="h-11" onClick={(event) => open("APPROVE", event.currentTarget)}>
            Aprovar cadastro
          </Button>
        )}
        <Button type="button" variant="outline" className="h-11" onClick={(event) => open("REQUEST_CHANGES", event.currentTarget)}>Solicitar ajustes</Button>
        <Button type="button" variant="ghost" className="h-11 text-destructive" onClick={(event) => open("REJECT", event.currentTarget)}>Recusar cadastro</Button>
      </div>
    </div>
  );
}

function Data({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 wrap-anywhere">{children}</dd>
    </div>
  );
}

function CheckItem({ icon, label, checked, description }: { icon: ReactNode; label: string; checked: boolean; description?: string }) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="mt-1 text-xs tabular-nums text-muted-foreground">{description}</p>}
      </div>
      <Badge variant={checked ? "success" : "secondary"} className="ml-auto gap-1">
        {checked ? <><Check aria-hidden="true" className="size-3" />Concluído</> : "Pendente"}
      </Badge>
    </li>
  );
}

function OpeningHistory({ history, busy, onPageChange }: { history: OpeningDetail["history"]; busy: boolean; onPageChange: (page: number) => void }) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="border-b border-border p-5">
        <h2 className="text-balance text-lg font-semibold">Histórico do cadastro</h2>
      </CardHeader>
      <ol className="divide-y divide-border" aria-busy={busy}>
        {history.items.map((event) => (
          <li key={event.id} className="flex min-w-0 items-start gap-3 px-5 py-4">
            <div aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
              <Circle className="size-2 fill-current" />
            </div>
            <div className="grid min-w-0 flex-1 gap-1">
              <p className="text-pretty text-sm font-medium">{openingHistoryLabels[event.action]}</p>
              <p className="wrap-anywhere text-xs tabular-nums text-muted-foreground">
                <time dateTime={event.createdAt}>{formatDateTime(event.createdAt, "short")}</time>
                {event.actorName && <> · {event.actorName}</>}
              </p>
              {event.reason && <p className="wrap-anywhere whitespace-pre-wrap text-pretty text-sm text-muted-foreground">{event.reason}</p>}
            </div>
          </li>
        ))}
      </ol>
      <TablePagination {...history.pagination} busy={busy} label="Paginação do histórico" onPageChange={onPageChange} />
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-5">
      <Skeleton className="h-40 animate-none rounded-xl" />
      <div className="grid gap-5 xl:grid-cols-2"><Skeleton className="h-72 animate-none rounded-xl" /><Skeleton className="h-72 animate-none rounded-xl" /></div>
    </div>
  );
}
