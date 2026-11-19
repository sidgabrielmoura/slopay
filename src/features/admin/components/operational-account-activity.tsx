"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/dates";
import { adminOperationalAccounts, type OperationalKey } from "../admin-operational-accounts";
import { retryAdminRead } from "../admin-query";
import { AdminRecordActivity } from "./admin-company-activity";

type Props = { adminId: string; accountId: string };
const keyTypes = { CPF: "CPF", CNPJ: "CNPJ", EMAIL: "E-mail", PHONE: "Telefone", EVP: "Chave aleatória" };
const keyStates = {
  ACTIVE: ["Ativa", "success"],
  AWAITING_ACTIVATION: ["Aguardando ativação", "warning"],
  AWAITING_DELETION: ["Remoção pendente", "warning"],
  AWAITING_ACCOUNT_DELETION: ["Remoção pendente", "warning"],
  ERROR: ["Erro", "destructive"],
} as const;

export function OperationalAccountKeys({ adminId, accountId }: Props) {
  const [page, setPage] = useState(1);
  const result = useQuery({
    queryKey: ["admin-operational-account-keys", adminId, accountId, page],
    queryFn: ({ signal }) => adminOperationalAccounts.keys(accountId, page, signal),
    staleTime: 15_000, placeholderData: keepPreviousData, retry: retryAdminRead,
  });
  return (
    <AdminRecordActivity title="Chaves Pix" paginationLabel="Paginação das chaves Pix" pagination={result.data?.pagination}
      pending={result.isPending} busy={result.isPlaceholderData} error={result.error}
      retry={() => void result.refetch()} onPage={setPage}>
      {result.data?.checkedAt ? (
        <>
          <p className="px-5 pt-4 pb-1 text-xs tabular-nums text-muted-foreground">Consulta de {formatDateTime(result.data.checkedAt, "medium")}</p>
          {result.data.items.length > 0
            ? <ul className="divide-y divide-border" aria-label="Chaves Pix da carteira">
                {result.data.items.map((key) => <KeyRow key={key.id} entry={key} />)}
              </ul>
            : <p className="p-5 text-pretty text-sm text-muted-foreground">A consulta retornou uma carteira sem chaves Pix cadastradas.</p>}
        </>
      ) : <p className="p-5 text-pretty text-sm text-muted-foreground">Use Atualizar dados do Asaas para consultar as chaves desta carteira.</p>}
    </AdminRecordActivity>
  );
}

function KeyRow({ entry }: { entry: OperationalKey }) {
  const [label, variant] = keyStates[entry.status];
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{keyTypes[entry.type]}</p>
        <p className="mt-0.5 wrap-anywhere font-mono text-xs text-muted-foreground">{entry.maskedKey ?? "Identificação indisponível"}</p>
      </div>
      <Badge variant={variant}>{label}</Badge>
    </li>
  );
}

export function OperationalAccountAudit({ adminId, accountId }: Props) {
  const [page, setPage] = useState(1);
  const result = useQuery({
    queryKey: ["admin-operational-account-audit", adminId, accountId, page],
    queryFn: ({ signal }) => adminOperationalAccounts.audit(accountId, page, signal),
    staleTime: 15_000, placeholderData: keepPreviousData, retry: retryAdminRead,
  });
  return (
    <AdminRecordActivity title="Auditoria operacional" paginationLabel="Paginação da auditoria operacional" pagination={result.data?.pagination}
      pending={result.isPending} busy={result.isPlaceholderData} error={result.error}
      retry={() => void result.refetch()} onPage={setPage}>
      {result.data?.items.length ? (
        <ul className="divide-y divide-border" aria-label="Alterações nas operações da carteira">
          {result.data.items.map((event) => (
            <li key={event.id} className="grid min-w-0 gap-1 px-5 py-4">
              <p className="text-sm font-semibold">{event.paused ? "Operações pausadas" : "Pausa removida"}</p>
              <p className="wrap-anywhere text-xs tabular-nums text-muted-foreground">
                {formatDateTime(event.createdAt, "medium")}{event.actor && <> · {event.actor}</>}
              </p>
              <p className="wrap-anywhere whitespace-pre-wrap text-pretty text-sm text-muted-foreground">{event.reason}</p>
            </li>
          ))}
        </ul>
      ) : <p className="p-5 text-pretty text-sm text-muted-foreground">Nenhuma alteração nas operações desta carteira.</p>}
    </AdminRecordActivity>
  );
}
