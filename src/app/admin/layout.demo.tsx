import type { Metadata } from "next";
import { AdminDemoShell } from "@/features/admin/components/layout/admin-demo-shell";

export const metadata: Metadata = {
  title: "Superadmin · SloPay Pix",
  description: "Console central de governança, credenciamento e tesouraria do SloPay.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminDemoShell>{children}</AdminDemoShell>;
}
