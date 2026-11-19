import { DemoWebhooksList } from "@/features/webhooks/components/demo-webhook-screens";

export const metadata = {
  title: "Webhooks",
  description: "Gerencie endpoints de eventos na demonstração do Slopay.",
};

export default function WebhooksPage() {
  return <DemoWebhooksList />;
}
