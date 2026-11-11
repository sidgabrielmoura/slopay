"use client";

import React, { useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useGatewayService } from "@/providers/demo-provider";
import { sessionService } from "@/services/session.service";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Informe o e-mail corporativo")
    .email("Informe um formato de e-mail válido"),
  password: z
    .string()
    .min(6, "A senha deve conter pelo menos 6 caracteres"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const service = useGatewayService();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "gabriel.silva@slopay.com.br",
      password: "SenhaSegura@2026",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const result = await service.authenticate(data.email, data.password);
      if (result.requires2FA) {
        toast.info("Autenticação em dois fatores necessária. Redirecionando para verificação...");
        router.push("/verificar-acesso");
        return;
      }
      const session = sessionService.getSession();
      if (session?.isAdmin) {
        toast.success(`Acesso administrativo autenticado. Bem-vindo, ${result.user?.name || "Usuário"}!`);
        router.push("/admin");
        return;
      }
      if (result.accountStatus === "PENDING_REVIEW") {
        toast.info("Conta sob análise. Redirecionando...");
        router.push("/conta-em-validacao");
      } else {
        toast.success(`Bem-vindo, ${result.user?.name || "Usuário"}!`);
        router.push("/inicio");
      }
    } catch (err: any) {
      setAuthError(err?.message || "E-mail ou senha incorretos.");
      toast.error("Falha ao autenticar. Verifique seus dados.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center max-w-5xl">
      {/* Coluna Esquerda: Institucional */}
      <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-6 pr-4">
        <div className="space-y-3">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Infraestrutura Pix Corporativa
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground leading-tight">
            Liquidação instantânea e governança financeira para grandes operações.
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Acesse o console de tesouraria do SloPay para monitorar cobranças dinâmicas, automatizar
            pagamentos em lote e gerenciar regras de alçadas em conformidade com o BACEN.
          </p>
        </div>

        <div className="space-y-4 pt-2 border-t border-border/60">
          <div className="space-y-1">
            <h2 className="text-xs font-semibold text-foreground">
              Conexão Direta SPI / DICT
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Liquidação com latência inferior a 1,2s e alta disponibilidade garantida por SLA.
            </p>
          </div>

          <div className="space-y-1">
            <h2 className="text-xs font-semibold text-foreground">
              Regras de Quórum e Alçadas
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Políticas de aprovação dupla para transferências e saques de alto volume.
            </p>
          </div>

          <div className="space-y-1">
            <h2 className="text-xs font-semibold text-foreground">
              Auditoria e Conformidade
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Registros imutáveis de transações com conciliação contábil automatizada.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-card/40 border border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary" />
            <span>Sistema Operacional Pix:</span>
            <span className="text-foreground font-medium">Normal</span>
          </div>
          <span className="font-mono text-[11px]">SLA 99.99%</span>
        </div>
      </div>

      {/* Coluna Direita: Formulário de Login */}
      <div className="w-full lg:col-span-6 flex justify-center">
        <Card className="w-full max-w-md border-border bg-card">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
                Acesse sua conta
              </CardTitle>
              <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground border-border">
                PJ Enterprise
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Entre com seu e-mail corporativo para gerenciar suas operações.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {authError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2"
                >
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <p className="text-xs">{authError}</p>
                </div>
              )}

              {/* Campo E-mail */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-medium text-foreground">
                  E-mail Corporativo
                </label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="nome@empresa.com.br"
                  className={`h-10 text-xs bg-background/50 ${
                    errors.email ? "border-destructive focus-visible:ring-destructive" : ""
                  }`}
                  aria-invalid={Boolean(errors.email)}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-[11px] text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* Campo Senha */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-xs font-medium text-foreground">
                    Senha de Acesso
                  </label>
                  <NextLink
                    href="/recuperar-acesso"
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                  >
                    Esqueceu a senha?
                  </NextLink>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    placeholder="••••••••••••"
                    className={`pr-10 h-10 text-xs font-mono bg-background/50 ${
                      errors.password ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                    aria-invalid={Boolean(errors.password)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                    aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[11px] text-destructive">{errors.password.message}</p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-1">
              <Button
                type="submit"
                className="w-full h-10 font-medium"
                disabled={isLoading}
              >
                <span>{isLoading ? "Autenticando..." : "Entrar no painel"}</span>
              </Button>

              <div className="pt-2 text-center text-xs text-muted-foreground">
                <span>Não possui conta? </span>
                <NextLink
                  href="/criar-conta"
                  className="text-foreground hover:underline font-medium inline-flex items-center gap-1"
                >
                  Abrir conta empresarial
                  <ArrowRight className="size-3" />
                </NextLink>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
