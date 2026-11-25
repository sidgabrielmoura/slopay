import { redirect } from "next/navigation";
import { receiptsPath } from "@/features/receipts/pix-receipt-share";

export default function ReceiptsPage() {
  redirect(receiptsPath);
}
