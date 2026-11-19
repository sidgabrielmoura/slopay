"use client";

import Link, { useLinkStatus } from "next/link";
import { Button } from "@/components/ui/button";
import { AuthActionLabels } from "./auth-form-controls";
import styles from "./auth-shell.module.css";

function AuthLinkLabel({ children, pendingLabel }: { children: string; pendingLabel: string }) {
  const { pending } = useLinkStatus();

  return (
    <>
      <AuthActionLabels pending={pending} pendingLabel={pendingLabel}>{children}</AuthActionLabels>
      <span className="sr-only" role="status">{pending ? pendingLabel : ""}</span>
    </>
  );
}

export function AuthActionLink({ children, href, pendingLabel }: {
  children: string;
  href: string;
  pendingLabel: string;
}) {
  return (
    <Button asChild className={"h-11 w-full " + styles.actionButton}>
      <Link href={href} aria-label={children}>
        <AuthLinkLabel pendingLabel={pendingLabel}>{children}</AuthLinkLabel>
      </Link>
    </Button>
  );
}
