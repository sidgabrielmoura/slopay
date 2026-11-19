import { Empty } from "@/components/ui/empty";

export function OperationalDataUnavailable({ title = "Consulta indisponível", description = "Os dados estarão disponíveis quando a integração estiver ativa." }: {
  title?: string;
  description?: string;
}) {
  return <Empty title={title} description={description} className="min-h-44 animate-none rounded-none border-0" />;
}
