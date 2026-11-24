"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IntegrationConfirmationDialog } from "@/features/integrations/components/integration-confirmation-dialog";
import { accountSupport, supportHref } from "../account-support";
import { AccountSupportLoading } from "./account-support-loading";

export function CompanySupportAction({ companyId, companyName }: { companyId: string; companyName: string }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [requestId, setRequestId] = useState<string>();
  const [accessing, setAccessing] = useState(false);

  useEffect(() => {
    function clearRestoredOverlay(event: PageTransitionEvent) {
      if (event.persisted) {
        setRequestId(undefined);
        setAccessing(false);
      }
    }
    window.addEventListener("pageshow", clearRestoredOverlay);
    return () => window.removeEventListener("pageshow", clearRestoredOverlay);
  }, []);

  return (
    <>
      <Button ref={trigger} type="button" variant="outline" className="h-11"
        onClick={() => setRequestId(crypto.randomUUID())}>
        <ExternalLink aria-hidden="true" /> Acessar conta
      </Button>
      {requestId && (
        <IntegrationConfirmationDialog
          scope={`admin-support:${companyId}:${requestId}`}
          title="Acessar conta"
          description="Confirme sua identidade para abrir uma sessão de suporte. O acesso é somente leitura e fica registrado na auditoria."
          completed="Acesso autorizado"
          options={() => accountSupport.options(companyId, requestId)}
          apply={async (proof) => {
            setAccessing(true);
            try {
              return await accountSupport.start(companyId, requestId, proof);
            } catch (error) {
              setAccessing(false);
              throw error;
            }
          }}
          onSuccess={({ id }) => window.location.assign(supportHref(id))}
          onClose={() => setRequestId(undefined)}
          restoreFocus={() => trigger.current?.focus()}
          preventOutsideClose
        >
          <p className="wrap-anywhere rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium">{companyName}</p>
        </IntegrationConfirmationDialog>
      )}
      {accessing && createPortal(<AccountSupportLoading />, document.body)}
    </>
  );
}
