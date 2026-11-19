"use client";

import { ToastNotice } from "@/components/ui/toast-notice";

import React, { useState, useEffect } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { AuthActionButton, AuthHeading, AuthSuccessMark } from "@/features/auth/components/auth-form-controls";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { Button } from "@/components/ui/button";
import {
  Check,
  RefreshCw,
  HelpCircle,
  LogOut,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useGatewayService, useDemoScenario } from "@/providers/demo-provider";
import { sessionService, type DemoSessionData } from "@/services/session.service";
import { cn } from "@/lib/utils";

const validationSteps = [
  { label: "Proposta recebida", description: "Informações societárias e perfil de transações registrados." },
  { label: "Análise cadastral", description: "Verificação de poderes societários, CNPJ e limites operacionais." },
  { label: "Liberação do acesso", description: "Disponibilização das chaves e console de pagamentos Pix." },
];
const validationLabels = validationSteps.map(({ label }) => label);

export function AccountValidationScreen() {
  const router = useRouter();
  const service = useGatewayService();
  const { logout, switchScenario } = useDemoScenario();
  const [action, setAction] = useState<"refresh" | "approve" | null>("refresh");
  const [sessionData, setSessionData] = useState<DemoSessionData | null>(null);
  const [statusInfo, setStatusInfo] = useState<Awaited<ReturnType<typeof service.checkValidationStatus>>>();
  const [error, setError] = useState<string | null>(null);
  const status = statusInfo?.status ?? sessionData?.accountStatus ?? "PENDING_REVIEW";
  const approved = status === "APPROVED";
  const currentStep = approved ? 2 : 1;

  useEffect(() => {
    let active = true;
    setSessionData(sessionService.getSession());
    service.checkValidationStatus().then((info) => {
      if (active) setStatusInfo(info);
    }).catch(() => {
      if (active) setError("Não foi possível consultar o status. Tente atualizar.");
    }).finally(() => {
      if (active) setAction(null);
    });
    return () => { active = false; };
  }, [service]);

  const handleRefreshStatus = async () => {
    if (action) return;

    setAction("refresh");
    setError(null);
    try {
      const info = await service.checkValidationStatus();
      setStatusInfo(info);
      if (info.status === "APPROVED") {
        toast.success("Conta aprovada. Redirecionando...");
        router.push("/inicio");
      } else {
        toast.info(info.status === "PENDING_REVIEW" ? "A conta continua em análise." : "Status consultado.");
      }
    } catch {
      setError("Não foi possível atualizar o status. Tente novamente.");
    } finally {
      setAction(null);
    }
  };

  const handleSimulateApproval = async () => {
    if (action) return;

    setAction("approve");
    setError(null);
    try {
      await switchScenario("NORMAL");
      toast.success("Demonstração: Conta aprovada com sucesso.");
      router.push("/inicio");
    } catch {
      setError("Não foi possível simular a aprovação. Tente novamente.");
    } finally {
      setAction(null);
    }
  };

  const handleLogout = () => {
    if (action) return;

    logout();
    toast.info("Sessão encerrada.");
    router.push("/entrar");
  };

  const displayEmail =
    statusInfo?.email || sessionData?.email;
  const displayCompany =
    sessionData?.companyName || "SloPay Soluções em Pagamentos Ltda";
  const submittedAt = statusInfo?.submittedAt || sessionData?.submittedAt;
  const formattedDate = submittedAt
    ? new Date(submittedAt).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    : undefined;

  return (
    <AuthShell
      contentMaxWidthClass="max-w-[480px]"
      progress={{ steps: validationLabels, current: currentStep, showOnMobile: false }}
    >
      <section className="w-full space-y-5">
        {/* Header */}
        <header className="space-y-2">
          {approved && <AuthSuccessMark />}
          <AuthHeading>{approved ? "Conta aprovada" : "Conta em validação"}</AuthHeading>
          <p className="break-words text-sm text-muted-foreground">{displayCompany}</p>
        </header>

        <div className="space-y-2">
          <AuthActionButton
            type="button"
            variant="outline"
            onClick={handleRefreshStatus}
            pending={action === "refresh"}
            pendingLabel="Atualizando…"
            disabled={action === "approve"}
            endIcon={<RefreshCw />}
          >
            Atualizar
          </AuthActionButton>
          <ToastNotice message={error} persistent />
        </div>

        {/* Mensagem Mandatória de Compliance */}
        <div className="p-3.5 rounded-[8px] bg-card/40 border border-border/80 space-y-1">
          <span className="text-[11px] font-semibold text-foreground">
            Status da Análise Cadastral
          </span>
          <p className="text-[12px] text-foreground font-medium leading-relaxed">
            {approved
              ? "O acesso ao console está liberado."
              : "Nossa equipe está validando a sua conta, será enviada a confirmação pro seu email quando finalizarmos."}
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed pt-0.5">
            O processo de validação assegura o enquadramento regulatório da empresa perante as normas de liquidação do Banco Central.
          </p>
        </div>

        {/* Dados do envio */}
        <dl className="grid gap-3 rounded-lg border border-border/60 bg-card/20 p-3 text-xs sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-muted-foreground">E-mail de notificação</dt>
            <dd className="break-words font-medium text-foreground">{displayEmail ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Proposta submetida</dt>
            <dd className="tabular-nums text-foreground">{formattedDate ?? "—"}</dd>
          </div>
        </dl>

        {/* Linha do Tempo Minimalista das Etapas */}
        <div className="space-y-2.5 pt-1">
          <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Etapas do Processo
          </h2>

          <ol className="space-y-3 relative pl-5 border-l border-border ml-2">
            {validationSteps.map(({ label, description }, index) => {
              const current = index === currentStep;
              const completed = index < currentStep;
              return (
                <li key={label} className="relative" aria-current={current ? "step" : undefined}>
                  <span aria-hidden="true" className={cn(
                    "absolute -left-[27px] top-0.5 grid size-3.5 place-items-center rounded-full border border-border bg-muted text-[8px] font-bold text-muted-foreground",
                    completed && "bg-success-surface text-success",
                    current && "border-primary bg-accent text-primary",
                  )}>
                    {completed ? <Check className="size-2 stroke-[3]" /> : index + 1}
                  </span>
                  <h3 className={cn("text-xs font-medium", current && "text-primary")}>
                    {label}
                    {completed && <span className="sr-only"> (concluída)</span>}
                  </h3>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Caixa de Demonstração */}
        <div className="p-3.5 rounded-[8px] bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-foreground block">
              Ambiente de Demonstração
            </span>
            <p className="text-[10px] text-muted-foreground">
              Você pode aprovar o cadastro instantaneamente para avaliar o console.
            </p>
          </div>
          <AuthActionButton
            type="button"
            onClick={handleSimulateApproval}
            pending={action === "approve"}
            pendingLabel="Aprovando…"
            disabled={action === "refresh"}
            endIcon={<ArrowRight />}
            className="shrink-0 self-start sm:self-auto"
          >
            Aprovar agora
          </AuthActionButton>
        </div>

        {/* Rodapé com Central de Suporte e Logout */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
          <NextLink
            href="/ajuda"
            className="inline-flex min-h-11 items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <HelpCircle aria-hidden="true" className="size-3" />
            <span>Central de Suporte</span>
          </NextLink>

          <Button
            type="button"
            variant="ghost"
            onClick={handleLogout}
            disabled={action !== null}
            className="h-11 px-2 text-xs"
          >
            <LogOut aria-hidden="true" />
            Sair da conta
          </Button>
        </div>
      </section>
    </AuthShell>
  );
}
