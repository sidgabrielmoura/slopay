"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingConfirmation, LoadingIndicator, OperationFailure } from "@/components/ui/loading-indicator";
import { ownerAccountOpening } from "../owner-account-opening";

const headings = {
  UNDER_REVIEW: "Cadastro em análise",
  CHANGES_REQUESTED: "Seu cadastro precisa de ajustes",
  RESUBMITTED: "Cadastro reenviado",
  REJECTED: "Vinculação recusada",
};

export function OwnerAccountOpeningNotice({ merchantId }: { merchantId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ["owner-account-opening", merchantId];
  const query = useQuery({
    queryKey, queryFn: ({ signal }) => ownerAccountOpening.get(signal), staleTime: 10_000, refetchInterval: 20_000, retry: false,
  });
  const resubmit = useMutation({
    mutationFn: ownerAccountOpening.resubmit,
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey }); },
  });
  const review = query.data?.review;
  if (!review) return null;
  return (
    <Card className="grid min-w-0 gap-3 p-5" aria-labelledby="owner-account-opening-title">
      <div className="flex min-w-0 items-center gap-3">
        {review.status === "RESUBMITTED" && resubmit.isSuccess && resubmit.variables === review.version - 1 && <LoadingConfirmation size={32} animate />}
        <h2 id="owner-account-opening-title" className="text-balance text-base font-semibold">{headings[review.status]}</h2>
      </div>
      <p className="wrap-anywhere whitespace-pre-wrap text-pretty text-sm text-muted-foreground">
        {review.reason ?? (review.status === "RESUBMITTED" ? "A equipe recebeu seu pedido de nova análise." : "A equipe está avaliando os dados do titular.")}
      </p>
      {review.status === "CHANGES_REQUESTED" && (
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-11"><Link href="/conta/perfil">Consultar perfil</Link></Button>
          <Button type="button" className="h-11" disabled={resubmit.isPending || (resubmit.isSuccess && resubmit.variables === review.version)}
            onClick={() => resubmit.mutate(review.version)}>
            {resubmit.isPending && <LoadingIndicator />}{resubmit.isPending ? "Reenviando…" : "Pedir nova análise"}
          </Button>
        </div>
      )}
      {resubmit.isError && resubmit.variables === review.version && <OperationFailure message={resubmit.error.message} />}
    </Card>
  );
}
