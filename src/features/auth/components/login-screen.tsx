"use client";

import React, { useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useGatewayService } from "@/providers/demo-provider";
import { sessionService } from "@/services/session.service";
import { AuthActionButton, AuthField, AuthHeading, AuthPasswordToggle } from "./auth-form-controls";
import { AuthShell, loginSteps } from "./auth-shell";
import { CodeSlots, useCodeVerification } from "./code-slots";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Enter your email address")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface TestimonialSlide {
  quote: string;
  author: string;
  role: string;
  company: string;
  companyUrl: string;
}

const TESTIMONIALS: TestimonialSlide[] = [
  {
    quote:
      "“Nosso fluxo de pagamentos ficou mais simples, rápido e previsível. Hoje temos total visibilidade sobre cada transação.”",
    author: "Mariana Costa",
    role: "Diretora Financeira da",
    company: "NovaPay",
    companyUrl: "#",
  },

  {
    quote:
      "“A automação da liquidação e da conciliação eliminou grande parte do trabalho manual da nossa operação financeira.”",
    author: "Rafael Martins",
    role: "Head de Operações da",
    company: "Fluxo Digital",
    companyUrl: "#",
  },
];

export function LoginScreen() {
  const router = useRouter();
  const service = useGatewayService();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  const [requires2FA, setRequires2FA] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null);

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
      rememberMe: true,
    },
  });

  const handleSuccessfulLogin = (result: any) => {
    const session = sessionService.getSession();

    // Check for returnTo query param if present
    const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const rawReturnTo = searchParams?.get("returnTo");

    // Validate destination strictly against Open Redirect attacks
    const safeReturnTo =
      rawReturnTo &&
        rawReturnTo.startsWith("/") &&
        !rawReturnTo.startsWith("//") &&
        !rawReturnTo.includes(":")
        ? rawReturnTo
        : null;

    let destination = "/inicio";
    if (session?.isAdmin) {
      toast.success(`Autenticado como administrador. Bem-vindo, ${result.user?.name || "Usuário"}!`);
      destination = safeReturnTo || "/admin";
    } else if (result.accountStatus === "PENDING_REVIEW") {
      toast.info("Conta em validação. Redirecionando...");
      destination = "/conta-em-validacao";
    } else {
      toast.success(`Bem-vindo de volta, ${result.user?.name || "Usuário"}!`);
      destination = safeReturnTo || "/inicio";
    }

    // Perform a full top-level navigation so newly set cookies are sent cleanly in HTTP headers to Next.js 16 Proxy
    if (typeof window !== "undefined") {
      window.location.href = destination;
    } else {
      router.push(destination);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const result = await service.authenticate(data.email, data.password);
      if (result.requires2FA) {
        setPendingCredentials({ email: data.email, password: data.password });
        setRequires2FA(true);
        toast.info("Autenticação em dois fatores necessária. Insira o código TOTP.");
        return;
      }
      handleSuccessfulLogin(result);
    } catch (err: any) {
      toast.error(err?.message || "E-mail ou senha inválidos.");
    } finally {
      setIsLoading(false);
    }
  };

  const verification = useCodeVerification({
    verify: async (code) => {
      if (!pendingCredentials) throw new Error("Entre com e-mail e senha novamente.");
      const result = await service.authenticate(
        pendingCredentials.email,
        pendingCredentials.password,
        code,
      );
      if (result.requires2FA || !result.success) throw new Error("Código incorreto ou expirado.");
      return result;
    },
    onSuccess: handleSuccessfulLogin,
    isRejection: () => true,
    failureMessage: "Código incorreto ou expirado.",
  });

  const handleGoogleSignIn = () => {
    toast.info("Connecting with Google...", {
      description: "Authenticating with secure single sign-on.",
    });
    setValue("email", "gabriel.silva@slopay.com.br");
    setValue("password", "SenhaSegura@2026");
    setTimeout(() => {
      onSubmit({
        email: "gabriel.silva@slopay.com.br",
        password: "SenhaSegura@2026",
        rememberMe: true,
      });
    }, 600);
  };

  const nextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % TESTIMONIALS.length);
  };

  const prevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  };

  const currentTestimonial = TESTIMONIALS[activeSlide];

  const step = requires2FA ? 1 : 0;
  const testimonial = (
    <div className="rounded-xl border border-white/10 bg-background/70 p-5">
      <blockquote className="text-xl xl:text-2xl font-normal leading-[1.35] tracking-[-0.015em] text-foreground max-w-[530px] transition-opacity duration-300">
        {currentTestimonial.quote}
      </blockquote>

      <div className="mt-5 flex items-end justify-between">
        <div className="text-left">
          <div className="text-[12px] font-semibold text-foreground tracking-tight">
            {currentTestimonial.author}
          </div>
          <div className="text-[11px] font-normal text-muted-foreground mt-0.5">
            {currentTestimonial.role}{" "}
            <a
              href={currentTestimonial.companyUrl}
              className="text-foreground/90 underline underline-offset-2 hover:text-primary transition-colors cursor-pointer"
            >
              {currentTestimonial.company}
            </a>
          </div>
        </div>

        <div className="flex items-center gap-4 text-muted-foreground">
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous testimonial"
            className="p-1 text-muted-foreground/80 hover:text-foreground cursor-pointer transition-colors duration-150 active:scale-90"
          >
            <ArrowLeft className="size-4 stroke-[1.75]" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next testimonial"
            className="p-1 text-muted-foreground/80 hover:text-foreground cursor-pointer transition-colors duration-150 active:scale-90"
          >
            <ArrowRight className="size-4 stroke-[1.75]" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <AuthShell
      contentMaxWidthClass="max-w-[400px]"
      imageSrc="/images/login-hero.jpg"
      asideContent={testimonial}
      step={step}
      progress={{ steps: loginSteps, current: step }}
    >
      {requires2FA ? (
        <section className="space-y-6">
          <header className="space-y-2">
            <div aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-accent text-primary">
              <ShieldCheck className="size-4" />
            </div>
            <AuthHeading>Autenticação em 2 Fatores</AuthHeading>
            <p className="text-sm text-muted-foreground">
              Insira o código de 6 dígitos gerado no seu aplicativo autenticador para continuar
            </p>
          </header>

          <div className="space-y-4">
            <div className="space-y-2">
              <CodeSlots
                id="twoFactorCode"
                label="Código de Segurança (TOTP)"
                format="totp"
                autoFocus
                describedBy="demo-login-code-help"
                {...verification.field}
              />
              <p id="demo-login-code-help" className="text-xs text-muted-foreground">
                Abra o app Google Authenticator ou compatível
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={verification.busy}
              onClick={() => {
                setRequires2FA(false);
                verification.reset();
                setPendingCredentials(null);
              }}
              className="h-11 w-full"
            >
              Voltar ao login com senha
            </Button>
          </div>
        </section>
      ) : (
        <section className="space-y-6">
          <header className="space-y-2">
            <AuthHeading>Bem vindo ao Slopay</AuthHeading>
            <p className="text-sm text-muted-foreground">Acesse para continuar explorando</p>
          </header>

          <form method="post" onSubmit={handleSubmit(onSubmit, ({ email, password }) => {
            toast.error(email?.message || password?.message || "Confira os dados de acesso.", { id: "login-validation" });
          })} aria-busy={isLoading} className="space-y-4">
            <AuthField
              id="email"
              label="E-mail"
              type="email"
              autoComplete="email"
              {...register("email")}
              error={errors.email?.message}
              disabled={isLoading}
            />
            <AuthField
              id="password"
              label="Senha"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              {...register("password")}
              error={errors.password?.message}
              disabled={isLoading}
              endControl={(
                <AuthPasswordToggle
                  visible={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                  controls="password"
                  disabled={isLoading}
                />
              )}
            />

            <div className="flex flex-wrap items-center justify-between gap-x-3 text-sm">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 select-none">
                <Checkbox {...register("rememberMe")} />
                <span className="text-muted-foreground">Lembre de mim</span>
              </label>
              <NextLink
                href="/recuperar-acesso"
                className="inline-flex min-h-11 items-center text-primary underline-offset-4 hover:underline"
              >
                Esqueceu sua senha?
              </NextLink>
            </div>

            <AuthActionButton pending={isLoading} pendingLabel="Entrando…" className="w-full">
              Entrar
            </AuthActionButton>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Não tem uma conta?{" "}
            <NextLink
              href="/criar-conta"
              className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
            >
              Abra uma já
            </NextLink>
          </p>
        </section>
      )}
    </AuthShell>
  );
}
