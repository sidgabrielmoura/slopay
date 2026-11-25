"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ToastNotice } from "@/components/ui/toast-notice";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { asaasPixLimitsHelp, pixConditionsSchema, pixConditionsUnavailable } from "../pix-conditions";
import type { z } from "zod";
import { PixConditionsLayout, PixTermsList, PixTermsLoading, StatementFeesLink } from "./pix-conditions-layout";
import { PixFeeCards } from "./pix-fee-cards";

type PixTerms = Exclude<z.infer<typeof pixConditionsSchema>, { environment: null }>;

export function LiveTaxesAndLimitsScreen({ merchantId }: { merchantId: string }) {
  const development = useDevelopmentFeatures();
  const report = useQuery({
    queryKey: ["pix-conditions", merchantId],
    queryFn: ({ signal }) => requestPixGateway("/api/payments/pix/conditions", pixConditionsSchema, pixConditionsUnavailable, { signal }),
    retry: false,
    staleTime: 60_000,
  });
  const conditions = report.data?.environment === (development ? "sandbox" : "live") ? report.data : null;
  const fallback = report.isPending ? <PixTermsLoading /> : (
    <Card className="grid min-h-36 content-center justify-items-start gap-2 p-5">
      <h2 className="text-balance text-base font-semibold">{report.isError ? "Consulta indisponível" : "Operações Pix indisponíveis"}</h2>
      {report.isError ? (
        <Button type="button" variant="outline" className="h-11" disabled={report.isFetching} onClick={() => void report.refetch()}>
          Tentar novamente
        </Button>
      ) : (
        <p className="text-pretty text-sm text-muted-foreground">As condições aparecem quando o Pix está disponível para a conta.</p>
      )}
    </Card>
  );

  return (
    <>
      <ToastNotice message={report.isError ? pixConditionsUnavailable : null} />
      <PixConditionsLayout
        source={conditions?.environment === "sandbox" ? "Sandbox" : undefined}
        checkedAt={conditions?.checkedAt}
        fees={conditions ? <><PixFeeCards data={conditions.fees} /><StatementFeesLink /></> : fallback}
        limits={conditions ? <AccountLimits data={conditions} /> : fallback}
        refresh={{ busy: report.isFetching, run: () => void report.refetch() }}
      />
    </>
  );
}

function AccountLimits({ data }: { data: PixTerms }) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader className="space-y-1 p-5 pb-3">
            <h2 className="text-balance text-lg font-semibold">Limites do Slopay</h2>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <PixTermsList terms={[
              ["Valor mínimo por cobrança Pix", <PanelAmount cents={data.minimumChargeInCents} />],
              ...(data.batchLimits ? [[
                "Transferências por lote", data.batchLimits.minimum + " a " + data.batchLimits.maximum + " Pix",
              ] as const] : []),
            ]} />
          </CardContent>
        </Card>
        {data.batchLimits && (
          <Card className="min-w-0">
            <CardHeader className="p-5 pb-3"><h2 className="text-balance text-lg font-semibold">Saldo disponível</h2></CardHeader>
            <CardContent className="px-5 pb-5">
              {data.availableBalanceInCents === null ? (
                <p className="text-sm text-muted-foreground">Saldo indisponível na consulta atual.</p>
              ) : (
                <>
                  <p className="wrap-break-word text-2xl font-semibold tabular-nums"><PanelAmount cents={data.availableBalanceInCents} /></p>
                  <p className="mt-1 text-sm text-muted-foreground">{data.environment === "sandbox" ? "Saldo da carteira de teste." : "Saldo disponível do titular."}</p>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      {data.environment === "sandbox" && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5">
        <div className="space-y-1">
          <h2 className="text-balance text-base font-semibold">Limites da conta do provedor</h2>
          <p className="text-pretty text-sm text-muted-foreground">
            Consulte os valores diurnos e noturnos por período e por transação em Pix → Meus limites.
          </p>
        </div>
        <Button asChild variant="outline" className="h-11">
          <a href={asaasPixLimitsHelp} target="_blank" rel="noreferrer">Como consultar <ArrowUpRight aria-hidden="true" /></a>
        </Button>
      </div>}
    </>
  );
}
