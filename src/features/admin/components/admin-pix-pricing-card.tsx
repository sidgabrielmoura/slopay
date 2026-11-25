"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { IntegrationConfirmationDialog } from "@/features/integrations/components/integration-confirmation-dialog";
import { formatCentsToBrl } from "@/lib/money";
import { toast } from "sonner";
import { adminPixPricing, maxFixedPixFee, maxMonthlyPix, pixPricingTerms,
  type PixPricingDraft, type PixPricingView } from "../admin-pix-pricing";
import { retryAdminRead } from "../admin-query";
import { CompanyReadError } from "./company-display";

const sourceLabels = { NONE: "Sem regra", DEFAULT: "Padrão atribuído", CUSTOM: "Regra individual" } as const;
const percentageFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 });

export function AdminPixPricingCard({ adminId, companyId }: { adminId: string; companyId?: string }) {
  const client = useQueryClient();
  const key = ["admin-pix-pricing", adminId, companyId ?? "default"] as const;
  const result = useQuery({
    queryKey: key, queryFn: ({ signal }) => adminPixPricing.read(companyId, signal), retry: retryAdminRead,
  });
  return (
    <Card className="min-w-0">
      <CardHeader className="gap-2 p-5 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">Tarifa Pix do Slopay</h2>
          {companyId && result.data && <Badge variant="secondary">{sourceLabels[result.data.source]}</Badge>}
        </div>
        <CardDescription className="max-w-prose text-pretty">
          {companyId ? "A regra desta conta vale para cobranças emitidas após a alteração."
            : "O padrão é atribuído a novas contas e às contas sem regra. As regras já atribuídas são preservadas."}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <SkeletonReveal flow revealed={!result.isPending} skeleton={<Skeleton className="h-32 animate-none" />}>
          {result.isError ? <CompanyReadError title="Tarifa indisponível" retry={() => void result.refetch()} />
            : result.data && <PixPricingForm key={result.data.version} view={result.data} companyId={companyId}
              onSaved={() => {
                void client.invalidateQueries({ queryKey: companyId ? key : ["admin-pix-pricing", adminId] });
                void client.invalidateQueries({ queryKey: ["admin-audit", adminId] });
              }} />}
        </SkeletonReveal>
      </CardContent>
    </Card>
  );
}

function PixPricingForm({ view, companyId, onSaved }: { view: PixPricingView; companyId?: string; onSaved: () => void }) {
  const id = useId();
  const review = useRef<HTMLButtonElement>(null);
  const [fixedCents, setFixed] = useState(view.fixedCents);
  const [minimumCents, setMinimum] = useState(view.minimumCents);
  const [percent, setPercent] = useState(view.percentageUnits ? percentageFormat.format(view.percentageUnits / 10_000) : "");
  const [free, setFree] = useState(String(view.monthlyFreePix));
  const [draft, setDraft] = useState<PixPricingDraft | null>(null);
  const saved = useRef(false);
  const percentageUnits = Math.round(Number(percent.replace(",", ".")) * 10_000);

  function preview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const terms = { fixedCents, minimumCents, percentageUnits, monthlyFreePix: Number(free), version: view.version };
    const parsed = pixPricingTerms.safeParse(terms);
    if (!parsed.success) {
      toast.error("Confira a tarifa e a franquia mensal.");
      return;
    }
    setDraft(parsed.data);
  }

  return (
    <>
      <form onSubmit={preview} className="grid min-w-0 gap-4">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          <div className="grid min-w-0 content-start gap-2">
            <label className="text-sm font-medium" htmlFor={id + "-fixed"}>Valor fixo por Pix</label>
            <CurrencyInput id={id + "-fixed"} valueInCents={fixedCents} onValueChange={setFixed} maxInCents={maxFixedPixFee} />
          </div>
          <div className="grid min-w-0 content-start gap-2">
            <label className="text-sm font-medium" htmlFor={id + "-percentage"}>Percentual sobre o valor bruto</label>
            <div className="relative">
              <Input id={id + "-percentage"} type="text" inputMode="decimal" placeholder="0" className="h-11 pr-10 tabular-nums"
                value={percent} onChange={(event) => { if (/^\d{0,3}(?:[.,]\d{0,4})?$/.test(event.target.value)) setPercent(event.target.value); }} />
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-muted-foreground">%</span>
            </div>
          </div>
          <div className="grid min-w-0 content-start gap-2">
            <label className="text-sm font-medium" htmlFor={id + "-minimum"}>Tarifa mínima por Pix</label>
            <CurrencyInput id={id + "-minimum"} valueInCents={minimumCents} onValueChange={setMinimum} maxInCents={maxFixedPixFee} />
          </div>
          <div className="grid min-w-0 content-start gap-2">
            <label className="text-sm font-medium" htmlFor={id + "-free"}>Pix sem tarifa por mês</label>
            <Input id={id + "-free"} className="h-11 tabular-nums" type="text" inputMode="numeric" value={free}
              onChange={(event) => { if (/^\d{0,7}$/.test(event.target.value) && Number(event.target.value) <= maxMonthlyPix) setFree(event.target.value); }} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Fora da franquia, vale o maior valor entre a tarifa mínima e a soma do valor fixo com o percentual. A tarifa do provedor é cobrada à parte.
        </p>
        <Button ref={review} type="submit" variant="outline" className="h-11 justify-self-start">Revisar tarifa</Button>
      </form>
      {draft && <IntegrationConfirmationDialog
        scope={`slopay-pix-pricing:${companyId ?? "default"}:${JSON.stringify(draft)}`}
        title="Confirmar tarifa Pix" description="Confira a regra e confirme sua identidade para salvar."
        completed="Tarifa registrada" options={() => adminPixPricing.options(companyId, draft)}
        apply={(proof) => adminPixPricing.save(companyId, draft, proof)}
        onSuccess={() => { saved.current = true; }}
        onClose={() => {
          setDraft(null);
          if (saved.current) {
            saved.current = false;
            onSaved();
          }
        }}
        restoreFocus={() => review.current?.focus()}
        preventOutsideClose
      >
        <div className="grid min-w-0 gap-2 rounded-lg border border-border bg-background p-4 text-sm">
          <p><strong>{formatCentsToBrl(draft.fixedCents)} + {percentageFormat.format(draft.percentageUnits / 10_000)}%</strong> do valor bruto por Pix</p>
          {Boolean(draft.minimumCents) && <p>Tarifa mínima de {formatCentsToBrl(draft.minimumCents ?? 0)} por Pix fora da franquia</p>}
          <p>{draft.monthlyFreePix} Pix sem tarifa por mês</p>
        </div>
      </IntegrationConfirmationDialog>}
    </>
  );
}
