"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { IntegrationConfirmationDialog } from "@/features/integrations/components/integration-confirmation-dialog";
import { adminPaymentProviders, providerDraftSchema, type ProviderDraft } from "../admin-payment-providers";
import { retryAdminRead } from "../admin-query";
import { useAdminAccess } from "./admin-access-provider";
import { CompanyReadError, CompanyRowsSkeleton } from "./company-display";

export function AdminPaymentProviders({ adminId, page, onPage }: {
  adminId: string; page: number; onPage: (page: number) => void;
}) {
  const { can } = useAdminAccess();
  const client = useQueryClient();
  const trigger = useRef<HTMLButtonElement>(null);
  const [registering, setRegistering] = useState(false);
  const result = useQuery({
    queryKey: ["admin-payment-providers", adminId, page],
    queryFn: ({ signal }) => adminPaymentProviders.list(page, signal),
    placeholderData: (previous, request) => request?.queryKey[1] === adminId ? previous : undefined,
    staleTime: 30_000, retry: retryAdminRead,
  });
  const report = result.data;
  return (
    <Card className="min-w-0 gap-0 overflow-hidden py-0">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Provedores de pagamento</h2>
          <p className="mt-1 text-sm text-muted-foreground">Consulte quais provedores estão integrados ao roteamento.</p>
        </div>
        {can("admin.wallets.register") && <Button ref={trigger} type="button" className="min-h-11" onClick={() => setRegistering(true)}>
          <Plus aria-hidden="true" /> Cadastrar provedor
        </Button>}
      </header>
      {result.isPending && <CompanyRowsSkeleton />}
      {result.isError && <CompanyReadError title="Cadastro de provedores indisponível" retry={() => void result.refetch()} />}
      {report && <>
        <ul className="divide-y divide-border" aria-label="Provedores cadastrados" aria-busy={result.isPlaceholderData}>
          {report.items.map(provider => <li key={provider.code} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
            <div className="min-w-0">
              <p className="wrap-anywhere font-medium">{provider.name}</p>
              <p className="wrap-anywhere font-mono text-xs text-muted-foreground">{provider.code}</p>
            </div>
            <Badge variant={provider.integrated ? "success" : "secondary"}>{provider.integrated ? "Integrado" : "Aguardando integração"}</Badge>
          </li>)}
        </ul>
        <TablePagination {...report.pagination} busy={result.isPlaceholderData} label="Paginação dos provedores" onPageChange={onPage} />
      </>}
      {registering && <ProviderRegistrationDialog
        close={() => setRegistering(false)} restoreFocus={() => trigger.current?.focus()}
        onCreated={() => {
          void client.invalidateQueries({ queryKey: ["admin-payment-providers", adminId] });
          void client.invalidateQueries({ queryKey: ["admin-movement-filter-options", adminId] });
        }} />}
    </Card>
  );
}

function ProviderRegistrationDialog({ close, restoreFocus, onCreated }: {
  close: () => void; restoreFocus: () => void; onCreated: () => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(true);
  const [review, setReview] = useState<ProviderDraft | null>(null);
  const [error, setError] = useState("");
  const draft = useRef<ProviderDraft | null>(null);
  const confirmation = useRef<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const result = providerDraftSchema.safeParse({
      name: fields.get("name"), code: String(fields.get("code") ?? "").trim().toUpperCase(),
    });
    if (!result.success) {
      setError("Confira o nome e o código do provedor. Use de 2 a 32 letras, números ou sublinhados no código, começando por uma letra.");
      return;
    }
    draft.current = result.data;
    setOpen(false);
  }

  if (review) return (
    <IntegrationConfirmationDialog scope={"payment-provider:" + review.code}
      title="Confirmar cadastro do provedor" description="Confira os dados antes de confirmar com seu segundo fator."
      completed="Provedor cadastrado" onClose={close} restoreFocus={restoreFocus} onSuccess={onCreated}
      options={async () => {
        const result = await adminPaymentProviders.options(review);
        confirmation.current = result.confirmation;
        return result;
      }}
      apply={async proof => {
        const reviewed = "credential" in proof ? confirmation.current : (await adminPaymentProviders.options(review)).confirmation;
        if (!reviewed) throw new Error("Revise o cadastro novamente.");
        await adminPaymentProviders.register(review, reviewed, proof);
      }}
      resultContent={<p className="text-sm text-muted-foreground">O provedor ficará disponível para operações quando a integração for habilitada.</p>}>
      <div className="rounded-lg border border-border p-4">
        <p className="wrap-anywhere text-sm font-semibold">{review.name}</p>
        <p className="wrap-anywhere font-mono text-xs text-muted-foreground">{review.code}</p>
      </div>
    </IntegrationConfirmationDialog>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md" onCloseAutoFocus={event => {
        event.preventDefault();
        if (draft.current) setReview(draft.current);
        else { restoreFocus(); close(); }
      }}>
        <DialogHeader>
          <DialogTitle>Cadastrar provedor</DialogTitle>
          <DialogDescription>Registre o nome e o código de identificação da integração.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit} onChange={() => setError("")}>
          <div className="grid gap-2">
            <label htmlFor={id + "-name"} className="text-sm font-medium">Nome do provedor</label>
            <Input id={id + "-name"} name="name" autoFocus required maxLength={100} className="h-11" />
          </div>
          <div className="grid gap-2">
            <label htmlFor={id + "-code"} className="text-sm font-medium">Código do provedor</label>
            <Input id={id + "-code"} name="code" required maxLength={32} minLength={2} spellCheck={false}
              aria-describedby={id + "-code-hint"} className="h-11 font-mono uppercase" />
            <p id={id + "-code-hint"} className="text-xs text-muted-foreground">Comece com uma letra. Use letras, números e sublinhado.</p>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" className="min-h-11" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" className="min-h-11">Revisar cadastro</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
