"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import { queryKeys } from "@/lib/query-keys";
import { demoPolicy } from "@/config/demo-policy.config";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageLoadingSurface } from "@/components/ui/image-loading";
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
import { AuthField, AuthPasswordToggle } from "@/features/auth/components/auth-form-controls";
import { CodeSlots, useCodeVerification } from "@/features/auth/components/code-slots";
import { Copy, KeyRound, Lock, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { SecurityCard, SecurityLayout, SecurityMethod } from "./security-layout";

const dialogSize = "max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] overflow-y-auto sm:max-w-md";

export function SecurityScreen() {
  const service = useGatewayService();
  const queryClient = useQueryClient();
  const dialogTrigger = useRef<HTMLButtonElement>(null);

  const [is2faEnabled, setIs2faEnabled] = useState(true);
  const [show2faDialog, setShow2faDialog] = useState(false);

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
        if (!vars.payload.enabled) toast.success("Autenticação em dois fatores desativada.");
        setIs2faEnabled(Boolean(vars.payload.enabled));
      }
    },
    onError: (err, vars) => {
      if (vars.type === "2FA" && vars.payload.enabled) return;
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar configuração de segurança.");
    },
  });

  const activation = useCodeVerification({
    verify: (code: string) => code === demoPolicy.demoOtp
      ? updateSettingMutation.mutateAsync({ type: "2FA", payload: { enabled: true } })
      : Promise.reject(new ApiError("Código demonstrativo incorreto.", 400)),
    isRejection: (error) => error instanceof ApiError && error.status === 400,
    onSuccess: () => {
      setShow2faDialog(false);
      activation.reset();
    },
    failureMessage: "Não foi possível ativar o autenticador.",
  });

  const handleToggle2fa = (checked: boolean) => {
    if (checked) {
      activation.reset();
      setShow2faDialog(true);
    } else {
      updateSettingMutation.mutate({
        type: "2FA",
        payload: { enabled: false },
      });
    }
  };

  const handleSavePin = () => {
    if (currentPin !== demoPolicy.demoPin) {
      toast.error(`PIN atual incorreto. Use o PIN demonstrativo ${demoPolicy.demoPin}.`);
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Chave copiada.");
    } catch {
      toast.error("Não foi possível copiar a chave.");
    }
  };

  function restoreDialogFocus(event: Event) {
    const trigger = dialogTrigger.current;
    if (!trigger?.isConnected) return;
    event.preventDefault();
    trigger.focus();
  }

  return (
    <SecurityLayout>
      <SecurityCard title="Métodos de acesso">
        <div className="divide-y divide-border">
          <SecurityMethod
            icon={Smartphone}
            title="Aplicativo autenticador"
            description="Gera os códigos de verificação em dois fatores."
            status={<Badge variant={is2faEnabled ? "success" : "secondary"}>{is2faEnabled ? "Ativo" : "Desativado"}</Badge>}
            action={
              <Switch
                aria-label="Autenticação em dois fatores"
                onClick={(event) => { dialogTrigger.current = event.currentTarget; }}
                checked={is2faEnabled}
                onCheckedChange={handleToggle2fa}
                disabled={updateSettingMutation.isPending}
              />
            }
          />
          <SecurityMethod
            icon={KeyRound}
            title="PIN de operações Pix"
            description="Usado na autorização das operações da demonstração."
            action={
              <Button variant="outline" className="h-11" onClick={(event) => {
                dialogTrigger.current = event.currentTarget;
                setShowPinDialog(true);
              }}>Alterar PIN</Button>
            }
          />
          <SecurityMethod
            icon={Lock}
            title="Senha de acesso"
            description="Usada com o e-mail para entrar no painel."
            action={
              <Button variant="outline" className="h-11" onClick={(event) => {
                dialogTrigger.current = event.currentTarget;
                setShowPasswordDialog(true);
              }}>Trocar senha</Button>
            }
          />
        </div>
      </SecurityCard>

      <SecurityCard title="Atividade de segurança">
        {isLoadingEvents ? (
          <div className="grid gap-2" aria-busy="true">
            <span role="status" className="sr-only">Carregando eventos</span>
            <Skeleton className="h-12 motion-reduce:animate-none" />
            <Skeleton className="h-12 motion-reduce:animate-none" />
          </div>
        ) : securityEvents?.length ? (
          <ul className="divide-y divide-border">
            {securityEvents.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 first:pt-1 last:pb-0">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">{event.description}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{event.simulatedIp}</p>
                </div>
                <time dateTime={event.createdAt} className="text-xs text-muted-foreground tabular-nums">
                  {formatDateTime(event.createdAt, "short")}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum evento de segurança registrado.</p>
        )}
      </SecurityCard>

      {/* Dialog 2FA Setup */}
      <Dialog open={show2faDialog} onOpenChange={(open) => {
        if (!activation.busy) setShow2faDialog(open);
      }}>
        <DialogContent className={dialogSize} onCloseAutoFocus={restoreDialogFocus}>
          <DialogHeader>
            <DialogTitle>Ativar autenticação em dois fatores</DialogTitle>
            <DialogDescription>
              Use o código {demoPolicy.demoOtp} para simular a confirmação do autenticador.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <ImageLoadingSurface state="ready" className="mx-auto size-48 rounded-xl">
              <div className="size-full bg-white p-4">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full text-black fill-current"
                role="img"
                aria-label="QR Code demonstrativo do autenticador"
              >
                <path d="M10 10h30v30h-30z M15 15v20h20v-20z M20 20h10v10h-10z M60 10h30v30h-30z M65 15v20h20v-20z M70 20h10v10h-10z M10 60h30v30h-30z M15 65v20h20v-20z M20 70h10v10h-10z M45 15h10v10h-10z M45 35h10v10h-10z M45 65h10v10h-10z M60 60h10v10h-10z M80 60h10v10h-10z M70 70h10v10h-10z M60 80h10v10h-10z M80 80h10v10h-10z" />
              </svg>
              </div>
            </ImageLoadingSurface>

            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground">Chave manual de demonstração</p>
              <div className="flex items-center gap-2 p-2 rounded bg-muted/60 border font-mono text-xs text-foreground justify-between">
                <span>JBSW Y3DP EHPK 3PXP</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => void copyToClipboard("JBSWY3DPEHPK3PXP")}
                  aria-label="Copiar chave manual"
                  className="size-11 shrink-0"
                >
                  <Copy className="size-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <CodeSlots
                id="demo-security-code"
                label="Código de 6 dígitos do autenticador"
                format="totp"
                successLabel="Autenticação em dois fatores ativada."
                {...activation.field}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="h-11" disabled={activation.busy} onClick={() => setShow2faDialog(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Alterar PIN */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className={dialogSize} onCloseAutoFocus={restoreDialogFocus}>
          <DialogHeader>
            <DialogTitle>Alterar PIN de operações Pix</DialogTitle>
            <DialogDescription>
              O PIN demonstrativo atual é {demoPolicy.demoPin}. O novo PIN deve ter seis dígitos.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" method="post" onSubmit={(event) => { event.preventDefault(); handleSavePin(); }}>
            <AuthField id="demo-current-pin" label="PIN atual" type="password" inputMode="numeric" maxLength={6}
              value={currentPin} onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, "").slice(0, 6))} />
            <AuthField id="demo-new-pin" label="Novo PIN" type="password" inputMode="numeric" maxLength={6}
              value={newPin} onChange={(event) => setNewPin(event.target.value.replace(/\D/g, "").slice(0, 6))} />
            <AuthField id="demo-confirm-pin" label="Confirme o novo PIN" type="password" inputMode="numeric" maxLength={6}
              value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 6))} />
            <DialogFooter className="gap-2 sm:space-x-0">
              <Button type="button" variant="outline" className="h-11" onClick={() => setShowPinDialog(false)}>Cancelar</Button>
              <Button type="submit" className="h-11"
                disabled={newPin.length !== 6 || newPin !== confirmPin || updateSettingMutation.isPending}>
                Salvar PIN
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className={dialogSize} onCloseAutoFocus={restoreDialogFocus}>
          <DialogHeader>
            <DialogTitle>Trocar senha de acesso</DialogTitle>
            <DialogDescription>A nova senha deve ter ao menos oito caracteres.</DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" method="post" onSubmit={(event) => { event.preventDefault(); handleSavePassword(); }}>
            <AuthField id="demo-current-password" label="Senha atual" type={showPassText ? "text" : "password"}
              autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)}
              endControl={<AuthPasswordToggle visible={showPassText} controls="demo-current-password" onToggle={() => setShowPassText(!showPassText)} />} />
            <AuthField id="demo-new-password" label="Nova senha" type="password" autoComplete="new-password"
              value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            <AuthField id="demo-confirm-password" label="Confirme a nova senha" type="password" autoComplete="new-password"
              value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            <DialogFooter className="gap-2 sm:space-x-0">
              <Button type="button" variant="outline" className="h-11" onClick={() => setShowPasswordDialog(false)}>Cancelar</Button>
              <Button type="submit" className="h-11"
                disabled={!newPassword || newPassword !== confirmPassword || updateSettingMutation.isPending}>
                Atualizar senha
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SecurityLayout>
  );
}
