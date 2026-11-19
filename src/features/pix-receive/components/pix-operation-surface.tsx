"use client";

import type { ComponentProps, ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type FocusHandlers = Pick<ComponentProps<typeof DialogContent>, "onOpenAutoFocus" | "onCloseAutoFocus">;

export function PixOperationSurface({
  inline, open, onOpenChange, trigger, children, ...focusHandlers
}: FocusHandlers & {
  inline: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
}) {
  if (inline) return children;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-110 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8"
        {...focusHandlers}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function PixFlowTitle({ inline, className, ...props }: ComponentProps<typeof DialogTitle> & { inline: boolean }) {
  if (inline) return <h2 className={cn("text-lg font-semibold", className)} {...props} />;
  return <DialogTitle className={className} {...props} />;
}
