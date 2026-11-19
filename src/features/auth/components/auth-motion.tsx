"use client";

import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ImageLoadingSurface } from "@/components/ui/image-loading";
import { usePreferences } from "@/providers/preferences-provider";
import styles from "./auth-shell.module.css";

type Direction = "enter" | "forward" | "back";

const routeOrder: Readonly<Partial<Record<string, number>>> = {
  "/entrar": 0,
  "/criar-conta": 1,
  "/verificar-acesso": 1,
  "/recuperar-acesso": 1,
  "/reset-password": 2,
  "/redefinir-senha": 2,
  "/conta/seguranca": 2,
  "/verify-email": 3,
  "/verificar-email": 3,
  "/conta-em-validacao": 4,
};

const RouteDirection = createContext<Direction>("enter");

export function AuthMotionSurface({ children, className }: { children: ReactNode; className: string }) {
  const { preferencesReady, reduceMotion } = usePreferences();

  return (
    <main className={className} data-auth-motion-ready={preferencesReady && !reduceMotion ? "" : undefined}>
      {children}
    </main>
  );
}

export function AuthBrandImage({ src }: { src: string }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  return (
    <ImageLoadingSurface className="absolute inset-0" state={state}>
      <Image src={src} alt="" fill loading="eager" sizes="(min-width: 1024px) 50vw, 1px" className="object-cover"
        onLoad={() => setState("ready")} onError={() => setState("error")} />
    </ImageLoadingSurface>
  );
}

export function AuthRouteMotion({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [route, setRoute] = useState<{ pathname: string; direction: Direction }>({
    pathname,
    direction: "enter",
  });

  if (pathname !== route.pathname) {
    const previous = routeOrder[route.pathname];
    const current = routeOrder[pathname];
    const direction = previous === undefined || current === undefined || previous === current
      ? "enter"
      : current > previous ? "forward" : "back";
    setRoute({ pathname, direction });
  }

  return <RouteDirection.Provider value={route.direction}>{children}</RouteDirection.Provider>;
}

export function AuthFormMotion({
  children,
  className,
  step = 0,
  animateOnMount = true,
}: {
  children: ReactNode;
  className?: string;
  step?: number;
  animateOnMount?: boolean;
}) {
  const routeDirection = useContext(RouteDirection);
  const panel = useRef<HTMLDivElement>(null);
  const [motion, setMotion] = useState<{ step: number; direction: Direction | null }>({
    step,
    direction: null,
  });

  if (step !== motion.step) {
    setMotion({ step, direction: step > motion.step ? "forward" : "back" });
  }

  useLayoutEffect(() => {
    if (motion.direction && panel.current && !panel.current.contains(document.activeElement)) {
      panel.current.focus({ preventScroll: true });
    }
  }, [motion]);

  return (
    <div
      key={step}
      ref={panel}
      tabIndex={-1}
      className={`${styles.formMotion}${className ? ` ${className}` : ""}`}
      data-auth-motion={motion.direction ?? (animateOnMount ? routeDirection : undefined)}
    >
      {children}
    </div>
  );
}
