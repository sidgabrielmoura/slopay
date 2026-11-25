import type { AdminPixPayer } from "../admin-pix-payer";
import { CompanyField } from "./company-display";

export function PixPayerFields({ payer }: { payer?: AdminPixPayer | null }) {
  return (
    <section className="grid min-w-0 gap-3">
      <h3 className="text-sm font-semibold">Pagador do Pix</h3>
      {payer ? (
        <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
          <CompanyField label="Nome">{payer.name ?? "Sem registro"}</CompanyField>
          <CompanyField label="CPF ou CNPJ">{payer.document ?? "Sem registro"}</CompanyField>
          {payer.institution && <CompanyField label="Instituição">{payer.institution}</CompanyField>}
          {payer.endToEndId && <CompanyField label="EndToEnd">{payer.endToEndId}</CompanyField>}
        </dl>
      ) : <p className="text-sm text-muted-foreground">Dados do pagador indisponíveis para este Pix.</p>}
    </section>
  );
}
