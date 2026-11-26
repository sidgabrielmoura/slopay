"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";
import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, FlaskConical } from "lucide-react";
import { DashboardPixNotice } from "@/components/layout/dashboard-pix-notices";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { BrazilianInput } from "@/components/ui/brazilian-input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToastNotice } from "@/components/ui/toast-notice";
import { CodeSlots, useCodeVerification } from "@/features/auth/components/code-slots";
import { OperationFactorActions, usePasskeyConfirmation } from "@/features/auth/components/passkey-confirmation";
import { ExpenseCategorySelect } from "@/features/expenses/components/expense-category-select";
import { expenseKeys } from "@/features/expenses/expense-gateway";
import { expenseCategoryPresentation, type ExpenseCategory } from "@/features/expenses/expenses";
import { PixAmountField } from "@/features/pix-receive/components/pix-amount-field";
import { PixFlowTitle, PixOperationSurface } from "@/features/pix-receive/components/pix-operation-surface";
import { MAX_PIX_AMOUNT_IN_CENTS, pixPaymentIdSchema } from "@/features/pix-receive/pix-receipt";
import { ApiError } from "@/lib/api-client";
import { pixKeyInputMask } from "@/lib/validators";
import { usePreferences } from "@/providers/preferences-provider";
import {
  isWithdrawalFinal,
  normalizeWithdrawalKey,
  pixKeyLabels,
  pixKeyTypeSchema,
  slopayWithdrawalFee,
  withdrawalIssue,
  withdrawalStatusLabel,
  withdrawalUnavailable,
  type PixKeyType,
  type PixWithdrawal,
  type WithdrawalDraftInput,
  type WithdrawalProof,
} from "../pix-withdrawal";
import { asaasPixWithdrawals, recentWithdrawalsKey, withdrawalOptionsKey } from "../pix-withdrawal-gateway";
import { PixWithdrawalCard, PixWithdrawalDetails } from "./pix-withdrawal-status";

type WithdrawalDraft = {
  id: string;
  destination: string;
  data: WithdrawalDraftInput;
};

const unavailableStatus = "O saque ainda não apareceu na consulta. Confira a referência antes de repetir a operação.";
const isMissing = (error: unknown) => error instanceof ApiError && error.status === 404;
const isAccessError = (error: unknown) => error instanceof ApiError && [401, 403].includes(error.status);

function saveWithdrawalReference(key: string, id: string | null) {
  try {
    if (id) sessionStorage.setItem(key, id);
    else sessionStorage.removeItem(key);
  } catch {
    // Tracking still works on the current page.
  }
}

export function DashboardPixWithdraw({ accountId, available, pendingWithdrawal, selectedWithdrawal, inline = false, onCompleted }: {
  accountId: string;
  available: boolean;
  pendingWithdrawal?: PixWithdrawal;
  selectedWithdrawal: { withdrawal: PixWithdrawal } | null;
  inline?: boolean;
  onCompleted: () => void;
}) {
  const id = useId();
  const queries = useQueryClient();
  const { reduceMotion } = usePreferences();
  const storeKey = "slopay:pix-withdrawal:" + accountId;
  const [dialogOpen, setOpen] = useState(false);
  const open = inline || dialogOpen;
  const [amount, setAmount] = useState(0);
  const [keyType, setKeyType] = useState<PixKeyType>("EMAIL");
  const [pixKey, setPixKey] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory | null>(null);
  const [draft, setDraft] = useState<WithdrawalDraft | null>(null);
  const [authorizing, setAuthorizing] = useState(false);
  const [trackedId, setTrackedId] = useState<string | null>(null);
  const [viewedId, setViewedId] = useState<string | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);
  const [animation, setAnimation] = useState<{ from: number; sequence: number } | null>(null);
  const [animateOutcome, setAnimateOutcome] = useState(false);
  const [validation, setValidation] = useState<{ field: "amount" | "key"; message: string } | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const keyRef = useRef<HTMLInputElement>(null);
  const focusKeyOnReturn = useRef(false);
  const modalHeading = useRef<HTMLHeadingElement>(null);
  const dismissedId = useRef<string | null>(null);
  const historyTrigger = useRef<HTMLElement | null>(null);
  const uncertainSubmission = useRef(false);
  const [submissionUncertain, setSubmissionUncertain] = useState(false);
  const nextAnimation = useRef(0);
  const lastStatus = useRef<{ id: string; state: PixWithdrawal["state"] }>(null);

  const options = useQuery({
    queryKey: withdrawalOptionsKey(accountId),
    queryFn: ({ signal }) => asaasPixWithdrawals.options(signal),
    enabled: open && available && !trackedId,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const statusKey = ["pix-withdrawal", accountId, trackedId] as const;
  const status = useQuery({
    queryKey: statusKey,
    queryFn: ({ signal }) => asaasPixWithdrawals.get(trackedId!, signal),
    enabled: available && Boolean(trackedId),
    retry: false,
    refetchOnWindowFocus: (query) => !query.state.data || !isWithdrawalFinal(query.state.data.state),
    refetchInterval: (query) => {
      if (isAccessError(query.state.error) || isMissing(query.state.error)) return false;
      const state = query.state.data?.state;
      if (state && isWithdrawalFinal(state)) return false;
      return state === "REVIEW" || state === "BLOCKED" || query.state.error ? 10_000 : 2_000;
    },
  });
  const withdrawal = status.data;
  const historyStatus = useQuery({
    queryKey: ["pix-withdrawal", accountId, viewedId],
    queryFn: ({ signal }) => asaasPixWithdrawals.get(viewedId!, signal),
    enabled: available && open && !!viewedId && viewedId !== trackedId,
    retry: false,
  });
  const viewingHistory = Boolean(viewedId && viewedId !== trackedId);
  const displayedStatus = viewingHistory ? historyStatus : status;
  const displayedWithdrawal = displayedStatus.data;
  const displayedId = viewedId ?? trackedId;
  const hasWithdrawal = Boolean(displayedWithdrawal);
  const step = displayedId ? "status" : authorizing ? "code" : draft ? "review" : "details";
  const focusedStep = useRef<typeof step>("details");

  useEffect(() => {
    if (!available) return;
    try {
      const saved = pixPaymentIdSchema.safeParse(sessionStorage.getItem(storeKey));
      if (saved.success) setTrackedId(saved.data);
    } catch {
      // Ignore storage that is unavailable in this browser.
    }
    setCheckedStorage(true);
  }, [available, storeKey]);

  useEffect(() => {
    if (!checkedStorage || !pendingWithdrawal || trackedId || draft || pendingWithdrawal.id === dismissedId.current) return;
    queries.setQueryData(["pix-withdrawal", accountId, pendingWithdrawal.id], pendingWithdrawal);
    saveWithdrawalReference(storeKey, pendingWithdrawal.id);
    setTrackedId(pendingWithdrawal.id);
  }, [accountId, checkedStorage, draft, pendingWithdrawal, queries, storeKey, trackedId]);

  useEffect(() => {
    if (!available || !selectedWithdrawal) return;
    const { withdrawal } = selectedWithdrawal;
    queries.setQueryData(["pix-withdrawal", accountId, withdrawal.id], (cached: PixWithdrawal | undefined) => cached ?? withdrawal);
    setViewedId(withdrawal.id);
    historyTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
  }, [accountId, available, queries, selectedWithdrawal]);

  useLayoutEffect(() => {
    if (!withdrawal) return;
    const { id: currentId, state } = withdrawal;
    const previous = lastStatus.current;
    if (previous?.id === currentId && previous.state === state) return;
    lastStatus.current = { id: currentId, state };
    if (previous?.id !== currentId) return;
    void queries.invalidateQueries({ queryKey: recentWithdrawalsKey(accountId) });
    if (state === "DONE" || state === "FAILED") {
      setAnimateOutcome(!reduceMotion && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
    if (state === "DONE") {
      void queries.invalidateQueries({ queryKey: withdrawalOptionsKey(accountId) });
      void queries.invalidateQueries({ queryKey: expenseKeys.account(accountId) });
      onCompleted();
    }
  }, [accountId, onCompleted, queries, reduceMotion, withdrawal]);

  useEffect(() => {
    if (!open) return;
    const previousStep = focusedStep.current;
    focusedStep.current = step;
    if (step === "details") {
      if (inline && previousStep === "details" && !focusKeyOnReturn.current) return;
      const target = focusKeyOnReturn.current ? keyRef.current : amountRef.current;
      focusKeyOnReturn.current = false;
      target?.focus({ preventScroll: true });
    }
    if (step === "review" || step === "status") modalHeading.current?.focus({ preventScroll: true });
  }, [inline, open, step, hasWithdrawal]);

  function forgetDraft() {
    setDraft(null);
    setAuthorizing(false);
    setPixKey("");
    setKeyType("EMAIL");
    setExpenseCategory(null);
    setAmount(0);
    setValidation(null);
    setAnimation(null);
    setSubmissionUncertain(false);
    uncertainSubmission.current = false;
  }

  function follow(id: string, result?: PixWithdrawal) {
    if (result) {
      queries.setQueryData(["pix-withdrawal", accountId, id], result);
      if (result.state === "DONE" || result.state === "FAILED") {
        setAnimateOutcome(!reduceMotion && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      }
    }
    saveWithdrawalReference(storeKey, id);
    setTrackedId(id);
    forgetDraft();
    void queries.invalidateQueries({ queryKey: recentWithdrawalsKey(accountId) });
  }

  async function submitWithdrawal(proof: WithdrawalProof) {
    if (!draft) throw new ApiError(withdrawalUnavailable, 503);
    let dispatched = false;
    try {
      const review = !development && "verificationCode" in proof
        ? (await asaasPixWithdrawals.passkeyOptions(draft.id, draft.data)).review : undefined;
      saveWithdrawalReference(storeKey, draft.id);
      dispatched = true;
      return await asaasPixWithdrawals.create(draft.id, { ...draft.data, ...proof, ...(review && { review }) });
    } catch (error) {
      if (!uncertainSubmission.current && error instanceof ApiError &&
        ["PIX_WITHDRAWAL_FEE_CHANGED", "SLOPAY_WITHDRAWAL_FEE_CHANGED", "PIX_WITHDRAWAL_INSUFFICIENT_BALANCE"].includes(error.code ?? "")) {
        saveWithdrawalReference(storeKey, null);
        setAuthorizing(false);
        setDraft(null);
        setValidation({ field: "amount", message: error.message });
        void options.refetch();
        throw error;
      }
      if (!dispatched) throw error;
      if (error instanceof ApiError && error.code === "PIX_WITHDRAWAL_PENDING") {
        saveWithdrawalReference(storeKey, null);
        try {
          const recent = await asaasPixWithdrawals.recent();
          const pending = recent.withdrawals.find(({ state }) => !isWithdrawalFinal(state));
          if (pending) return pending;
        } catch {
          // Keep the draft available if status lookup fails.
        }
        throw error;
      }
      if (!(error instanceof ApiError) || error.status >= 500 || error.status === 409) {
        uncertainSubmission.current = true;
        setSubmissionUncertain(true);
        const recovered = await asaasPixWithdrawals.get(draft.id).catch(() => null);
        if (recovered) return recovered;
      } else if (!uncertainSubmission.current) {
        saveWithdrawalReference(storeKey, null);
      }
      if (!uncertainSubmission.current && error instanceof ApiError && error.code === "PIX_WITHDRAWAL_INVALID_KEY") {
        focusKeyOnReturn.current = true;
        setAuthorizing(false);
        setDraft(null);
        setValidation({ field: "key", message: error.message });
      }
      throw error;
    }
  }

  const verification = useCodeVerification<PixWithdrawal>({
    failureMessage: withdrawalUnavailable,
    isRejection: (error) => error instanceof ApiError && error.code === "PIX_WITHDRAWAL_CODE_REJECTED",
    verify: (verificationCode) => submitWithdrawal({ verificationCode }),
    onSuccess: (result) => follow(result.id, result),
  });

  const passkey = usePasskeyConfirmation({
    scope: open && step === "code" ? draft?.id ?? null : null,
    loadOptions: () => draft ? asaasPixWithdrawals.passkeyOptions(draft.id, draft.data) : Promise.resolve({ options: null }),
    verify: (credential) => submitWithdrawal({ credential }),
    verifySession: (sessionConfirmation) => submitWithdrawal({ sessionConfirmation }),
    onSuccess: (result) => follow(result.id, result),
  });
  const authorizingBusy = verification.busy || passkey.busy;

  function changeOpen(next: boolean) {
    if (!next) {
      if (step === "code" && authorizingBusy) return;
      if (draft && uncertainSubmission.current) follow(draft.id);
      else forgetDraft();
      setViewedId(null);
      setAnimateOutcome(false);
    }
    setOpen(next);
  }

  function clearStatus() {
    dismissedId.current = trackedId;
    saveWithdrawalReference(storeKey, null);
    setTrackedId(null);
    setAnimateOutcome(false);
    verification.reset();
    if (!open) trigger.current?.focus();
  }

  function openFromNotice(origin: HTMLElement | null) {
    if (inline) {
      modalHeading.current?.scrollIntoView({ block: "nearest" });
      modalHeading.current?.focus({ preventScroll: true });
      return;
    }
    historyTrigger.current = origin;
    changeOpen(true);
  }

  function choosePreset(cents: number) {
    if (amount !== cents) setAnimation({ from: amount, sequence: ++nextAnimation.current });
    setAmount(cents);
    setValidation(null);
  }

  function review(simulate: boolean) {
    const balance = options.data?.availableBalanceInCents;
    if (balance === undefined) return;
    const fee = options.data?.feeLimitInCents;
    const platformFee = simulate ? undefined : slopayWithdrawalFee(options.data?.slopayPricing, [amount]);
    const debit = amount + (fee ?? 0) + (platformFee ?? 0);
    if (amount < 1 || debit > balance || debit > MAX_PIX_AMOUNT_IN_CENTS) {
      setValidation({
        field: "amount",
        message: amount < 1 ? "Informe um valor para sacar."
          : debit > MAX_PIX_AMOUNT_IN_CENTS ? "O valor com as tarifas excede o limite do débito."
          : "O saldo disponível não cobre o valor total e as tarifas.",
      });
      amountRef.current?.focus();
      return;
    }
    const destination = simulate ? options.data?.simulationDestination : pixKey.trim();
    if (!destination) {
      if (simulate) return;
      setValidation({ field: "key", message: "Informe a chave Pix de destino." });
      keyRef.current?.focus();
      return;
    }
    const normalized = simulate ? undefined : normalizeWithdrawalKey(keyType, destination);
    if (normalized === null) {
      setValidation({
        field: "key",
        message: keyType === "PHONE" ? "Informe o telefone completo com DDD." : `Informe o ${pixKeyLabels[keyType]} completo.`,
      });
      keyRef.current?.focus();
      return;
    }
    setAnimation(null);
    setValidation(null);
    setDraft({
      id: crypto.randomUUID(),
      destination,
      data: {
        amountInCents: amount,
        pixKeyType: simulate ? "EMAIL" : keyType,
        simulate,
        ...(fee != null && { feeLimitInCents: fee }),
        ...(platformFee !== undefined && { slopayFeeInCents: platformFee }),
        ...(expenseCategory && { expenseCategory }),
        ...(normalized !== undefined && { pixKey: normalized }),
      },
    });
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    review(false);
  }

  const development = useDevelopmentFeatures();
  const canSimulate = development && options.data?.simulationAvailable;
  const statusError = isMissing(displayedStatus.error) ? unavailableStatus
    : displayedStatus.isError ? displayedStatus.error.message : null;
  const reviewTitle = draft?.data.simulate ? "Revisar simulação" : "Revisar saque";

  return (
    <>
      <ToastNotice message={withdrawalIssue(displayedWithdrawal)} variant="warning" />
      <ToastNotice message={statusError} variant="warning" />
      <PixOperationSurface
        inline={inline}
        open={open}
        onOpenChange={changeOpen}
        trigger={
          <button
            ref={trigger}
            type="button"
            disabled={!available}
            onClick={() => { historyTrigger.current = null; }}
            className="flex flex-col items-center justify-center rounded-xl border border-border bg-card/60 p-4 text-center transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
          >
            <span className="mb-2 grid size-10 place-items-center rounded-full bg-primary/20 text-primary">
              <ArrowUpRight aria-hidden="true" className="size-5" />
            </span>
            <span className="text-sm font-semibold">Saque Direto</span>
            <span className="mt-0.5 text-[11px] text-muted-foreground">
              {available ? "Transferir via Pix" : "Indisponível para esta conta"}
            </span>
          </button>
        }
        onOpenAutoFocus={(event) => {
          const target = displayedId ? modalHeading.current : amountRef.current;
          if (target) {
            event.preventDefault();
            target.focus();
          }
        }}
        onCloseAutoFocus={(event) => {
          const returnFocus = historyTrigger.current;
          historyTrigger.current = null;
          if (returnFocus?.isConnected) {
            event.preventDefault();
            returnFocus.focus();
            return;
          }
        }}
      >
        {displayedId ? (
          displayedWithdrawal ? (
            <PixWithdrawalDetails
              withdrawal={displayedWithdrawal}
              heading={modalHeading}
              inline={inline}
              animate={!viewingHistory && animateOutcome}
              onEnd={() => setAnimateOutcome(false)}
              onClose={inline ? undefined : () => changeOpen(false)}
              onNew={!viewedId ? clearStatus : undefined}
            />
          ) : (
            <div className="grid gap-4 text-center">
              <PixFlowTitle inline={inline} ref={modalHeading} tabIndex={-1} className="outline-none" aria-live="polite">
                {displayedStatus.isError ? "Consulta do saque indisponível" : "Consultando saque"}
              </PixFlowTitle>
              <p className="break-all text-xs text-muted-foreground">Referência {displayedId}</p>
              {displayedStatus.isError && (
                <Button type="button" variant="outline" disabled={displayedStatus.isFetching} onClick={() => void displayedStatus.refetch()}>Consultar novamente</Button>
              )}
              {!viewedId && isMissing(displayedStatus.error) && (
                <Button type="button" variant="ghost" onClick={clearStatus}>Encerrar acompanhamento</Button>
              )}
            </div>
          )
        ) : draft ? (
          <div className="grid gap-5">
            <PixFlowTitle inline={inline} ref={modalHeading} tabIndex={-1} className="text-center outline-none">
              {authorizing ? "Autorizar saque" : reviewTitle}
            </PixFlowTitle>
            <div className="grid gap-2 text-center">
              <p className="text-4xl font-bold tracking-tight tabular-nums"><PanelAmount cents={draft.data.amountInCents} /></p>
              <p className="text-sm text-muted-foreground">{draft.data.simulate ? "Chave de teste · Sandbox" : "Destino · " + pixKeyLabels[draft.data.pixKeyType]}</p>
              <p className="break-all text-sm font-medium">{draft.destination}</p>
              {draft.data.expenseCategory && (
                <p className="text-sm text-muted-foreground">{expenseCategoryPresentation[draft.data.expenseCategory].label}</p>
              )}
            </div>
            {draft.data.feeLimitInCents !== undefined && (
              <dl className="grid gap-2 rounded-lg border border-border p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-muted-foreground">Tarifa máxima do provedor</dt>
                  <dd><PanelAmount cents={draft.data.feeLimitInCents} /></dd>
                </div>
                {draft.data.slopayFeeInCents !== undefined && <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-muted-foreground">Tarifa do Slopay</dt>
                  <dd><PanelAmount cents={draft.data.slopayFeeInCents} /></dd>
                </div>}
                <div className="flex flex-wrap justify-between gap-2 font-medium">
                  <dt>Débito máximo</dt>
                  <dd><PanelAmount cents={draft.data.amountInCents + draft.data.feeLimitInCents + (draft.data.slopayFeeInCents ?? 0)} /></dd>
                </div>
              </dl>
            )}
            {authorizing ? (
              <>
                <OperationFactorActions prompt={passkey} label="Autorizar saque">
                  <CodeSlots
                    {...verification.field}
                    id={id + "-code"}
                    format="totp"
                    label="Código do autenticador"
                    autoFocus
                    pendingLabel="Autorizando saque…"
                    successLabel="Autorização registrada."
                  />
                  {passkey.available && (
                    <Button type="button" variant="outline" disabled={authorizingBusy} onClick={() => {
                      verification.reset();
                      passkey.choosePasskey();
                    }}>Usar biometria</Button>
                  )}
                </OperationFactorActions>
                {submissionUncertain ? (
                  <Button type="button" variant="outline" disabled={authorizingBusy} onClick={() => follow(draft.id)}>Consultar saque</Button>
                ) : (
                  <Button type="button" variant="ghost" disabled={authorizingBusy} onClick={() => {
                    verification.reset();
                    setAuthorizing(false);
                  }}>Voltar à revisão</Button>
                )}
              </>
            ) : (
              <div className="grid gap-2">
                <Button type="button" className="h-11" onClick={() => {
                  verification.reset();
                  setAuthorizing(true);
                }}>Continuar para autorização</Button>
                <Button type="button" variant="ghost" onClick={() => {
                  setDraft(null);
                  void options.refetch();
                }}>Editar dados</Button>
              </div>
            )}
          </div>
        ) : (
          <form noValidate className="grid gap-4" onSubmit={submitForm}>
            {!inline && <PixFlowTitle inline={false} className="sr-only">Sacar Pix</PixFlowTitle>}
            <PixAmountField
              id={id + "-amount"}
              inputRef={amountRef}
              cents={amount}
              direction="withdraw"
              showHeading={!inline}
              animation={animation}
              disabled={false}
              invalid={validation?.field === "amount"}
              onEdit={(cents) => {
                setAmount(cents);
                setAnimation(null);
                setValidation(null);
              }}
              onPreset={choosePreset}
              onAnimationEnd={() => setAnimation(null)}
            />
            <p className="text-center text-xs text-muted-foreground" role="status">
              {options.data ? <>Saldo disponível <PanelAmount cents={options.data.availableBalanceInCents} /></>
                : options.isError ? "Saldo indisponível" : "Consultando saldo disponível"}
            </p>
            <div className="grid gap-2">
              <label htmlFor={id + "-type"} className="text-sm font-medium">Tipo de chave Pix</label>
              <Select
                value={keyType}
                onValueChange={(value) => {
                  const type = pixKeyTypeSchema.safeParse(value);
                  if (!type.success) return;
                  setKeyType(type.data);
                  setPixKey("");
                  setValidation(null);
                }}
              >
                <SelectTrigger id={id + "-type"}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.entries(pixKeyLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor={id + "-key"} className="text-sm font-medium">Chave Pix de destino</label>
              <BrazilianInput
                id={id + "-key"}
                ref={keyRef}
                mask={pixKeyInputMask(keyType)}
                value={pixKey}
                aria-invalid={validation?.field === "key" || undefined}
                aria-describedby={validation?.field === "key" ? id + "-key-error" : undefined}
                maxLength={120}
                autoComplete="off"
                spellCheck={false}
                inputMode={keyType === "EMAIL" ? "email" : undefined}
                onChange={(event) => { setPixKey(event.target.value); setValidation(null); }}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor={id + "-category"} className="text-sm font-medium">
                Categoria <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <ExpenseCategorySelect id={id + "-category"} value={expenseCategory} onChange={setExpenseCategory} />
            </div>
            {validation && <span id={id + "-" + validation.field + "-error"} className="sr-only">{validation.message}</span>}
            <ToastNotice message={validation?.message ?? options.error?.message} persistent />
            <Button type="submit" disabled={!options.data || options.isError || options.isFetching} className="h-11">Sacar</Button>
            {canSimulate && (
              <Button type="button" variant="outline" className="h-11" onClick={() => review(true)}>
                <FlaskConical aria-hidden="true" /> Simular saque
              </Button>
            )}
            {options.isError && <Button type="button" variant="ghost" onClick={() => void options.refetch()}>Consultar saldo novamente</Button>}
          </form>
        )}
      </PixOperationSurface>
      {withdrawal && (
        <DashboardPixNotice
          notice={{
            id: withdrawal.id,
            kind: "withdraw",
            status: withdrawal.state,
            title: withdrawalStatusLabel(withdrawal),
            amountInCents: withdrawal.amountInCents,
            simulated: withdrawal.simulated,
            tone: withdrawal.state === "DONE" ? "success"
              : ["REVIEW", "BLOCKED", "FAILED", "CANCELLED"].includes(withdrawal.state) ? "warning" : "info",
          }}
          visible={!open}
          onOpen={openFromNotice}
          renderToast={(dismiss) => (
            <PixWithdrawalCard
              withdrawal={withdrawal}
              animate={animateOutcome}
              onEnd={() => setAnimateOutcome(false)}
              onDismiss={() => {
                dismiss();
                trigger.current?.focus({ preventScroll: true });
              }}
              onOpen={() => openFromNotice(null)}
            />
          )}
        />
      )}
    </>
  );
}
