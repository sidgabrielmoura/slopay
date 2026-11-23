"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CircleAlert, Clock3, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingConfirmation, LoadingIndicator, OperationFailure } from "@/components/ui/loading-indicator";
import { AuthActionButton, AuthHeading, AuthLoadingStatus } from "@/features/auth/components/auth-form-controls";
import { LogoutButton } from "@/features/auth/components/live-auth-forms";
import { SessionMonitor } from "@/features/auth/components/session-monitor";
import { ApiError } from "@/lib/api-client";
import { authApiService } from "@/services/auth-api.service";
import {
  formatOpeningDate, openingApplication, validateOpeningStep,
  type OpeningApplication, type OpeningDraft, type SaveOpeningApplication,
} from "../account-opening-application";
import { AccountOpeningLayout } from "./account-opening-layout";
import { AccountAddressFields, AccountIdentityFields, AccountReview, AccountTypeChoices } from "./account-opening-fields";

const content = [
  { title: "Como você quer abrir sua conta?", description: "Escolha o tipo de conta para começar." },
  { title: "Confirme seus dados", description: "Informe seu WhatsApp e complete a identificação." },
  { title: "Endereço e atividade", description: "Informe o endereço e sua atividade principal." },
  { title: "Revise antes de enviar", description: "Confira os dados que a equipe do SloPay vai analisar." },
];
const tracking = {
  SUBMITTED: { title: "Solicitação enviada", description: "Seus dados foram recebidos. Você pode acompanhar a análise por aqui." },
  UNDER_REVIEW: { title: "Sua conta está em análise", description: "A equipe do SloPay está conferindo os dados da solicitação." },
  RESUBMITTED: { title: "Dados atualizados", description: "Recebemos as correções. Sua solicitação voltou para análise." },
  CHANGES_REQUESTED: { title: "Precisamos de alguns ajustes", description: "Atualize os dados solicitados para que a equipe continue a análise." },
  REJECTED: { title: "Solicitação não aprovada", description: "A análise da sua conta foi concluída." },
  APPROVED: { title: "Conta aprovada", description: "Continue para acessar sua conta no Slopay." },
};

function Title({ title, description }: { title: string; description: string }) {
  return (
    <header className="space-y-2.5">
      <AuthHeading className="max-w-[19ch] text-balance text-[clamp(1.75rem,5vw,2.65rem)]! leading-[1.08] tracking-tight">
        {title}
      </AuthHeading>
      <p className="max-w-[42ch] text-pretty text-sm/relaxed text-muted-foreground sm:text-base/relaxed">{description}</p>
    </header>
  );
}

type Save = (input: SaveOpeningApplication) => Promise<OpeningApplication>;

function DraftWizard({ snapshot, save, demo, onExit }: { snapshot: OpeningApplication; save: Save; demo?: boolean; onExit: () => void }) {
  const router = useRouter();
  const [draft, setDraft] = useState(snapshot.draft);
  const [version, setVersion] = useState(snapshot.version);
  const [step, setStep] = useState(snapshot.state === "CHANGES_REQUESTED" ? 2 : snapshot.nextStep);
  const [confirmed, setConfirmed] = useState(false);
  const [invalid, setInvalid] = useState<keyof OpeningDraft>();
  const [busy, setBusy] = useState<"save" | "submit" | "exit" | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const saving = useRef(false);

  function update<K extends keyof OpeningDraft>(field: K, value: OpeningDraft[K]) {
    setDraft((previous) => previous ? { ...previous, [field]: value } : previous);
    if (invalid === field) setInvalid(undefined);
    setSubmitError(null);
  }

  async function persist(next: OpeningDraft | null, nextStep: number, intent: "save" | "submit" | "exit") {
    if (saving.current) return;
    saving.current = true;
    setBusy(intent);
    setSubmitError(null);
    try {
      if (next) {
        const result = await save({
          draft: next, nextStep, version, action: intent === "submit" ? "SUBMIT" : "SAVE",
          ...(intent === "submit" && { confirmed: true }),
        });
        setDraft(result.draft);
        setVersion(result.version);
        setStep(result.nextStep);
        setInvalid(undefined);
        setConfirmed(false);
        if (intent !== "exit" && window.scrollY > 0) window.scrollTo({ top: 0, behavior: "instant" });
      }
      if (intent === "exit") {
        if (snapshot.state === "CHANGES_REQUESTED") {
          onExit();
          return;
        }
        await authApiService.logout();
        router.replace("/entrar");
        router.refresh();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível concluir esta ação.";
      if (intent === "submit" && error instanceof ApiError && error.status >= 400 && error.status < 500) {
        setSubmitError(message);
      } else {
        toast.error(message);
      }
    } finally {
      saving.current = false;
      setBusy(null);
    }
  }

  function choose(accountType: OpeningDraft["accountType"]) {
    const selection = draft?.accountType === accountType
      ? draft : { accountType, whatsapp: draft?.whatsapp ?? snapshot.owner.phone ?? "" };
    void persist(selection, 2, "save");
  }

  function changeStep(nextStep: number) {
    setInvalid(undefined);
    setSubmitError(null);
    setConfirmed(false);
    setStep(nextStep);
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: "instant" });
  }

  function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || saving.current) return;
    const issue = validateOpeningStep(step, draft);
    if (issue) {
      setInvalid(issue.field);
      toast.error(issue.message);
      document.getElementById(issue.field)?.focus();
      return;
    }
    if (step === 4 && !confirmed) {
      toast.error("Confirme que os dados estão corretos para enviar.");
      document.getElementById("opening-confirmed")?.focus();
      return;
    }
    if (step === 4) void persist(draft, 4, "submit");
    else void persist(draft, step + 1, "save");
  }

  const progress = content[step - 1];
  if (!progress) return null;
  const correcting = snapshot.state === "CHANGES_REQUESTED";
  const action = (
    <Button type="button" variant="ghost" disabled={Boolean(busy)} className="min-h-11 text-muted-foreground"
      onClick={() => void persist(draft, step, "exit")}>
      {busy === "exit" ? <LoadingIndicator /> : correcting ? <ArrowLeft aria-hidden="true" size={16} /> : <LogOut aria-hidden="true" size={16} />}
      <span>{correcting ? "Salvar e voltar" : draft ? "Salvar e sair" : "Sair"}</span>
    </Button>
  );

  return (
    <AccountOpeningLayout step={step} action={demo ? undefined : action}>
      <section className="space-y-6 sm:space-y-7">
        <Title {...progress} />
        {step === 1 ? (
          <>
            <AccountTypeChoices current={draft?.accountType} pending={Boolean(busy)} onChoose={choose} />
            {busy === "save" && <AuthLoadingStatus>Salvando etapa…</AuthLoadingStatus>}
          </>
        ) : draft && (
          <form noValidate onSubmit={next} aria-busy={Boolean(busy)} className="grid gap-5">
            <fieldset className="grid min-w-0 gap-4" disabled={Boolean(busy)}>
              <legend className="sr-only">{progress.title}</legend>
              {step === 2 && <AccountIdentityFields owner={snapshot.owner} draft={draft} invalid={invalid} update={update} />}
              {step === 3 && <AccountAddressFields draft={draft} invalid={invalid} update={update} />}
              {step === 4 && (
                <AccountReview owner={snapshot.owner} draft={draft} confirmed={confirmed} onConfirm={setConfirmed} onEdit={changeStep} />
              )}
            </fieldset>
            {submitError && <OperationFailure message={submitError} />}
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2.5">
              <Button type="button" variant="outline" disabled={Boolean(busy)} className="h-11 px-3.5"
                onClick={() => changeStep(step - 1)}><ArrowLeft size={16} aria-hidden="true" />Voltar</Button>
              <AuthActionButton className="min-w-0" pending={busy === "save" || busy === "submit"}
                disabled={busy === "exit"} pendingLabel={step === 4 ? "Enviando solicitação…" : "Salvando…"}
                endIcon={<ArrowRight size={16} aria-hidden="true" />}>
                {step === 4 ? "Enviar solicitação" : "Continuar"}
              </AuthActionButton>
            </div>
          </form>
        )}
      </section>
    </AccountOpeningLayout>
  );
}

function AccountOpeningTracking({ snapshot, onEdit, demo }: {
  snapshot: OpeningApplication & { state: keyof typeof tracking }; onEdit: () => void; demo?: boolean;
}) {
  const state = snapshot.state;
  const approved = state === "APPROVED";
  const rejected = state === "REJECTED";
  const corrections = state === "CHANGES_REQUESTED";
  const contentRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (document.activeElement === document.body) contentRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <AccountOpeningLayout step={5} action={demo ? undefined : <LogoutButton compact />}>
      <section ref={contentRef} tabIndex={-1} aria-live="polite" className="space-y-5 outline-none">
        {approved || rejected ? (
          <LoadingConfirmation key={state} size={56} animate outcome={approved ? "success" : "failure"} />
        ) : (
          <div className="grid size-12 place-items-center rounded-xl border border-border bg-card text-primary">
            {corrections ? <CircleAlert size={22} aria-hidden="true" /> : <Clock3 size={22} aria-hidden="true" />}
          </div>
        )}
        <Title {...tracking[state]} />
        {snapshot.reason && (
          <div className="grid gap-1.5 rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">{corrections ? "O que precisa mudar" : "Motivo da decisão"}</p>
            <p className="wrap-anywhere text-pretty whitespace-pre-line text-sm">{snapshot.reason}</p>
          </div>
        )}
        <dl className="grid gap-2.5 border-t border-border pt-4 text-sm">
          {snapshot.submittedAt && (
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <dt className="text-muted-foreground">Enviada em</dt>
              <dd>{formatOpeningDate(snapshot.submittedAt)}</dd>
            </div>
          )}
          {snapshot.decidedAt ? (
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <dt className="text-muted-foreground">Análise concluída em</dt>
              <dd>{formatOpeningDate(snapshot.decidedAt)}</dd>
            </div>
          ) : !corrections && (
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-1">
              <dt className="text-muted-foreground">Resultado por e-mail</dt>
              <dd className="wrap-anywhere">{snapshot.owner.email}</dd>
            </div>
          )}
        </dl>
        {corrections && <Button type="button" className="h-11 w-full" onClick={onEdit}>Atualizar dados</Button>}
        {approved && <Button asChild className="h-11 w-full"><Link href="/inicio">Continuar <ArrowRight size={16} aria-hidden="true" /></Link></Button>}
      </section>
    </AccountOpeningLayout>
  );
}

export function AccountOpeningScreen({ merchantId, initial, demo = false }: {
  merchantId: string; initial?: OpeningApplication; demo?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const client = useQueryClient();
  const key = ["account-opening-application", merchantId];
  const query = useQuery({
    queryKey: key, initialData: initial, enabled: !demo, retry: false,
    queryFn: ({ signal }) => openingApplication.get(signal), staleTime: 15_000,
    refetchOnWindowFocus: ({ state }) => !editing && state.data?.state !== "DRAFT",
    refetchInterval: ({ state }) => {
      const status = state.data?.state;
      return !editing && status && ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED", "CHANGES_REQUESTED", "REJECTED"].includes(status)
        ? 20_000 : false;
    },
  });
  const snapshot = query.data;

  async function save(input: SaveOpeningApplication) {
    await client.cancelQueries({ queryKey: key });
    const result = demo && snapshot ? {
      ...snapshot, draft: input.action === "SUBMIT" ? null : input.draft,
      state: input.action === "SUBMIT" ? "SUBMITTED" as const : snapshot.state,
      submittedAt: input.action === "SUBMIT" ? new Date().toISOString() : snapshot.submittedAt,
      nextStep: input.nextStep, version: input.version + 1,
    } : await openingApplication.save(input).catch(async (error: unknown) => {
      if (!(error instanceof ApiError) || ![409, 503].includes(error.status)) throw error;
      const latest = await openingApplication.get(AbortSignal.timeout(3500)).catch(() => null);
      if (!latest || latest.state === "DRAFT" || latest.state === "CHANGES_REQUESTED") throw error;
      return latest;
    });
    client.setQueryData(key, result);
    if (input.action === "SUBMIT") setEditing(false);
    return result;
  }

  return (
    <>
      {!demo && <SessionMonitor />}
      {!snapshot ? (
        <AccountOpeningLayout step={5} action={<LogoutButton compact />}>
          <div className="space-y-4">
            {query.isError ? (
              <>
                <OperationFailure message="Não foi possível consultar sua solicitação." />
                <Button type="button" variant="outline" onClick={() => void query.refetch()}>Tentar novamente</Button>
              </>
            ) : <AuthLoadingStatus>Consultando sua solicitação…</AuthLoadingStatus>}
          </div>
        </AccountOpeningLayout>
      ) : snapshot.state === "DRAFT" || (snapshot.state === "CHANGES_REQUESTED" && editing) ? (
        <DraftWizard key={snapshot.state} snapshot={snapshot} save={save} demo={demo} onExit={() => setEditing(false)} />
      ) : (
        <AccountOpeningTracking snapshot={{ ...snapshot, state: snapshot.state }} onEdit={() => setEditing(true)} demo={demo} />
      )}
    </>
  );
}
