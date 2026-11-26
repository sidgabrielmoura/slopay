"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { demoRepository } from "@/services/demo-repository";
import { formatDateTime } from "@/lib/dates";
import { FilterInput, FilterSelect, FilterSheet } from "@/components/shared/filter-sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ShieldCheck, CheckCircle2, XCircle, FileCode, Eye, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import type { AuditEvent } from "@/types/domain";

export default function AdminAuditoriaPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [entityType, setEntityType] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit", searchTerm, entityType, page],
    queryFn: () =>
      demoRepository.getAuditEvents({
        search: searchTerm,
        entityType: entityType !== "ALL" ? entityType : undefined,
        page,
        pageSize,
      }),
  });

  const events = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Trilha Imutável de Auditoria & Compliance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registro rigoroso e append-only de todas as ações administrativas, alterações de alçada, decisões KYC e bloqueios.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <FilterSheet value={{ search: searchTerm, entityType }} defaults={{ search: "", entityType: "ALL" }}
          active={Boolean(searchTerm) || entityType !== "ALL"}
          onApply={draft => { setSearchTerm(draft.search.trim()); setEntityType(draft.entityType); setPage(1); }}>
          {(draft, setDraft) => <>
            <FilterInput label="Buscar eventos" placeholder="Ator, motivo, evento ou identificador" value={draft.search}
              onChange={event => setDraft({ ...draft, search: event.target.value })} />
            <FilterSelect label="Módulo" value={draft.entityType} options={[
              { value: "ALL", label: "Todos os módulos" },
              { value: "APPLICATION", label: "Abertura de contas" },
              { value: "COMPANY", label: "Empresas" },
              { value: "ACCOUNT", label: "Contas" },
              { value: "FEE_LIMIT", label: "Taxas e limites" },
              { value: "APPROVAL_REQUEST", label: "Alçadas" },
              { value: "SECURITY", label: "Segurança" },
            ]}
              onChange={entityType => setDraft({ ...draft, entityType })} />
          </>}
        </FilterSheet>
      </div>

      {/* Table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Carimbo de Data/Hora
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Ator Responsável
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Ação Executada
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Módulo / Entidade
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Empresa Vinculada
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Justificativa Formal
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-right">
                  Dossiê
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell colSpan={7} className="h-12 text-center">
                      <div className="h-4 bg-secondary/50 rounded animate-pulse w-3/4 mx-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : events.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-muted-foreground text-sm"
                  >
                    Nenhum registro de auditoria com os parâmetros informados.
                  </TableCell>
                </TableRow>
              ) : (
                events.map((ev) => (
                  <TableRow
                    key={ev.id}
                    className="border-border hover:bg-secondary/30 transition-colors"
                  >
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(ev.timestamp)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs text-foreground">
                          {ev.actorName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {ev.actorRole}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px] font-mono">
                        {ev.actionType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs text-foreground font-medium">
                          {ev.entityType}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
                          {ev.entityId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ev.companyName || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-foreground max-w-[260px] truncate">
                      {ev.reason || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedEvent(ev)}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                      >
                        <Eye className="size-3.5" /> Dossiê
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card/50 text-xs text-muted-foreground">
            <span>
              Mostrando {events.length} de {data.total} eventos registrados
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, data.page - 1))}
                disabled={data.page <= 1}
                className="h-8 px-2.5 border-border"
              >
                <ChevronLeft className="size-3.5 mr-1" /> Anterior
              </Button>
              <span className="font-mono text-foreground font-medium">
                {data.page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(data.totalPages, data.page + 1))}
                disabled={data.page >= data.totalPages}
                className="h-8 px-2.5 border-border"
              >
                Próxima <ChevronRight className="size-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Audit Event Details & Diff Dialog */}
      {selectedEvent && (
        <Dialog
          open={!!selectedEvent}
          onOpenChange={(open) => !open && setSelectedEvent(null)}
        >
          <DialogContent className="max-w-lg bg-card border-border text-foreground">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-semibold">
                  Dossiê do Evento de Auditoria
                </DialogTitle>
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]">
                  {selectedEvent.status}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground font-mono">
                ID do Registro: {selectedEvent.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-xs">
              <div className="p-3 rounded-lg bg-background border border-border space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data/Hora Precisa:</span>
                  <span className="font-medium text-foreground">
                    {formatDateTime(selectedEvent.timestamp)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ator:</span>
                  <span className="font-semibold text-foreground">
                    {selectedEvent.actorName} ({selectedEvent.actorRole})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ação:</span>
                  <span className="font-mono font-medium text-primary">
                    {selectedEvent.actionType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entidade Alvo:</span>
                  <span className="font-mono text-foreground">
                    {selectedEvent.entityType} • {selectedEvent.entityId}
                  </span>
                </div>
                {selectedEvent.companyName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Empresa:</span>
                    <span className="font-medium text-foreground">
                      {selectedEvent.companyName}
                    </span>
                  </div>
                )}
              </div>

              {selectedEvent.reason && (
                <div className="p-3 rounded-lg bg-background border border-border space-y-1">
                  <span className="text-[11px] text-muted-foreground font-medium block">
                    Justificativa / Parecer Registrado
                  </span>
                  <p className="text-xs text-foreground leading-relaxed">
                    {selectedEvent.reason}
                  </p>
                </div>
              )}

              {/* Diff Viewer */}
              {selectedEvent.diffSanitized && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <FileCode className="size-3.5 text-primary" />
                    Diferencial de Estados (Diff Sanitizado)
                  </span>
                  <div className="p-3 rounded-lg bg-background border border-border font-mono text-[11px] space-y-2 max-h-48 overflow-y-auto">
                    {Object.entries(selectedEvent.diffSanitized).map(([key, val]) => (
                      <div key={key} className="space-y-0.5">
                        <span className="text-muted-foreground font-bold">{key}:</span>
                        <div className="pl-2 space-y-0.5">
                          <div className="text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                            - Antes: {JSON.stringify(val.before)}
                          </div>
                          <div className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            + Depois: {JSON.stringify(val.after)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
