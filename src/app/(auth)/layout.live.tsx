import type { ReactNode } from "react";
import { AuthRouteMotion } from "@/features/auth/components/auth-motion";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthRouteMotion>{children}</AuthRouteMotion>;
}
