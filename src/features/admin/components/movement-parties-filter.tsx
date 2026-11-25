"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GlideSelect } from "@/components/ui/glide-select";
import { Input } from "@/components/ui/input";
import { fetchMovementFilterOptions } from "../admin-movement-filters";
import type { PixMovementQuery } from "../admin-pix-movements";
import { retryAdminRead } from "../admin-query";

export function MovementPartiesFilter({ adminId, query, onChange }: {
  adminId: string; query: PixMovementQuery; onChange: (value: PixMovementQuery) => void;
}) {
  const [search, setSearch] = useState("");
  const [committed, setCommitted] = useState("");

  useEffect(() => {
    const debounce = window.setTimeout(() => setCommitted(search.trim()), 250);
    return () => window.clearTimeout(debounce);
  }, [search]);

  const options = useQuery({
    queryKey: ["admin-movement-filter-options", adminId, committed, query.merchantId],
    queryFn: ({ signal }) => fetchMovementFilterOptions(committed, query.merchantId, signal),
    placeholderData: (previous, request) => request?.queryKey[1] === adminId ? previous : undefined,
    staleTime: 60_000, retry: retryAdminRead,
  });

  return (
    <>
      <div className="grid min-w-0 gap-2">
        <label htmlFor="pix-movement-client-search" className="text-sm font-medium">Buscar cliente</label>
        <Input id="pix-movement-client-search" type="search" className="h-11 min-w-0" maxLength={120} value={search}
          placeholder="Nome do cliente" autoComplete="off" onChange={event => setSearch(event.target.value)}
          onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }} />
      </div>
      <div className="grid min-w-0 gap-2">
        <span id="pix-movement-client" className="text-sm font-medium">Cliente</span>
        <GlideSelect size="lg" aria-labelledby="pix-movement-client" value={query.merchantId ?? "ALL"}
          options={[{ value: "ALL", label: "Todos os clientes" }, ...options.data?.clients ?? []]}
          onChange={merchantId => onChange({ ...query, merchantId: merchantId === "ALL" ? undefined : merchantId, page: 1 })} />
      </div>
      <div className="grid min-w-0 gap-2">
        <span id="pix-movement-provider" className="text-sm font-medium">Provedor</span>
        <GlideSelect size="lg" aria-labelledby="pix-movement-provider" value={query.provider ?? "ALL"}
          options={[{ value: "ALL", label: "Todos os provedores" }, ...options.data?.providers ?? []]}
          onChange={provider => onChange({ ...query, provider: provider === "ALL" ? undefined : provider, page: 1 })} />
      </div>
      {options.isError ? <p role="status" className="text-sm text-muted-foreground sm:col-span-full">{options.error.message}</p>
        : committed && !options.isFetching && !options.data?.clients.length
          ? <p role="status" className="text-sm text-muted-foreground sm:col-span-full">Nenhum cliente encontrado.</p>
          : null}
    </>
  );
}
