"use client";

import { useId, useState, type ComponentProps, type Dispatch, type FormEvent, type ReactNode, type Ref, type SetStateAction } from "react";
import { ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlideSelect, type GlideSelectProps } from "@/components/ui/glide-select";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import styles from "./filter-sheet.module.css";

type FilterSheetProps<T extends object> = {
  value: T;
  defaults: NoInfer<T>;
  onApply: (draft: T) => void | string;
  children: (draft: T, setDraft: Dispatch<SetStateAction<T>>) => ReactNode;
  active?: boolean;
  disabled?: boolean;
  className?: string;
  triggerRef?: Ref<HTMLButtonElement>;
};

export function FilterSheet<T extends object>({ value, defaults, onApply, children, active, disabled, className, triggerRef }: FilterSheetProps<T>) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string>();

  function changeOpen(next: boolean) {
    if (next) {
      setDraft(value);
      setError(undefined);
    }
    setOpen(next);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    const keys = Object.keys({ ...value, ...draft }) as Array<keyof T>;
    const changed = keys.some(key => !Object.is(draft[key], value[key]));
    const validation = changed ? onApply(draft) : undefined;
    if (validation) {
      setError(validation);
      return;
    }
    setOpen(false);
  }

  return <Sheet open={open} onOpenChange={changeOpen}>
    <SheetTrigger asChild>
      <Button ref={triggerRef} type="button" variant="outline" disabled={disabled} className={cn("h-11", className)}>
        <ListFilter data-icon="inline-start" aria-hidden="true" />
        Filtros
        {active && <>
          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
          <span className="sr-only">aplicados</span>
        </>}
      </Button>
    </SheetTrigger>
    <SheetContent side="right" overlayClassName={styles.overlay}
      className={cn(styles.panel, "flex h-dvh w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-sm")}>
      <SheetHeader className="gap-0 space-y-0 border-b border-border px-5 pb-4 pr-16 pt-5 text-left">
        <SheetTitle className="text-balance">Filtros</SheetTitle>
        <SheetDescription className="sr-only">Escolha os critérios para filtrar os resultados desta página.</SheetDescription>
      </SheetHeader>
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-5">
          {children(draft, setDraft)}
        </div>
        <SheetFooter className={cn(styles.footer, "shrink-0 flex-col gap-3 space-x-0 border-t border-border bg-card p-5 sm:flex-col")}>
          {error && <p role="alert" className="text-pretty text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="ghost" className="h-11" onClick={() => {
              setDraft(defaults);
              setError(undefined);
            }}>Limpar filtros</Button>
            <Button type="submit" className="h-11 flex-1">Filtrar</Button>
          </div>
        </SheetFooter>
      </form>
    </SheetContent>
  </Sheet>;
}

export function FilterInput({ label, id, ...props }: ComponentProps<typeof Input> & { label: string }) {
  const generated = useId();
  const inputId = id ?? generated;
  return <div className="grid min-w-0 gap-2">
    <label htmlFor={inputId} className="text-sm font-medium">{label}</label>
    <Input id={inputId} autoComplete="off" type="search" {...props} className={cn("h-11", props.className)} />
  </div>;
}

export function FilterSelect({ label, id, ...props }: GlideSelectProps & { label: string }) {
  const generated = useId();
  const selectId = id ?? generated;
  return <div className="grid min-w-0 gap-2">
    <label htmlFor={selectId} className="text-sm font-medium">{label}</label>
    <GlideSelect size="lg" {...props} id={selectId} />
  </div>;
}

export function applySearchFilters<T extends { search: string; page: number }>(
  draft: T,
  searchSchema: { safeParse: (value: string) => { success: true; data: string } | { success: false } },
  onApply: (filters: T) => void,
) {
  const parsed = searchSchema.safeParse(draft.search);
  if (!parsed.success) return "Confira o texto da busca.";
  onApply({ ...draft, search: parsed.data, page: 1 });
}
