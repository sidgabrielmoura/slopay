"use client";

import { useRef, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function AdminDetailsDialog({ open, title, description, children, onOpenChange, onCloseAutoFocus }: {
  open: boolean;
  title: string;
  description: string;
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-2xl [&>button:last-child]:top-2 [&>button:last-child]:right-2 [&>button:last-child]:grid [&>button:last-child]:size-11 [&>button:last-child]:place-items-center"
        onOpenAutoFocus={(event) => { event.preventDefault(); heading.current?.focus(); }}
        onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader className="min-w-0 border-b border-border p-4 pr-16 text-left sm:px-6 sm:py-5 sm:pr-16">
          <DialogTitle ref={heading} tabIndex={-1} className="text-balance leading-snug outline-none">{title}</DialogTitle>
          <DialogDescription className="text-pretty">{description}</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 min-w-0 content-start gap-4 overflow-x-hidden overflow-y-auto overscroll-contain p-4 sm:px-6">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
