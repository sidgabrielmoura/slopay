import { WebhookFormScreen } from "@/features/webhooks/components/webhook-form-screen";

export const metadata = {
  title: "Novo Endpoint de Webhook · SloPay",
  description: "Cadastre um novo endpoint HTTP para notificações Pix.",
};

export default function NovoWebhookPage() {
  return <WebhookFormScreen />;
}
