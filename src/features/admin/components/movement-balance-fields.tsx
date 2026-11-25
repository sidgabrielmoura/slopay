import { PanelAmount } from "@/components/layout/panel-privacy";
import type { MovementBalance } from "../admin-movement-balance";
import { CompanyField } from "./company-display";

export function MovementBalanceFields({ balance }: { balance: MovementBalance }) {
  return (
    <section className="grid min-w-0 gap-3">
      <h3 className="text-balance text-sm font-semibold">Saldo contábil do cliente</h3>
      <dl className="grid min-w-0 grid-cols-2 gap-4 tabular-nums">
        <CompanyField label="Antes do lançamento"><PanelAmount cents={BigInt(balance.beforeInCents)} /></CompanyField>
        <CompanyField label="Depois do lançamento"><PanelAmount cents={BigInt(balance.afterInCents)} /></CompanyField>
        {balance.reservedBeforeInCents !== balance.reservedAfterInCents && <>
          <CompanyField label="Reservado antes"><PanelAmount cents={BigInt(balance.reservedBeforeInCents)} /></CompanyField>
          <CompanyField label="Reservado depois"><PanelAmount cents={BigInt(balance.reservedAfterInCents)} /></CompanyField>
        </>}
      </dl>
    </section>
  );
}
