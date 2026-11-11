"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import { queryKeys } from "@/lib/query-keys";
import { formatDateTime, formatRelativeTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck,
  KeyRound,
  Lock,
  Smartphone,
  History,
  QrCode,
  Copy,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import type { SecurityEvent } from "@/types/domain";

export function SecurityScreen() {
  const service = useGatewayService();
  const queryClient = useQueryClient();

  const [is2faEnabled, setIs2faEnabled] = useState(true);
  const [show2faDialog, setShow2faDialog] = useState(false);
  const [totpCode, setTotpCode] = useState("");

  const [showPinDialog, setShowPinDialog] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassText, setShowPassText] = useState(false);

  const { data: securityEvents, isLoading: isLoadingEvents } = useQuery({
    queryKey: queryKeys.securityEvents(),
    queryFn: () => service.getSecurityEvents(),
  });

  const updateSettingMutation = useMutation({
    mutationFn: (params: {
      type: "PIN" | "PASSWORD" | "2FA";
      payload: {
        currentPin?: string;
        newPin?: string;
        currentPassword?: string;
        newPassword?: string;
        enabled?: boolean;
      };
    }) => service.updateSecuritySetting(params.type, params.payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.securityEvents() });
      if (vars.type === "PIN") {
        toast.success("PIN de autorização alterado com sucesso.");
        setShowPinDialog(false);
        setCurrentPin("");
        setNewPin("");
        setConfirmPin("");
      } else if (vars.type === "PASSWORD") {
        toast.success("Senha de login atualizada com sucesso.");
        setShowPasswordDialog(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else if (vars.type === "2FA") {
        toast.success(
          vars.payload.enabled
            ? "Autenticação em dois fatores ativada."
            : "Autenticação em dois fatores desativada."
        );
        setIs2faEnabled(Boolean(vars.payload.enabled));
        setShow2faDialog(false);
        setTotpCode("");
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar configuração de segurança.");
    },
  });

  const handleToggle2fa = (checked: boolean) => {
    if (checked) {
      setShow2faDialog(true);
    } else {
      updateSettingMutation.mutate({
        type: "2FA",
        payload: { enabled: false },
      });
    }
  };

  const handleConfirm2faActivation = () => {
    if (totpCode.length !== 6) {
      toast.error("Digite o código de 6 dígitos gerado pelo seu app autenticador.");
      return;
    }
    updateSettingMutation.mutate({
      type: "2FA",
      payload: { enabled: true },
    });
  };

  const handleSavePin = () => {
    if (currentPin !== "123456") {
      toast.error("PIN atual incorreto. Use o PIN demonstrativo 123456.");
      return;
    }
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      toast.error("O novo PIN deve conter exatamente 6 dígitos numéricos.");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("A confirmação do novo PIN não confere.");
      return;
    }
    updateSettingMutation.mutate({
      type: "PIN",
      payload: { currentPin, newPin },
    });
  };

  const handleSavePassword = () => {
    if (!currentPassword) {
      toast.error("Informe a senha atual de acesso.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("A confirmação da nova senha não confere.");
      return;
    }
    updateSettingMutation.mutate({
      type: "PASSWORD",
      payload: { currentPassword, newPassword },
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Chave copiada para a área de transferência!");
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Segurança & Autenticação
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerenciamento de credenciais de acesso, duplo fator e auditoria de eventos críticos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 2FA */}
        <Card className="border-border bg-card/80 flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Smartphone className="size-5" />
              </div>
              <Badge
                variant={is2faEnabled ? "default" : "outline"}
                className={is2faEnabled ? "bg-primary/20 text-primary border-primary/30" : ""}
              >
                {is2faEnabled ? "Protegido" : "Desativado"}
              </Badge>
            </div>
            <CardTitle className="text-base text-foreground mt-3">
              Autenticação em 2 Fatores (2FA)
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              Exige um código temporário de 6 dígitos gerado por aplicativo autenticador (Google Authenticator, Authy ou 1Password) em cada login.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 border-t border-border/50 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">
              {is2faEnabled ? "2FA Ativo" : "2FA Desativado"}
            </span>
            <Switch
              checked={is2faEnabled}
              onCheckedChange={handleToggle2fa}
              disabled={updateSettingMutation.isPending}
            />
          </CardContent>
        </Card>

        {/* Card PIN de Pagamento */}
        <Card className="border-border bg-card/80 flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <KeyRound className="size-5" />
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                PIN: 123456
              </Badge>
            </div>
            <CardTitle className="text-base text-foreground mt-3">
              PIN de Operações Pix
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              Código numérico de 6 dígitos exigido para assinar solicitações de saque Pix, emissão de lotes e alterações cadastrais restritas.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 border-t border-border/50 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Configurado</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPinDialog(true)}
              className="text-xs"
            >
              Alterar PIN
            </Button>
          </CardContent>
        </Card>

        {/* Card Senha de Acesso */}
        <Card className="border-border bg-card/80 flex flex-col justify-between md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Lock className="size-5" />
              </div>
              <span className="text-xs text-muted-foreground">Última troca há 45 dias</span>
            </div>
            <CardTitle className="text-base text-foreground mt-3">
              Senha de Acesso ao Painel
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              Utilizada para iniciar a sessão na plataforma web juntamente com seu e-mail corporativo.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground">
                Requisitos: Mínimo 8 caracteres, números e símbolos
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswordDialog(true)}
              className="text-xs self-end sm:self-auto"
            >
              Trocar Senha de Acesso
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Trilha de Auditoria de Eventos de Segurança */}
      <Card className="border-border bg-card/80">
        <CardHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                <History className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base text-foreground">
                  Trilha de Auditoria de Segurança
                </CardTitle>
                <CardDescription className="text-xs">
                  Registro cronológico de acessos, alterações de credenciais e ações sensíveis.
                </CardDescription>
              </div>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {securityEvents?.length || 0} eventos
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoadingEvents ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !securityEvents || securityEvents.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Nenhum evento de segurança registrado.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {securityEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="size-7 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
                      <ShieldCheck className="size-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{evt.description}</p>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        Origem: {evt.simulatedIp}
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right pl-10 sm:pl-0">
                    <span className="text-muted-foreground">
                      {formatRelativeTime(evt.createdAt)}
                    </span>
                    <span className="block text-[10px] text-muted-foreground font-mono">
                      {formatDateTime(evt.createdAt, "short")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog 2FA Setup */}
      <Dialog open={show2faDialog} onOpenChange={setShow2faDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="size-5 text-primary" />
              Ativar Autenticação em Dois Fatores
            </DialogTitle>
            <DialogDescription className="text-xs">
              Escaneie o código QR abaixo com seu aplicativo autenticador de preferência.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Mock QR code container */}
            <div className="p-4 rounded-xl bg-white flex flex-col items-center justify-center mx-auto w-48 h-48 border">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full text-black fill-current"
              >
                <path d="M10 10h30v30h-30z M15 15v20h20v-20z M20 20h10v10h-10z M60 10h30v30h-30z M65 15v20h20v-20z M70 20h10v10h-10z M10 60h30v30h-30z M15 65v20h20v-20z M20 70h10v10h-10z M45 15h10v10h-10z M45 35h10v10h-10z M45 65h10v10h-10z M60 60h10v10h-10z M80 60h10v10h-10z M70 70h10v10h-10z M60 80h10v10h-10z M80 80h10v10h-10z" />
              </svg>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Ou insira a chave secreta manualmente:</label>
              <div className="flex items-center gap-2 p-2 rounded bg-muted/60 border font-mono text-xs text-foreground justify-between">
                <span>JBSW Y3DP EHPK 3PXP</span>
                <Button
                  size="iconSm"
                  variant="ghost"
                  onClick={() => copyToClipboard("JBSWY3DPEHPK3PXP")}
                  title="Copiar Chave"
                >
                  <Copy className="size-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-medium text-foreground">
                Código de 6 dígitos gerado pelo App:
              </label>
              <Input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="text-center font-mono text-lg tracking-widest h-11"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShow2faDialog(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm2faActivation}
              disabled={totpCode.length !== 6 || updateSettingMutation.isPending}
            >
              Confirmar & Ativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Alterar PIN */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" />
              Alterar PIN de Operações Pix
            </DialogTitle>
            <DialogDescription className="text-xs">
              Defina um novo PIN numérico de 6 dígitos para assinar transações.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">PIN Atual (Demonstração)</label>
                <span className="text-[10px] text-muted-foreground">Padrão: 123456</span>
              </div>
              <Input
                type="password"
                maxLength={6}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="******"
                className="font-mono text-center tracking-widest h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Novo PIN (6 dígitos)</label>
              <Input
                type="password"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="******"
                className="font-mono text-center tracking-widest h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Confirmar Novo PIN</label>
              <Input
                type="password"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="******"
                className="font-mono text-center tracking-widest h-10"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowPinDialog(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSavePin}
              disabled={newPin.length !== 6 || newPin !== confirmPin || updateSettingMutation.isPending}
            >
              Salvar Novo PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Alterar Senha */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="size-5 text-primary" />
              Alterar Senha de Acesso
            </DialogTitle>
            <DialogDescription className="text-xs">
              Atualize a senha de login corporativo na plataforma.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Senha Atual</label>
              <div className="relative">
                <Input
                  type={showPassText ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Sua senha atual"
                  className="h-10 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassText(!showPassText)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassText ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Nova Senha</label>
              <Input
                type={showPassText ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Confirmar Nova Senha</label>
              <Input
                type={showPassText ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="h-10"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSavePassword}
              disabled={!newPassword || newPassword !== confirmPassword || updateSettingMutation.isPending}
            >
              Atualizar Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
