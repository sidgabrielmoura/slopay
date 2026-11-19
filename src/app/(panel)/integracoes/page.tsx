import { redirect } from "next/navigation";
import { apiKeysPath } from "@/features/integrations/navigation";

export default function IntegrationsPage() {
  redirect(apiKeysPath);
}
