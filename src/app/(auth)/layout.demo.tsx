"use client";

import { DemoProvider } from "@/providers/demo-provider";
import { AuthRouteMotion } from "@/features/auth/components/auth-motion";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      <AuthRouteMotion>{children}</AuthRouteMotion>
    </DemoProvider>
  );
}
