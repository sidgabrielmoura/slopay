import type { Metadata } from "next";
import { MobileDocumentCapture } from "@/features/account-validation/components/mobile-document-capture";

export const metadata: Metadata = {
  title: "Fotografar documento",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function CaptureDocumentsPage({ searchParams }: {
  searchParams: Promise<{ origem?: string | string[] }>;
}) {
  const { origem } = await searchParams;
  return <MobileDocumentCapture returnToApplication={origem === "cadastro"} />;
}
