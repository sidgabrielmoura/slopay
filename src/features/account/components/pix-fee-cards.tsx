import { PanelAmount } from "@/components/layout/panel-privacy";
import { formatDateTime } from "@/lib/dates";
import type { PixFees } from "../pix-conditions";
import { PixFeeCard } from "./pix-conditions-layout";

const percentage = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 4 });
const quantity = new Intl.NumberFormat("pt-BR");

function Promotion({ offer }: { offer: { cents: number; expiresAt: string | null } }) {
  return (
    <>
      <PanelAmount cents={offer.cents} />
      {offer.expiresAt && (
        <span className="block text-xs font-normal text-muted-foreground">
          Até <time dateTime={offer.expiresAt}>{formatDateTime(offer.expiresAt, "date-only")}</time>
        </span>
      )}
    </>
  );
}

export function PixFeeCards({ data }: { data: PixFees | null }) {
  const receive: Parameters<typeof PixFeeCard>[0]["terms"] = [];
  const withdraw: Parameters<typeof PixFeeCard>[0]["terms"] = [];
  const receipt = data?.receipt;
  const transfer = data?.transfer;
  if (receipt) {
    if (receipt.fixedInCents !== null) receive.push(["Tarifa fixa", <PanelAmount cents={receipt.fixedInCents} />]);
    if (receipt.percentage !== null && (receipt.percentage > 0 || receipt.fixedInCents === null)) {
      receive.push(["Percentual", percentage.format(receipt.percentage / 100)]);
    }
    if (receipt.minimumInCents) receive.push(["Tarifa mínima", <PanelAmount cents={receipt.minimumInCents} />]);
    if (receipt.maximumInCents) receive.push(["Tarifa máxima", <PanelAmount cents={receipt.maximumInCents} />]);
    if (receipt.promotion && receipt.promotion.cents !== receipt.fixedInCents)
      receive.push(["Tarifa promocional", <Promotion offer={receipt.promotion} />]);
    if (receipt.monthlyFreeReceipts) {
      receive.push(["Franquia mensal", quantity.format(receipt.monthlyFreeReceipts) + " Pix sem tarifa"]);
    }
  }
  if (transfer) {
    if (transfer.feeInCents !== null) withdraw.push(["Tarifa por transferência", <PanelAmount cents={transfer.feeInCents} />]);
    if (transfer.promotion && transfer.promotion.cents !== transfer.feeInCents)
      withdraw.push(["Tarifa promocional", <Promotion offer={transfer.promotion} />]);
    if (transfer.monthlyFreeTransfers) {
      withdraw.push(["Franquia mensal", quantity.format(transfer.monthlyFreeTransfers) + " Pix sem tarifa"]);
    }
  }
  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      <PixFeeCard direction="receive" terms={receive} />
      <PixFeeCard direction="withdraw" terms={withdraw} />
    </div>
  );
}
