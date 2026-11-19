"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { DashboardPixNotice } from "@/components/layout/dashboard-pix-notices";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingIndicator, OperationFailure } from "@/components/ui/loading-indicator";
import { ToastNotice } from "@/components/ui/toast-notice";
import { ApiError } from "@/lib/api-client";
import { formatCentsToBrl } from "@/lib/money";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";
import { asaasPixMinimumMessage, MAX_PIX_AMOUNT_IN_CENTS, MIN_ASAAS_PIX_AMOUNT_IN_CENTS, pixAmountSchema, pixPaymentIdSchema, type PixReceipt, type PixReceiveGateway } from "../pix-receipt";
import { PixAmountField } from "./pix-amount-field";
import { PixFlowTitle, PixOperationSurface } from "./pix-operation-surface";
import { PixReceiptCard, receiptStatusLabels } from "./pix-receipt-card";
import { PixReceiptDetails } from "./pix-receipt-details";

type ChargeIntent = { amountInCents: number; key: string };
type Tracking =
  | { receipt: PixReceipt }
  | { reference: { id: string; amountInCents: number } };
type Mode = "demo" | "sandbox";
type StoredTracking = { intent: ChargeIntent } | { receipt: Pick<PixReceipt, "id" | "amountInCents"> };

function writeTracking(key: string, data: StoredTracking | null) {
  try {
    if (data) sessionStorage.setItem(key, JSON.stringify(data));
    else sessionStorage.removeItem(key);
  } catch {
    // The current page can still follow the operation when storage is disabled.
  }
}

function waiting(receipt: PixReceipt) {
  return receipt.status === "preparing" || receipt.status === "pending";
}

function getError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function shouldRetryStatus(count: number, failure: Error) {
  return count < 1 && (!(failure instanceof ApiError) || failure.status >= 500);
}

export function DashboardPixReceive({ gateway, environment, accountId, available = true, inline = false, onReceiptChange }: {
  gateway: PixReceiveGateway;
  environment: Mode;
  accountId: string;
  available?: boolean;
  inline?: boolean;
  onReceiptChange: () => void;
}) {
  const amountId = useId();
  const queryClient = useQueryClient();
  const { reduceMotion } = usePreferences();
  const [dialogOpen, setOpen] = useState(false);
  const open = inline || dialogOpen;
  const [amountInCents, setAmountInCents] = useState(0);
  const [amountError, setAmountError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [intent, setIntent] = useState<ChargeIntent | null>(null);
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [numberAnimation, setNumberAnimation] = useState<{ from: number; sequence: number } | null>(null);
  const [animateOutcome, setAnimateOutcome] = useState(false);
  const [simulationRequestedFor, setSimulationRequestedFor] = useState<string>();
  const [manualCheck, setManualCheck] = useState<{ id: string; until: number }>();
  const formInput = useRef<HTMLInputElement>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const noticeOrigin = useRef<HTMLElement | null>(null);
  const submittingLock = useRef(false);
  const nextAnimation = useRef(0);
  const lastStatus = useRef<{ id: string; status: PixReceipt["status"] }>(null);
  const storeKey = "slopay:pix-receive:" + environment + ":" + accountId;
  const trackedReference = tracking && ("receipt" in tracking ? tracking.receipt : tracking.reference);
  const initialReceipt = tracking && "receipt" in tracking ? tracking.receipt : undefined;
  const queryKey = ["dashboard-pix", environment, accountId, trackedReference?.id] as const;

  useEffect(() => {
    if (environment !== "sandbox") return;

    try {
      const saved = JSON.parse(sessionStorage.getItem(storeKey) ?? "null") as StoredTracking | null;
      if (!saved) return;
      if ("receipt" in saved && pixPaymentIdSchema.safeParse(saved.receipt?.id).success &&
        pixAmountSchema.safeParse(saved.receipt.amountInCents).success) {
        setTracking({ reference: saved.receipt });
      } else if ("intent" in saved && pixPaymentIdSchema.safeParse(saved.intent?.key).success &&
        pixAmountSchema.safeParse(saved.intent.amountInCents).success) {
        setIntent(saved.intent);
        setAmountInCents(saved.intent.amountInCents);
      }
    } catch {
      // Ignore stale or unavailable session storage.
    }
  }, [environment, storeKey]);

  const status = useQuery({
    queryKey,
    enabled: Boolean(trackedReference),
    queryFn: async ({ signal }) => {
      if (!trackedReference) throw new ApiError("Cobrança não encontrada.", 404);
      const result = await gateway.get(trackedReference.id, signal);
      if (result.amountInCents !== trackedReference.amountInCents) {
        throw new ApiError("O valor da cobrança não pôde ser confirmado.", 503);
      }
      return result;
    },
    retry: shouldRetryStatus,
    refetchOnWindowFocus: (query) => !query.state.data || waiting(query.state.data),
    refetchInterval: (query) => {
      const error = query.state.error;
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) return false;
      const receipt = query.state.data ?? initialReceipt;
      if (receipt?.status === "review" && manualCheck?.id === receipt.id && Date.now() < manualCheck.until) return 2_000;
      if (receipt && !waiting(receipt)) return false;
      if (!trackedReference) return false;
      return error || receipt?.status === "pending" ? 5_000 : 2_000;
    },
  });
  const observedReceipt = status.data ?? initialReceipt;
  const knownReceipt = observedReceipt ?? (trackedReference ? {
    ...trackedReference, status: "preparing" as const, qrCodeAvailable: false,
  } : undefined);
  const inaccessible = status.error instanceof ApiError && [401, 403, 404].includes(status.error.status);
  const receipt = knownReceipt && inaccessible
    ? { ...knownReceipt, status: "unavailable" as const, qrCodeAvailable: false }
    : knownReceipt;
  const receiptId = receipt?.id;
  const receiptFinished = Boolean(receipt && !waiting(receipt));
  const qrCode = useQuery({
    queryKey: [...queryKey, "qr"],
    queryFn: ({ signal }) => gateway.qrCode!(receipt!.id, signal),
    enabled: Boolean(open && receipt?.status === "pending" && receipt.qrCodeAvailable && gateway.qrCode),
    staleTime: 60_000,
    retry: shouldRetryStatus,
  });

  useLayoutEffect(() => {
    if (!observedReceipt) return;
    const { id, status } = observedReceipt;
    const previous = lastStatus.current;
    if (previous?.id === id && previous.status === status) return;
    lastStatus.current = { id, status };
    if (previous?.id === id && (status === "paid" || status === "failed")) {
      setAnimateOutcome(!reduceMotion && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      if (status === "paid") onReceiptChange();
    }
  }, [onReceiptChange, observedReceipt, reduceMotion]);

  useEffect(() => {
    if (!open) return;
    (receiptId ? detailHeading.current : formInput.current)?.focus({ preventScroll: true });
  }, [open, receiptId, receiptFinished]);

  useEffect(() => {
    if (open && amountError) formInput.current?.focus({ preventScroll: true });
  }, [open, amountError]);

  function changeOpen(next: boolean) {
    setNumberAnimation(null);
    if (receiptFinished) setAnimateOutcome(false);
    setOpen(next);
  }

  function edit(cents: number) {
    setAmountInCents(cents);
    setNumberAnimation(null);
    setAmountError("");
    setSubmitError("");
  }

  function choosePreset(cents: number) {
    if (amountInCents !== cents) setNumberAnimation({ from: amountInCents, sequence: ++nextAnimation.current });
    setAmountInCents(cents);
    setAmountError("");
    setSubmitError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!available || submittingLock.current) return;
    const amount = pixAmountSchema.safeParse(intent?.amountInCents ?? amountInCents);
    if (!amount.success) {
      const minimum = environment === "sandbox" ? MIN_ASAAS_PIX_AMOUNT_IN_CENTS : 1;
      setAmountError(`Informe um valor entre ${formatCentsToBrl(minimum)} e ${formatCentsToBrl(MAX_PIX_AMOUNT_IN_CENTS)}.`);
      return;
    }
    if (!intent && environment === "sandbox" && amount.data < MIN_ASAAS_PIX_AMOUNT_IN_CENTS) {
      setAmountError(asaasPixMinimumMessage);
      return;
    }

    const currentIntent = intent ?? { amountInCents: amount.data, key: crypto.randomUUID() };
    submittingLock.current = true;
    setSubmitting(true);
    setIntent(currentIntent);
    setSubmitError("");
    if (environment === "sandbox") writeTracking(storeKey, { intent: currentIntent });
    try {
      const result = await gateway.create(currentIntent.amountInCents, currentIntent.key);
      setTracking({ receipt: result });
      setIntent(null);
      setAnimateOutcome((result.status === "paid" || result.status === "failed") &&
        !reduceMotion && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      if (environment === "sandbox") {
        writeTracking(storeKey, { receipt: { id: result.id, amountInCents: result.amountInCents } });
      }
      onReceiptChange();
    } catch (error) {
      const message = getError(error, "Não foi possível gerar a cobrança Pix.");
      const belowMinimum = error instanceof ApiError && error.code === "PIX_AMOUNT_BELOW_MINIMUM";
      if (belowMinimum || environment === "demo" ||
        (!intent && error instanceof ApiError && [400, 401, 403, 404, 422, 429].includes(error.status))) {
        setIntent(null);
        if (environment === "sandbox") writeTracking(storeKey, null);
      }
      if (belowMinimum) setAmountError(message);
      else setSubmitError(message);
    } finally {
      submittingLock.current = false;
      setSubmitting(false);
    }
  }

  async function simulate() {
    if (!receipt) return;
    if (gateway.requestSimulation) {
      await gateway.requestSimulation(receipt.id);
      setSimulationRequestedFor(receipt.id);
      void status.refetch({ cancelRefetch: false });
      return;
    }
    if (!gateway.simulate) return;
    await queryClient.cancelQueries({ queryKey, exact: true });
    const updated = await gateway.simulate(receipt.id);
    queryClient.setQueryData(queryKey, updated);
  }

  const reconciliation = useMutation({
    mutationFn: (id: string) => gateway.requestReconciliation!(id),
    onSuccess: (_, id) => {
      setManualCheck({ id, until: Date.now() + 20_000 });
      toast.success("Consulta encaminhada.");
      void status.refetch({ cancelRefetch: false });
    },
    onError: (error) => toast.error(getError(error, "Não foi possível consultar a cobrança.")),
  });

  function startNewCharge() {
    setTracking(null);
    setAnimateOutcome(false);
    setSimulationRequestedFor(undefined);
    setAmountInCents(0);
    setAmountError("");
    setSubmitError("");
    if (environment === "sandbox") writeTracking(storeKey, null);
  }

  function openFromNotice(origin: HTMLElement | null) {
    if (inline) {
      detailHeading.current?.scrollIntoView({ block: "nearest" });
      detailHeading.current?.focus({ preventScroll: true });
      return;
    }
    noticeOrigin.current = origin;
    changeOpen(true);
  }

  return (
    <>
      <ToastNotice
        variant="warning"
        message={status.isError && receipt && waiting(receipt) ? "O status está temporariamente indisponível. A consulta será retomada." : null}
      />
      <ToastNotice
        variant="warning"
        message={receipt?.status === "review" ? "Consulte esta cobrança antes de emitir outra para o mesmo pagamento." : null}
        persistent
      />
      <PixOperationSurface
        inline={inline}
        open={open}
        onOpenChange={changeOpen}
        trigger={
          <button ref={trigger} type="button" aria-label="Receber Pix" onClick={() => { noticeOrigin.current = null; }}
            className="flex flex-col items-center justify-center rounded-xl border border-border bg-card/60 p-4 text-center transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <span className="mb-2 grid size-10 place-items-center rounded-full bg-success-surface text-success">
              <ArrowDownLeft aria-hidden="true" className="size-5" />
            </span>
            <span className="text-sm font-semibold">Receber Pix</span>
            <span className="mt-0.5 text-[11px] text-muted-foreground">Criar cobrança QR</span>
          </button>
        }
        onOpenAutoFocus={(event) => {
          if (!receipt && !intent && formInput.current) {
            event.preventDefault();
            formInput.current.focus();
          }
        }}
        onCloseAutoFocus={(event) => {
          const origin = noticeOrigin.current;
          noticeOrigin.current = null;
          if (origin?.isConnected) {
            event.preventDefault();
            origin.focus({ preventScroll: true });
          }
        }}
      >
        {receipt ? (
          <PixReceiptDetails
            receipt={receipt}
            environment={environment}
            inline={inline}
            headingRef={detailHeading}
            code={!qrCode.isError ? qrCode.data : undefined}
            qrError={qrCode.isError ? getError(qrCode.error, "Não foi possível obter o QR Code.") : undefined}
            qrFetching={qrCode.isFetching}
            onRetryQr={() => { void status.refetch(); void qrCode.refetch(); }}
            onSimulate={gateway.simulate || (gateway.requestSimulation && receipt.status === "pending") ? simulate : undefined}
            simulationRequested={simulationRequestedFor === receipt.id}
            onReconcile={gateway.requestReconciliation && receipt.status === "review" ? () => reconciliation.mutate(receipt.id) : undefined}
            reconciling={reconciliation.isPending}
            animateOutcome={animateOutcome}
            onOutcomeEnd={() => setAnimateOutcome(false)}
            onClose={inline ? undefined : () => changeOpen(false)}
            onNew={startNewCharge}
          />
        ) : (
          <>
            {!inline && <PixFlowTitle inline={false} className="sr-only">Receber Pix</PixFlowTitle>}
            <form className="space-y-5" onSubmit={submit} aria-busy={submitting}>
              <PixAmountField
                id={amountId}
                inputRef={formInput}
                cents={amountInCents}
                showHeading={!inline}
                animation={numberAnimation}
                disabled={submitting || Boolean(intent)}
                invalid={Boolean(amountError)}
                onEdit={edit}
                onPreset={choosePreset}
                onAnimationEnd={() => setNumberAnimation(null)}
              />
              {amountError && <span id={amountId + "-error"} className="sr-only">{amountError}</span>}
              <ToastNotice message={amountError} persistent />
              {submitError && (intent
                ? <p role="status" className="text-sm text-muted-foreground">{submitError}</p>
                : <OperationFailure message={submitError} />)}
              <Button
                type="submit"
                disabled={submitting || !available}
                aria-describedby={!available ? amountId + "-availability" : undefined}
                className="h-11 w-full"
              >
                {submitting && <LoadingIndicator />}
                {submitting ? "Gerando cobrança…" : intent ? "Retomar cobrança" : "Receber"}
              </Button>
            </form>
          </>
        )}
      </PixOperationSurface>
      {receipt && observedReceipt && (
        <DashboardPixNotice
          notice={{
            id: receipt.id,
            kind: "receive",
            status: receipt.status,
            title: receiptStatusLabels[receipt.status],
            amountInCents: receipt.amountInCents,
            tone: receipt.status === "paid" ? "success" : waiting(receipt) ? "info" : "warning",
          }}
          visible={!open}
          onOpen={waiting(receipt) ? openFromNotice : undefined}
          renderToast={(dismiss) => (
            <PixReceiptCard
              receipt={receipt}
              environment={environment}
              checkingError={status.isError}
              onOpen={() => openFromNotice(null)}
              onDismiss={() => {
                dismiss();
                trigger.current?.focus({ preventScroll: true });
              }}
              onCheck={() => status.refetch()}
              animateOutcome={animateOutcome}
              onOutcomeEnd={() => setAnimateOutcome(false)}
            />
          )}
        />
      )}
    </>
  );
}
