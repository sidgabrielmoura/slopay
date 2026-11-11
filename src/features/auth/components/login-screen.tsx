"use client";

import React, { useState } from "react";
import NextLink from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Eye, EyeOff, AlertCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGatewayService } from "@/providers/demo-provider";
import { sessionService } from "@/services/session.service";

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
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
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
    setIsLoading(true);
    setAuthError(null);
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
      setAuthError(err?.message || "Email ou senha inválidos.");
      toast.error(err?.message || "Falha na autenticação. Verifique suas credenciais.");
    } finally {
      setIsLoading(false);
    }
  };

  const on2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingCredentials) return;
    const cleanCode = twoFactorCode.replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      toast.error("O código de autenticação deve conter 6 dígitos numéricos.");
      return;
    }
    setIsLoading(true);
    setAuthError(null);
    try {
      const result = await service.authenticate(
        pendingCredentials.email,
        pendingCredentials.password,
        cleanCode
      );
      handleSuccessfulLogin(result);
    } catch (err: any) {
      setAuthError(err?.message || "Código 2FA incorreto ou expirado.");
      toast.error(err?.message || "Código incorreto. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="w-screen h-screen min-h-screen overflow-x-hidden lg:overflow-hidden bg-background text-foreground flex flex-col lg:flex-row select-none">
      <div className="w-full lg:w-1/2 h-full flex flex-col justify-between relative py-5 px-6 sm:px-8 lg:py-0 lg:px-0">
        <div className="lg:absolute lg:top-[18px] lg:left-[24px] z-10">
          <NextLink
            href="/"
            className="inline-flex items-center gap-2 text-foreground group transition-opacity hover:opacity-90"
          >
            <svg
              className="w-[22px] h-[22px] text-primary shrink-0 transition-transform duration-300 group-hover:rotate-12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="2" x2="12" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              <line x1="4.93" y1="19.07" x2="19.07" y2="4.93" />
            </svg>
            <span className="font-semibold text-[15px] leading-[20px] tracking-tight text-foreground">
              Slopay
            </span>
          </NextLink>
        </div>

        <div className="w-full max-w-[400px] mx-auto my-auto py-8 lg:py-0 flex flex-col justify-center">
          {requires2FA ? (
            <div className="w-full">
              <div className="text-left mb-5">
                <div className="size-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
                  <ShieldCheck className="size-4" />
                </div>
                <h1 className="text-[21px] font-semibold text-foreground tracking-[-0.02em] leading-[28px]">
                  Autenticação em 2 Fatores
                </h1>
                <p className="text-[13px] font-normal text-muted-foreground leading-[19px] mt-[3px]">
                  Insira o código de 6 dígitos gerado no seu aplicativo autenticador para continuar
                </p>
              </div>

              {authError && (
                <div
                  role="alert"
                  className="mb-4 p-2.5 rounded-[6px] bg-destructive/10 border border-destructive/20 text-destructive text-[11px] flex items-center gap-2"
                >
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span className="leading-tight">{authError}</span>
                </div>
              )}

              <form onSubmit={on2FASubmit} className="w-full space-y-4">
                <div>
                  <label
                    htmlFor="twoFactorCode"
                    className="block text-[11px] font-medium text-foreground leading-4 mb-[6px] text-left"
                  >
                    Código de Segurança (TOTP)
                  </label>
                  <input
                    id="twoFactorCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    autoFocus
                    required
                    disabled={isLoading}
                    className="w-full h-[42px] px-3 rounded-[6px] border border-border bg-card/40 text-center font-mono text-[18px] tracking-[0.25em] text-foreground placeholder:text-muted-foreground/30 transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1 text-center">
                    Abra o app Google Authenticator ou compatível
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={twoFactorCode.length !== 6 || isLoading}
                  className="w-full h-[38px] rounded-[6px] bg-primary text-primary-foreground font-semibold text-[12px] hover:bg-primary/90 active:scale-[0.99] transition-all duration-150 cursor-pointer flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Verificando..." : "Confirmar e Entrar"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRequires2FA(false);
                    setTwoFactorCode("");
                    setAuthError(null);
                  }}
                  className="w-full h-[36px] rounded-[6px] border border-border bg-card/40 text-[11px] text-muted-foreground hover:text-foreground hover:bg-card/70 transition-colors flex items-center justify-center cursor-pointer"
                >
                  Voltar ao login com senha
                </button>
              </form>
            </div>
          ) : (
            <>
              <div className="text-left">
                <h1 className="text-[21px] font-semibold text-foreground tracking-[-0.02em] leading-[28px]">
                  Bem vindo ao Slopay
                </h1>
                <p className="text-[13px] font-normal text-muted-foreground leading-[19px] mt-[3px]">
                  Acesse para continuar explorando
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="w-full">
                {authError && (
                  <div
                    role="alert"
                    className="mb-4 p-2.5 rounded-[6px] bg-destructive/10 border border-destructive/20 text-destructive text-[11px] flex items-center gap-2"
                  >
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span className="leading-tight">{authError}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="email"
                    className="block text-[11px] font-medium text-foreground leading-4 mb-[6px] text-left"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="example@example.com"
                    {...register("email")}
                    className={`w-full h-[38px] px-3 rounded-[6px] border bg-card/40 text-[12px] text-foreground placeholder:text-muted-foreground/50 transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring ${errors.email ? "border-destructive focus:ring-destructive" : "border-border"
                      }`}
                    disabled={isLoading}
                  />
                  {errors.email && (
                    <p className="text-[10px] text-destructive mt-1 text-left">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="mt-[18px]">
                  <label
                    htmlFor="password"
                    className="block text-[11px] font-medium text-foreground leading-4 mb-[6px] text-left"
                  >
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter password"
                      {...register("password")}
                      className={`w-full h-[38px] px-3 pr-9 rounded-[6px] border bg-card/40 text-[12px] text-foreground placeholder:text-muted-foreground/50 transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring ${errors.password ? "border-destructive focus:ring-destructive" : "border-border"
                        }`}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground p-1 transition-colors cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[10px] text-destructive mt-1 text-left">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between w-full mt-3.5 h-[18px]">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      {...register("rememberMe")}
                      className="size-4 rounded-[3px] border border-border bg-card/60 text-primary accent-primary cursor-pointer focus:ring-0"
                    />
                    <span className="text-[11px] font-normal text-muted-foreground hover:text-foreground transition-colors">
                      Lembre de mim
                    </span>
                  </label>

                  <NextLink
                    href="/recuperar-acesso"
                    className="text-[11px] font-normal text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer transition-colors"
                  >
                    Esqueceu sua senha?
                  </NextLink>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-[38px] mt-5 rounded-[6px] bg-primary text-primary-foreground font-semibold text-[12px] hover:bg-primary/90 active:scale-[0.99] transition-all duration-150 cursor-pointer flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Entrando..." : "Entrar"}
                </button>
              </form>

              <div className="w-full text-center mt-4">
                <p className="text-[11px] font-normal text-muted-foreground">
                  Não tem uma conta?{" "}
                  <NextLink
                    href="/criar-conta"
                    className="font-medium text-foreground underline underline-offset-2 hover:text-primary transition-colors cursor-pointer"
                  >
                    Abra uma já
                  </NextLink>
                </p>
              </div>
            </>
          )}
        </div>

        <div className="lg:h-6 hidden lg:block" />
      </div>

      <div className="hidden lg:flex lg:w-1/2 h-full p-1.5 pl-0">
        <div className="relative w-full h-full rounded-[12px] overflow-hidden bg-card border border-border/20 shadow-lg">
          <Image
            src="/images/login-hero.jpg"
            alt="Cinematic atmospheric landscape with horizon skyline"
            fill
            priority
            sizes="50vw"
            className="object-cover object-center pointer-events-none"
          />

          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, transparent 38%, rgba(17, 20, 23, 0.35) 60%, rgba(17, 20, 23, 0.78) 82%, rgba(17, 20, 23, 0.94) 100%)",
            }}
          />

          <div className="absolute inset-x-5 bottom-5 rounded-[10px] p-[22px] bg-[rgba(25,29,34,0.52)] backdrop-blur-[16px] border border-white/[0.08] shadow-2xl transition-all duration-300">
            <blockquote className="text-[22px] xl:text-[23px] font-normal leading-[1.35] tracking-[-0.015em] text-foreground max-w-[530px] transition-opacity duration-300">
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
        </div>
      </div>
    </div>
  );
}
