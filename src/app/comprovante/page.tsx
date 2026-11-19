import type { Metadata } from "next";
import { OperationalDataUnavailable } from "@/components/shared/operational-data-unavailable";
import { developmentFeaturesEnabled } from "@/config/development";
import { SharedReceiptTicket } from "@/features/receipts/shared-receipt-ticket";
import styles from "@/features/receipts/shared-receipt.module.css";

export const metadata: Metadata = {
  title: "Comprovante Pix",
  description: "Consulte os dados da operação Pix compartilhada.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function SharedReceiptPage() {
  return <main className={styles.page}>
    {developmentFeaturesEnabled() ? <SharedReceiptTicket /> : (
      <article className={styles.ticket} aria-label="Comprovante Pix">
        <OperationalDataUnavailable title="Comprovante indisponível" />
      </article>
    )}
  </main>;
}
