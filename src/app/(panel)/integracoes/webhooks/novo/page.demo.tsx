import { DemoWebhookForm } from "@/features/webhooks/components/demo-webhook-screens";

export const metadata = {
  title: "Novo webhook",
  description: "Cadastre um endereço HTTPS para um evento da demonstração.",
};

export default function NovoWebhookPage() {
  return <DemoWebhookForm />;
}
