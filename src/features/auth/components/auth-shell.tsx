import Link from "next/link";
import type { ReactNode } from "react";
import { AuthBrandImage, AuthFormMotion, AuthMotionSurface } from "./auth-motion";
import styles from "./auth-shell.module.css";

export const loginSteps = ["Credenciais", "Verificar acesso"];
export const accountOpeningSteps = ["Criar usuário", "Enviar solicitação", "Análise da conta"];
export const securitySetupSteps = ["Ativar autenticador", "Confirmar e-mail"];
export const recoverySteps = ["Solicitar recuperação", "Redefinir senha"];

type AuthProgress = {
  steps: readonly string[];
  current: number;
  showOnMobile?: boolean;
};

export function AuthShell({
  children,
  contentMaxWidthClass = "max-w-[360px]",
  hideLogo = false,
  progress,
  step,
  imageSrc = "/images/login-hero4.jpg",
  asideContent,
}: {
  children: ReactNode;
  contentMaxWidthClass?: string;
  hideLogo?: boolean;
  progress?: AuthProgress;
  step?: number;
  imageSrc?: string;
  asideContent?: ReactNode;
}) {
  return (
    <AuthMotionSurface className={`${styles.shell} grid min-h-dvh grid-cols-1 overflow-x-clip bg-background text-foreground lg:grid-cols-2`}>
      <div className="flex min-w-0 flex-col px-6 py-5 sm:px-8">
        {!hideLogo && (
          <Link href="/" className="inline-flex w-fit items-center gap-2 font-semibold">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" aria-hidden="true" className="size-5.5 text-primary">
              <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07" />
            </svg>
            SloPay
          </Link>
        )}
        <AuthFormMotion step={step} className={`mx-auto my-auto w-full py-8 ${contentMaxWidthClass}`}>
          {progress && progress.showOnMobile !== false && (
            <p className="mb-5 text-xs leading-relaxed text-muted-foreground lg:hidden">
              Etapa {progress.current + 1} de {progress.steps.length}{" "}
              <span className="ml-2 font-medium text-foreground">{progress.steps[progress.current]}</span>
            </p>
          )}
          {children}
        </AuthFormMotion>
      </div>
      <aside
        aria-label="Painel de autenticação do SloPay"
        className="isolate m-2 hidden h-[calc(100dvh-1rem)] min-h-80 flex-col justify-end overflow-hidden rounded-xl border border-border/50 bg-card lg:sticky lg:top-2 lg:flex lg:self-start"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <AuthBrandImage key={imageSrc} src={imageSrc} />
          <div className={`${styles.brandShade} absolute inset-0`} />
        </div>
        <div className="relative flex flex-col gap-6 p-6 xl:p-9">
          {asideContent ?? (
            <p className="max-w-md text-5xl! font-semibold leading-[1.08] tracking-tight text-foreground xl:text-4xl">
              Operações Pix em um só lugar
            </p>
          )}
          {progress && (
            <ol aria-label="Etapas da autenticação" className={`${styles.progress} grid gap-2 xl:gap-3`}>
              {progress.steps.map((label, index) => (
                <li
                  key={label}
                  aria-current={index === progress.current ? "step" : undefined}
                  className={`${styles.progressCard} flex min-h-20 flex-col items-start justify-between gap-2 rounded-xl p-3 text-xs font-medium leading-snug xl:p-4`}
                >
                  <span aria-hidden="true" className={`${styles.stepNumber} grid size-6 place-items-center rounded-full font-semibold`}>
                    {index + 1}
                  </span>
                  <span>{label}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </AuthMotionSurface>
  );
}
