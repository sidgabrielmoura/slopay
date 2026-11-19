"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useState } from "react";
import { Asterisk, ImageOff } from "lucide-react";
import { ImageLoadingSurface } from "@/components/ui/image-loading";
import { AuthFormMotion, AuthMotionSurface } from "@/features/auth/components/auth-motion";
import { accountOpeningSteps } from "../account-opening-application";
import styles from "./account-opening.module.css";

const illustrations = ["account-type", "identity", "address", "review", "tracking"];

function OpeningIllustration({ name }: { name: string }) {
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  return (
    <ImageLoadingSurface state={state} className={styles.image}
      fallback={<ImageOff size={26} className="text-muted-foreground" />}>
      <Image src={`/images/onboarding/${name}.webp`} alt="" fill unoptimized
        loading="eager" sizes="(min-width: 1024px) 48vw, (min-width: 640px) 540px, 100vw"
        className="object-cover" onLoad={() => setState("ready")} onError={() => setState("error")} />
    </ImageLoadingSurface>
  );
}

export function AccountOpeningLayout({ step, action, children }: { step: number; action?: ReactNode; children: ReactNode }) {
  const illustration = illustrations[step - 1];
  return (
    <AuthMotionSurface className={`${styles.shell} min-h-dvh bg-background text-foreground`}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <span className="inline-flex items-center gap-1.5 text-lg font-semibold tracking-tight">
            <Asterisk aria-hidden="true" className="size-6 text-primary" strokeWidth={2.5} />
            SloPay
          </span>
          {action}
        </header>
        <div className={styles.workspace}>
          <div className={styles.illustration} aria-hidden="true">
            <OpeningIllustration key={illustration} name={illustration} />
          </div>
          <div className={styles.panel}>
            {step <= accountOpeningSteps.length && (
              <div className={styles.progress}>
                <p className="flex flex-wrap justify-between gap-x-3 text-xs font-medium text-muted-foreground">
                  <span>Etapa {step} de {accountOpeningSteps.length}</span>
                  <span className="text-foreground">{accountOpeningSteps[step - 1]}</span>
                </p>
                <ol className={styles.progressTrack} aria-label="Etapas da abertura de conta">
                  {accountOpeningSteps.map((label, index) => (
                    <li key={label} aria-current={step === index + 1 ? "step" : undefined}
                      data-complete={step >= index + 1}>
                      <span className="sr-only">{label}{step > index + 1 ? ", concluída" : ""}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <AuthFormMotion step={step} animateOnMount={false}>{children}</AuthFormMotion>
          </div>
        </div>
      </div>
    </AuthMotionSurface>
  );
}
