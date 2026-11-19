"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime } from "@/lib/dates";

const tabClass = "h-11 rounded-none border-b-2 border-b-transparent! px-1 focus-visible:ring-inset data-[state=active]:border-b-primary! data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none";

export function PixConditionsLayout({ source, checkedAt, fees, limits, refresh }: {
  source?: string;
  checkedAt?: string | null;
  fees: ReactNode;
  limits: ReactNode;
  refresh: { busy: boolean; run: () => void };
}) {
  const search = useSearchParams();
  const tab = search.get("aba") === "limites" ? "limites" : "taxas";
  function changeTab(value: string) {
    const next = new URLSearchParams(search.toString());
    next.set("aba", value);
    window.history.pushState(null, "", "?" + next.toString());
  }

  return (
    <div className="grid min-w-0 gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-balance text-2xl font-semibold sm:text-3xl">Taxas e limites</h1>
            {source && <Badge variant="secondary">{source}</Badge>}
          </div>
          <p className="text-pretty text-sm text-muted-foreground">Consulte os custos e as condições para movimentar Pix.</p>
        </div>
        <div className="flex items-center gap-2">
          {checkedAt && (
            <span className="text-xs text-muted-foreground tabular-nums">
              Última consulta <time dateTime={checkedAt}>{formatDateTime(checkedAt, "short")}</time>
            </span>
          )}
          <Button type="button" size="icon" variant="outline" className="size-11"
            aria-label="Atualizar taxas e limites" title="Atualizar taxas e limites"
            disabled={refresh.busy} onClick={refresh.run}>
            <RotateCw aria-hidden="true" />
          </Button>
        </div>
      </header>

      <Tabs value={tab} onValueChange={changeTab}>
        <div className="border-b border-border">
          <TabsList aria-label="Condições Pix" className="h-auto gap-5 rounded-none bg-transparent p-0">
            <TabsTrigger value="taxas" className={tabClass}>Taxas</TabsTrigger>
            <TabsTrigger value="limites" className={tabClass}>Limites</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="taxas" className="mt-4">
          <div className="grid gap-4">{fees}</div>
        </TabsContent>
        <TabsContent value="limites" className="mt-4">
          <div className="grid gap-4">{limits}</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

type Term = readonly [label: string, value: ReactNode];

export function PixTermsList({ terms }: { terms: readonly Term[] }) {
  return (
    <dl className="divide-y divide-border">
      {terms.map(([label, value]) => (
        <div key={label} className="flex min-h-11 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="text-right text-sm font-semibold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PixFeeCard({ direction, terms }: { direction: "receive" | "withdraw"; terms: Term[] }) {
  const Icon = direction === "receive" ? ArrowDownLeft : ArrowUpRight;
  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row items-center gap-3 space-y-0 p-5 pb-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-balance text-lg font-semibold">{direction === "receive" ? "Recebimento Pix" : "Saque Pix"}</h2>
          <p className="text-sm text-muted-foreground">{direction === "receive" ? "Cobranças emitidas no Slopay" : "Transferências para uma chave Pix"}</p>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        {terms.length ? <PixTermsList terms={terms} /> : (
          <p className="border-t border-border py-3 text-sm text-muted-foreground">Tarifa indisponível na consulta atual.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function PixTermsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
      <span role="status" className="sr-only">Carregando taxas e limites</span>
      <Skeleton className="h-44 motion-reduce:animate-none" />
      <Skeleton className="h-44 motion-reduce:animate-none" />
    </div>
  );
}

export function StatementFeesLink() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-border bg-card px-5 py-3">
      <p className="text-pretty text-sm text-muted-foreground">O extrato mostra as tarifas registradas em cada Pix.</p>
      <Button asChild variant="ghost" className="h-11 px-2">
        <Link href="/movimentacoes" prefetch={false}>Ver movimentações <ArrowUpRight aria-hidden="true" /></Link>
      </Button>
    </div>
  );
}
