"use client";

import { useMutation } from "@tanstack/react-query";
import { useId, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { BrazilianInput } from "@/components/ui/brazilian-input";
import { Button } from "@/components/ui/button";
import { normalizeProfilePhone, profilePhoneInvalid } from "../profile";

export function ProfilePhoneForm({ phone, save }: { phone: string | null; save: (phone: string) => Promise<string> }) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const toastId = `${inputId}-feedback`;
  const input = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const stored = saved ?? phone ?? "";
  const current = draft ?? stored;
  const normalized = normalizeProfilePhone(current);
  const changed = current !== stored && (normalized === null || normalized !== normalizeProfilePhone(stored));

  const update = useMutation({
    mutationFn: save,
    onSuccess: (confirmed) => {
      setSaved(confirmed);
      setDraft(null);
      toast.success("Telefone atualizado.", { id: toastId });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o telefone.", { id: toastId });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!changed || update.isPending) return;
    if (!normalized) {
      setInvalid(true);
      input.current?.focus();
      toast.error(profilePhoneInvalid, { id: toastId });
      return;
    }
    update.mutate(normalized);
  }

  return (
    <form noValidate onSubmit={submit} aria-busy={update.isPending} className="grid gap-2">
      <label htmlFor={inputId} className="text-sm text-muted-foreground">Telefone de contato</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <BrazilianInput
          ref={input}
          id={inputId}
          name="phone"
          mask="PHONE"
          autoComplete="tel"
          placeholder="(00) 00000-0000"
          required
          readOnly={update.isPending}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
          value={current}
          onChange={(event) => {
            setDraft(event.target.value);
            if (invalid) {
              setInvalid(false);
              toast.dismiss(toastId);
            }
          }}
          className="h-11 min-w-0 tabular-nums aria-invalid:border-destructive! aria-invalid:ring-destructive"
        />
        <Button type="submit" className="h-11 shrink-0" disabled={!changed || update.isPending}>
          {update.isPending ? "Salvando…" : "Salvar telefone"}
        </Button>
      </div>
      {invalid && <span id={errorId} className="sr-only">{profilePhoneInvalid}</span>}
    </form>
  );
}
