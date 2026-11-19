import { DemoWebhookForm } from "@/features/webhooks/components/demo-webhook-screens";

export const metadata = {
  title: "Webhook",
  description: "Consulte a configuração de um webhook da demonstração.",
};

interface EditWebhookPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditWebhookPage({ params }: EditWebhookPageProps) {
  const { id } = await params;
  return <DemoWebhookForm webhookId={id} />;
}
