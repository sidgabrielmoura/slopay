"use client";

import { useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ToastNotice({ message, variant = "error", description, persistent = false, href, actionLabel }: {
  message?: string | null;
  variant?: "error" | "warning" | "info" | "success";
  description?: string;
  persistent?: boolean;
  href?: string;
  actionLabel?: string;
}) {
  const id = useId();
  const router = useRouter();

  useEffect(() => {
    if (!message) return;
    toast[variant](message, {
      id,
      description,
      duration: persistent ? Infinity : undefined,
      action: href && actionLabel ? { label: actionLabel, onClick: () => router.push(href) } : undefined,
    });
    if (variant !== "success" || persistent) return () => { toast.dismiss(id); };
  }, [actionLabel, description, href, id, message, persistent, router, variant]);

  return null;
}
