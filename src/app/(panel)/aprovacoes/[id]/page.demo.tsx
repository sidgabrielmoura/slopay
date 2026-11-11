import { ApprovalDetailScreen } from "@/features/approvals/components/approval-detail-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Detalhe da Aprovação",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ApprovalDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <ApprovalDetailScreen approvalId={id} />;
}
