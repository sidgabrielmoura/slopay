import { WebhookFormScreen } from "@/features/webhooks/components/webhook-form-screen";

export const metadata = {
  title: "Editar Webhook · SloPay",
  description: "Atualize os parâmetros do endpoint de webhook.",
};

interface EditWebhookPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditWebhookPage({ params }: EditWebhookPageProps) {
  const { id } = await params;
  return <WebhookFormScreen webhookId={id} />;
}
