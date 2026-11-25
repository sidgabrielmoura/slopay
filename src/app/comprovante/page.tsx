import type { Metadata } from "next";
import { shareMetadata } from "@/config/share-metadata";
import { SharedReceiptTicket } from "@/features/receipts/shared-receipt-ticket";
import styles from "@/features/receipts/shared-receipt.module.css";

export const metadata: Metadata = {
  ...shareMetadata({
    title: "Comprovante Pix",
    description: "Consulte os dados da operação Pix compartilhada.",
    receipt: true,
  }),
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function SharedReceiptPage() {
  return <main className={styles.page}>
    <SharedReceiptTicket />
  </main>;
}
