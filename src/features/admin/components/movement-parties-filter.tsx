"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GlideSelect } from "@/components/ui/glide-select";
import { fetchMovementFilterOptions } from "../admin-movement-filters";
import type { PixMovementQuery } from "../admin-pix-movements";
import { retryAdminRead } from "../admin-query";

export function MovementPartiesFilter({ adminId, query, onChange }: {
  adminId: string; query: PixMovementQuery; onChange: (value: PixMovementQuery) => void;
}) {
  const [search, setSearch] = useState("");
  const [committed, setCommitted] = useState("");
  const term = search.trim();

  useEffect(() => {
    if (!term) return;
    const debounce = window.setTimeout(() => setCommitted(term), 250);
    return () => window.clearTimeout(debounce);
  }, [term]);

  const options = useQuery({
    queryKey: ["admin-movement-filter-options", adminId, "", query.merchantId],
    queryFn: ({ signal }) => fetchMovementFilterOptions("", query.merchantId, signal),
    placeholderData: (previous, request) => request?.queryKey[1] === adminId ? previous : undefined,
    staleTime: 60_000, retry: retryAdminRead,
  });
  const matches = useQuery({
    queryKey: ["admin-movement-filter-options", adminId, "search", committed],
    queryFn: ({ signal }) => fetchMovementFilterOptions(committed, undefined, signal),
    enabled: Boolean(term) && term === committed,
    staleTime: 60_000, retry: retryAdminRead,
  });
  const clientRequest = term ? matches : options;
  const loading = Boolean(term && term !== committed) || clientRequest.isPending;
  const clients = loading ? [] : clientRequest.data?.clients ?? [];
  const selected = options.data?.clients.find(client => client.value === query.merchantId)
    ?? matches.data?.clients.find(client => client.value === query.merchantId);
  const status = loading ? "Buscando clientes…"
    : clientRequest.isError ? clientRequest.error.message
    : term && clients.length === 0 ? "Nenhum cliente encontrado." : undefined;

  return (
    <>
      <div className="grid min-w-0 gap-2">
        <span id="pix-movement-client" className="text-sm font-medium">Cliente</span>
        <GlideSelect size="lg" aria-labelledby="pix-movement-client" value={query.merchantId ?? "ALL"}
          options={term ? clients : [{ value: "ALL", label: "Todos os clientes" }, ...clients]}
          placeholder={selected?.label ?? (query.merchantId ? "Cliente selecionado" : "Todos os clientes")}
          search={{ label: "Pesquisar nome do cliente", placeholder: "Pesquisar por nome", value: search,
            onChange: setSearch, maxLength: 120, busy: loading, status }}
          onChange={merchantId => onChange({ ...query, merchantId: merchantId === "ALL" ? undefined : merchantId, page: 1 })} />
      </div>
      <div className="grid min-w-0 gap-2">
        <span id="pix-movement-provider" className="text-sm font-medium">Provedor</span>
        <GlideSelect size="lg" aria-labelledby="pix-movement-provider" value={query.provider ?? "ALL"}
          options={[{ value: "ALL", label: "Todos os provedores" }, ...options.data?.providers ?? []]}
          onChange={provider => onChange({ ...query, provider: provider === "ALL" ? undefined : provider, page: 1 })} />
      </div>
      {options.isError && <p role="status" className="text-sm text-muted-foreground sm:col-span-full">{options.error.message}</p>}
    </>
  );
}
