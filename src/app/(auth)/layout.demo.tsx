"use client";

import { DemoProvider } from "@/providers/demo-provider";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <DemoProvider>{children}</DemoProvider>;
}
