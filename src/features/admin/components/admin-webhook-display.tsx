import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { webhookDeliveryLabels } from "@/features/webhooks/webhook-delivery-display";
import { adminWebhookStatuses, type AdminWebhook, type AdminWebhookDelivery } from "../admin-webhooks";

export function WebhookStatus({ status }: Pick<AdminWebhook, "status">) {
  const { label, variant } = adminWebhookStatuses[status];
  return <Badge variant={variant} className="max-w-full whitespace-normal">{label}</Badge>;
}

export function DeliveryStatus({ delivery }: { delivery: AdminWebhookDelivery }) {
  const variant = delivery.state === "DELIVERED" ? "success" : delivery.state === "EXHAUSTED" ? "warning" : "secondary";
  return <Badge variant={variant} className="max-w-full whitespace-normal">
    {delivery.sending ? "Em envio" : webhookDeliveryLabels[delivery.state]}
  </Badge>;
}

export function WebhookRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-5">
          <div className="w-2/5 space-y-2">
            <Skeleton className="h-4 animate-none" /><Skeleton className="h-3 w-3/4 animate-none" />
          </div>
          <Skeleton className="h-4 w-1/5 animate-none" />
        </div>
      ))}
    </div>
  );
}
