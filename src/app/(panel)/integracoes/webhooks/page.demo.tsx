import { WebhooksListScreen } from "@/features/webhooks/components/webhooks-list-screen";

export const metadata = {
  title: "Webhooks & Notificações HTTP · SloPay",
  description: "Gerencie endpoints de notificação em tempo real para eventos Pix.",
};

export default function WebhooksPage() {
  return <WebhooksListScreen />;
}
