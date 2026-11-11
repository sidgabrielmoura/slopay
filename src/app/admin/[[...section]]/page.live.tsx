import { LivePanel } from "@/features/auth/components/live-panel";
import { requireSession } from "@/lib/server/session";

export default async function AdminPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section = [] } = await params;
  const returnTo = ["/admin", ...section.map(encodeURIComponent)].join("/");
  await requireSession(returnTo, { admin: true });
  return (
    <LivePanel
      title="Administração"
      message="As operações administrativas aguardam a homologação dos serviços do backend."
    />
  );
}
