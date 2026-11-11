"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  User,
  ShieldAlert,
  Smartphone,
  CheckCircle2,
  Laptop,
  Clock,
  Save,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export function ProfileScreen() {
  const service = useGatewayService();
  const queryClient = useQueryClient();

  const { data: account, isLoading: isLoadingAccount } = useQuery({
    queryKey: queryKeys.account(),
    queryFn: () => service.getAccount(),
  });

  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: queryKeys.users(),
    queryFn: () => service.getUsers(),
  });

  const activeUser = usersData?.data.find((u) => u.role === "TITULAR") || usersData?.data[0];

  const [phone, setPhone] = useState("");
  const [hasChangedPhone, setHasChangedPhone] = useState(false);

  React.useEffect(() => {
    if (activeUser && !hasChangedPhone) {
      setPhone(activeUser.phone || "(11) 98765-4321");
    }
  }, [activeUser, hasChangedPhone]);

  const updatePhoneMutation = useMutation({
    mutationFn: (newPhone: string) => service.updateProfile(newPhone),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.account() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      toast.success("Telefone de contato atualizado com sucesso.");
      setHasChangedPhone(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar telefone.");
    },
  });

  const handleTerminateOtherSessions = () => {
    toast.success("Todas as outras 2 sessões ativas foram desconectadas na simulação.");
  };

  if (isLoadingAccount || isLoadingUsers) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Perfil da Conta & Usuário
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dados cadastrais da instituição jurídica e informações do operador conectado à sessão.
        </p>
      </div>

      {/* Dados Cadastrais da Empresa */}
      <Card className="border-border bg-card/80">
        <CardHeader className="pb-4 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Building2 className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base text-foreground">
                  Dados Jurídicos da Empresa
                </CardTitle>
                <CardDescription className="text-xs">
                  Informações validadas junto ao Bacen e Receita Federal do Brasil.
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs self-start sm:self-center gap-1.5 border-primary/30 text-primary bg-primary/5">
              <CheckCircle2 className="size-3.5" />
              Homologado Bacen (SPI/DICT)
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-lg bg-background/50 border border-border/60">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                Razão Social
              </span>
              <p className="text-sm font-semibold text-foreground">
                {account?.companyName || "Nexus Soluções Digitais Ltda"}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-background/50 border border-border/60">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                CNPJ
              </span>
              <p className="text-sm font-mono font-medium text-foreground">
                {account?.document || "12.345.678/0001-90"}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-background/50 border border-border/60">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                Instituição Liquidante
              </span>
              <p className="text-sm font-semibold text-foreground">
                {account?.bankName || "Banco Arbi S.A. (213)"}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-background/50 border border-border/60">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                Conta de Liquidação Pix
              </span>
              <p className="text-sm font-mono font-medium text-foreground">
                Agência 0001 · C/C {account?.accountNumber || "98234-1"}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-background/50 border border-border/60">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                Ambiente de Conexão
              </span>
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Produção Operacional
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-background/50 border border-border/60">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                Identificador Bacen (ISPB)
              </span>
              <p className="text-sm font-mono font-medium text-foreground">
                00360305 (SloPay)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-muted/40 border border-border/60 text-muted-foreground text-xs leading-relaxed">
            <ShieldAlert className="size-4 text-primary shrink-0 mt-0.5" />
            <p>
              Por determinação do Sistema de Pagamentos Brasileiro (SPB), as alterações de dados cadastrais (Razão Social, CNPJ ou quadro societário) exigem processo formal de compliance e reenvio de contrato social via canal de suporte regulatório.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Operador Conectado */}
      <Card className="border-border bg-card/80">
        <CardHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <User className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base text-foreground">
                Dados do Operador na Sessão
              </CardTitle>
              <CardDescription className="text-xs">
                Informações da conta de acesso individual vinculada a esta sessão.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nome Completo</label>
              <Input
                value={activeUser?.name || "Gabriel Silva"}
                disabled
                className="h-10 bg-muted/30 font-medium text-foreground cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">E-mail de Acesso</label>
              <Input
                value={activeUser?.email || "gabriel@nexuspagamentos.com.br"}
                disabled
                className="h-10 bg-muted/30 font-mono text-xs cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">CPF do Titular</label>
              <Input
                value={activeUser?.document || "123.456.789-00"}
                disabled
                className="h-10 bg-muted/30 font-mono text-xs cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">Telefone de Segurança / SMS</label>
                <span className="text-[10px] text-primary font-medium">Editável</span>
              </div>
              <div className="flex gap-2">
                <Input
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setHasChangedPhone(true);
                  }}
                  placeholder="(11) 98765-4321"
                  className="h-10"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updatePhoneMutation.mutate(phone)}
                  disabled={!hasChangedPhone || updatePhoneMutation.isPending}
                  className="gap-1.5 shrink-0"
                >
                  <Save className="size-3.5" />
                  <span>Salvar</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <span className="text-xs text-muted-foreground">Papel Atribuído:</span>
            <Badge variant="default" className="text-xs">
              {activeUser?.role || "Titular"}
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              Último login registrado: Hoje às 09:14 (IP São Paulo, BR)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Sessões e Segurança do Acesso */}
      <Card className="border-border bg-card/80">
        <CardHeader className="pb-4 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base text-foreground">Sessões Ativas</CardTitle>
              <CardDescription className="text-xs">
                Dispositivos com acesso autorizado a esta conta operacional.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTerminateOtherSessions}
              className="gap-1.5 text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <LogOut className="size-3.5" />
              <span>Encerrar outras sessões</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/80 bg-background/50">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Laptop className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    Google Chrome · Windows 11
                  </p>
                  <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                    Sessão Atual
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  IP 187.54.12.98 · São Paulo, SP · Conectado há 42 minutos
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/40 bg-background/30 text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                <Smartphone className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  SloPay Mobile App · iPhone 15 Pro
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  IP 177.18.23.41 · Campinas, SP · Ativo ontem às 21:05
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
