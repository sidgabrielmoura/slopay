import type { ReactNode } from "react";
import { IntegrationsPreviewProvider } from "@/features/integrations/preview-provider";

export default function IntegrationsLayout({ children }: { children: ReactNode }) {
  return <IntegrationsPreviewProvider>{children}</IntegrationsPreviewProvider>;
}
