import Link from "next/link";
import { ChevronRight, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { webhooksPath } from "@/features/webhooks/webhooks";
import { integrationLogsPath, integrationSecurityPath } from "../navigation";

const operations = [
  { method: "POST", path: "/charges", description: "Cria uma cobrança Pix." },
  { method: "GET", path: "/charges/{id}/qr-code", description: "Consulta o QR Code da cobrança." },
  { method: "POST", path: "/withdrawals", description: "Solicita um saque para aprovação do titular." },
] as const;

const relatedLinks = [
  { href: integrationSecurityPath, label: "Redes permitidas" },
  { href: webhooksPath, label: "Configurar webhooks" },
  { href: `${integrationLogsPath}?aba=requisicoes`, label: "Ver requisições" },
];

export function ApiKeyQuickStart({ apiOrigin, apiPath }: { apiOrigin: string; apiPath: string }) {
  const example = [`curl -i "${apiOrigin}${apiPath}/charges" \\`, '  -H "X-API-Key: $SLOPAY_API_KEY"'].join("\n");

  return (
    <section aria-labelledby="integration-quick-start" className="min-w-0">
      <Card className="@container min-w-0">
        <CardHeader className="flex-row items-center gap-3 space-y-0 border-b p-4 sm:p-6">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            <Terminal aria-hidden="true" className="size-5" />
          </div>
          <h2 id="integration-quick-start" className="text-lg font-semibold tracking-tight">Conectar uma aplicação</h2>
        </CardHeader>

        <div className="grid min-w-0 divide-y @3xl:grid-cols-2 @3xl:divide-x @3xl:divide-y-0">
          <div className="grid min-w-0 content-start gap-4 p-4 sm:p-6">
            <h3 className="text-sm font-semibold">Autenticação</h3>
            <dl className="grid min-w-0 gap-1 rounded-lg border bg-background px-3 py-2.5">
              <dt className="text-xs text-muted-foreground">Endereço da API</dt>
              <dd className="select-all wrap-anywhere font-mono text-xs leading-relaxed sm:text-sm">{apiOrigin}</dd>
            </dl>
            <p className="max-w-prose text-pretty text-sm leading-relaxed text-muted-foreground">
              Envie a chave no cabeçalho <code className="text-foreground">X-API-Key</code> a partir do servidor da aplicação.
            </p>
            <div className="min-w-0 space-y-2">
              <h4 className="text-sm font-medium">Testar a chave</h4>
              <p className="max-w-prose text-pretty text-sm text-muted-foreground">Use uma chave com permissão para consultar cobranças.</p>
              <pre className="select-all whitespace-pre-wrap wrap-anywhere rounded-lg border bg-background p-3 font-mono text-xs leading-relaxed">
                <code>{example}</code>
              </pre>
            </div>
          </div>

          <div className="min-w-0 p-4 sm:p-6">
            <h3 className="text-sm font-semibold">Operações Pix</h3>
            <dl className="mt-3 divide-y rounded-lg border">
              {operations.map(({ method, path, description }) => (
                <div key={path} className="grid min-w-0 gap-1.5 px-3 py-2.5">
                  <dt className="flex min-w-0 items-center gap-2">
                    <Badge variant={method === "GET" ? "info" : "secondary"} className="w-12 shrink-0 justify-center rounded-md px-1 font-mono text-[11px]">{method}</Badge>
                    <code className="min-w-0 wrap-anywhere text-xs">{apiPath}{path}</code>
                  </dt>
                  <dd className="text-sm text-muted-foreground">{description}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 max-w-prose text-pretty text-sm leading-relaxed text-muted-foreground">
              Ao criar cobranças ou solicitar saques, envie também <code className="text-foreground">Idempotency-Key</code> e informe o valor em centavos.
            </p>
          </div>
        </div>

        <nav aria-label="Configurações da integração" className="flex flex-wrap gap-1 border-t px-2 py-2 sm:px-4">
          {relatedLinks.map(({ href, label }) => (
            <Button asChild key={href} variant="ghost" className="min-h-11 justify-between text-primary max-sm:w-full">
              <Link href={href}>{label}<ChevronRight aria-hidden="true" /></Link>
            </Button>
          ))}
        </nav>
      </Card>
    </section>
  );
}
