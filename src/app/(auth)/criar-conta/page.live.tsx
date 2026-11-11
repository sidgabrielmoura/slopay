import { AuthShell } from "@/features/auth/components/auth-shell";
import { LiveRegistration } from "@/features/auth/components/live-auth-forms";

export default function CriarContaPage() {
  return <AuthShell><LiveRegistration /></AuthShell>;
}
