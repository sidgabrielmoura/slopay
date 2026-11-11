"use client";

import React, { useState, useEffect } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  RefreshCw,
  HelpCircle,
  LogOut,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useGatewayService, useDemoScenario } from "@/providers/demo-provider";
import { sessionService } from "@/services/session.service";

export function AccountValidationScreen() {
  const router = useRouter();
  const service = useGatewayService();
  const { logout, switchScenario } = useDemoScenario();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [statusInfo, setStatusInfo] = useState<{
    status: string;
    message?: string;
    submittedAt?: string;
    email?: string;
  }>({
    status: "PENDING_REVIEW",
    message:
      "Nossa equipe está validando a sua conta, será enviada a confirmação pro seu email quando finalizarmos.",
  });

  useEffect(() => {
    const session = sessionService.getSession();
    setSessionData(session);
    service.checkValidationStatus().then((info) => {
      setStatusInfo(info);
    });
  }, [service]);

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      const info = await service.checkValidationStatus();
      setStatusInfo(info);
      if (info.status === "APPROVED") {
        toast.success("Conta aprovada. Redirecionando...");
        router.push("/inicio");
      } else {
        toast.info("A conta continua sob análise pela equipe de compliance.");
      }
    } catch {
      toast.error("Não foi possível atualizar o status. Tente novamente.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSimulateApproval = async () => {
    await switchScenario("NORMAL");
    toast.success("Demonstração: Conta aprovada com sucesso.");
    router.push("/inicio");
  };

  const handleLogout = () => {
    logout();
    toast.info("Sessão encerrada.");
    router.push("/entrar");
  };

  const displayEmail =
    statusInfo.email || sessionData?.email || "gabriel.silva@slopay.com.br";
  const displayCompany =
    sessionData?.companyName || "SloPay Soluções em Pagamentos Ltda";
  const formattedDate = statusInfo.submittedAt
    ? new Date(statusInfo.submittedAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Hoje às " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <AuthShell contentMaxWidthClass="max-w-[480px]">
      <div className="w-full space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                Conta Corporativa
              </span>
              <Badge
                variant="outline"
                className="text-[10px] py-0 px-2 font-normal text-primary border-primary/30 bg-primary/5"
              >
                Em validação
              </Badge>
            </div>
            <h1 className="text-[20px] font-semibold text-foreground tracking-[-0.02em] leading-tight mt-1">
              {displayCompany}
            </h1>
          </div>

          <button
            type="button"
            onClick={handleRefreshStatus}
            disabled={isRefreshing}
            className="h-8 px-2.5 rounded-[6px] border border-border bg-card/40 text-[11px] font-medium text-foreground hover:bg-card/70 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`size-3 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Atualizar</span>
          </button>
        </div>

        {/* Mensagem Mandatória de Compliance */}
        <div className="p-3.5 rounded-[8px] bg-card/40 border border-border/80 space-y-1">
          <span className="text-[11px] font-semibold text-foreground">
            Status da Análise Cadastral
          </span>
          <p className="text-[12px] text-foreground font-medium leading-relaxed">
            &ldquo;Nossa equipe está validando a sua conta, será enviada a confirmação pro seu email quando finalizarmos.&rdquo;
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed pt-0.5">
            O processo de validação assegura o enquadramento regulatório da empresa perante as normas de liquidação do Banco Central.
          </p>
        </div>

        {/* Dados do envio */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-[8px] bg-card/20 border border-border/60 text-[11px]">
          <div>
            <span className="text-muted-foreground block text-[10px]">
              E-mail de notificação:
            </span>
            <span className="text-foreground font-mono font-medium truncate block">
              {displayEmail}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px]">
              Proposta submetida:
            </span>
            <span className="text-foreground font-mono truncate block">
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Linha do Tempo Minimalista das Etapas */}
        <div className="space-y-2.5 pt-1">
          <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Etapas do Processo
          </h2>

          <div className="space-y-3 relative pl-5 border-l border-border ml-2">
            {/* Etapa 1 */}
            <div className="relative">
              <div className="absolute -left-[27px] top-0.5 size-3.5 rounded-full bg-secondary border border-border text-foreground flex items-center justify-center text-[9px]">
                <Check className="size-2 stroke-[3]" />
              </div>
              <div>
                <h3 className="text-[12px] font-medium text-foreground">Proposta recebida</h3>
                <p className="text-[11px] text-muted-foreground">
                  Informações societárias e perfil de transações registrados.
                </p>
              </div>
            </div>

            {/* Etapa 2 */}
            <div className="relative">
              <div className="absolute -left-[27px] top-0.5 size-3.5 rounded-full bg-primary/20 border border-primary text-primary flex items-center justify-center text-[8px] font-bold">
                2
              </div>
              <div>
                <h3 className="text-[12px] font-medium text-primary">
                  Análise cadastral e de compliance
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Verificação de poderes societários, CNPJ e limites operacionais.
                </p>
              </div>
            </div>

            {/* Etapa 3 */}
            <div className="relative">
              <div className="absolute -left-[27px] top-0.5 size-3.5 rounded-full bg-muted border border-border text-muted-foreground flex items-center justify-center text-[8px]">
                3
              </div>
              <div>
                <h3 className="text-[12px] font-medium text-muted-foreground">
                  Confirmação e liberação do acesso
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Disponibilização das chaves e console de pagamentos Pix.
                </p>
              </div>
            </div>
          </div>
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
          <button
            type="button"
            onClick={handleSimulateApproval}
            className="h-8 px-3 rounded-[6px] bg-primary text-primary-foreground font-semibold text-[11px] hover:bg-primary/90 active:scale-[0.99] transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <span>Aprovar agora</span>
            <ArrowRight className="size-3" />
          </button>
        </div>

        {/* Rodapé com Central de Suporte e Logout */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
          <NextLink
            href="/ajuda"
            className="hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
          >
            <HelpCircle className="size-3" />
            <span>Central de Suporte</span>
          </NextLink>

          <button
            type="button"
            onClick={handleLogout}
            className="hover:text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="size-3" />
            <span>Sair da conta</span>
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
