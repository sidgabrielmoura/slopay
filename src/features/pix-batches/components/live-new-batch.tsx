"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";
import { OperationalDataUnavailable } from "@/components/shared/operational-data-unavailable";

import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, FlaskConical, Plus, Trash2 } from "lucide-react";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { BrazilianInput } from "@/components/ui/brazilian-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToastNotice } from "@/components/ui/toast-notice";
import { CodeSlots, useCodeVerification } from "@/features/auth/components/code-slots";
import { OperationFactorActions, usePasskeyConfirmation } from "@/features/auth/components/passkey-confirmation";
import { ExpenseCategoryLabel, ExpenseCategorySelect } from "@/features/expenses/components/expense-category-select";
import type { ExpenseCategory } from "@/features/expenses/expenses";
import { MAX_PIX_AMOUNT_IN_CENTS, pixPaymentIdSchema } from "@/features/pix-receive/pix-receipt";
import { normalizeWithdrawalKey, pixKeyLabels, pixKeyTypeSchema, type PixKeyType, type WithdrawalProof } from "@/features/pix-withdraw/pix-withdrawal";
import { asaasPixWithdrawals, withdrawalOptionsKey } from "@/features/pix-withdraw/pix-withdrawal-gateway";
import { ApiError } from "@/lib/api-client";
import { pixKeyInputMask } from "@/lib/validators";
import { usePreferences } from "@/providers/preferences-provider";
import { batchesPath, batchesUnavailable, maxBatchTransferCount, type BatchDetail, type BatchDraftInput } from "../live-batches";
import { batchKeys, liveBatchesGateway } from "../live-batches-gateway";
import { BatchStepper } from "./batch-stepper";

type TransferDraft = { id: number; pixKeyType: PixKeyType; pixKey: string; amountInCents: number; expenseCategory: ExpenseCategory | null };
type PreparedBatch = { id: string; input: BatchDraftInput };

function newTransfer(id: number): TransferDraft {
  return { id, pixKeyType: "EMAIL", pixKey: "", amountInCents: 0, expenseCategory: null };
}

export function LiveNewBatch({ merchantId, available }: { merchantId: string; available: boolean }) {
  const router = useRouter();
  const query = useQueryClient();
  const { hideValues, preferencesReady } = usePreferences();
  const formId = useId();
  const [transfers, setTransfers] = useState<TransferDraft[]>(() => [newTransfer(1), newTransfer(2)]);
  const [title, setTitle] = useState("");
  const [simulate, setSimulate] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [prepared, setPrepared] = useState<PreparedBatch>();
  const [error, setError] = useState("");
  const [invalidField, setInvalidField] = useState<string>();
  const [uncertain, setUncertain] = useState(false);
  const [lastIntent, setLastIntent] = useState<string>();
  const nextRow = useRef(2);
  const stageHeading = useRef<HTMLHeadingElement>(null);
  const canReviewValues = preferencesReady && !hideValues;
  const visibleAtConfirmation = useRef(false);
  const storageKey = "slopay:withdrawal-batch:" + merchantId;

  const development = useDevelopmentFeatures();
  const options = useQuery({
    enabled: available,
    queryKey: withdrawalOptionsKey(merchantId),
    queryFn: ({ signal }) => asaasPixWithdrawals.options(signal),
    staleTime: 15_000,
    retry: false,
  });
  const canSimulate = development && options.data?.simulationAvailable;
  const total = transfers.reduce((sum, item) => sum + item.amountInCents, 0);
  const fee = step === 0 ? options.data?.feeLimitInCents : prepared?.input.feeLimitInCents;

  useLayoutEffect(() => {
    visibleAtConfirmation.current = canReviewValues;
  }, [canReviewValues]);

  useEffect(() => {
    try {
      const saved = pixPaymentIdSchema.safeParse(sessionStorage.getItem(storageKey));
      if (saved.success) setLastIntent(saved.data);
    } catch {
      // The batch can still be followed in its history.
    }
  }, [storageKey]);

  useEffect(() => {
    if (step !== 2) stageHeading.current?.focus();
  }, [step]);

  function remember(id?: string) {
    setLastIntent(id);
    try {
      if (id) sessionStorage.setItem(storageKey, id);
      else sessionStorage.removeItem(storageKey);
    } catch {
      // Keep the current recovery link available in memory.
    }
  }

  async function submitBatch(proof: WithdrawalProof) {
    if (!prepared || !visibleAtConfirmation.current) throw new ApiError("Confira os valores antes de autorizar o lote.", 400);
    const review = !development && "verificationCode" in proof
      ? (await liveBatchesGateway.passkeyOptions(prepared.id, prepared.input)).review : undefined;
    remember(prepared.id);
    try {
      return await liveBatchesGateway.create(prepared.id, { ...prepared.input, ...proof, ...(review && { review }) });
    } catch (failure) {
      if (!uncertain && failure instanceof ApiError &&
        (failure.code === "PIX_WITHDRAWAL_FEE_CHANGED" || failure.code === "PIX_WITHDRAWAL_INSUFFICIENT_BALANCE")) {
        remember();
        setStep(0);
        setPrepared(undefined);
        setError(failure.message);
        void options.refetch();
      } else if (failure instanceof ApiError && failure.code === "PIX_WITHDRAWAL_IDEMPOTENCY_CONFLICT") {
        setUncertain(true);
      } else if (!(failure instanceof ApiError) || failure.status >= 500) {
        setUncertain(true);
        const saved = await liveBatchesGateway.get(prepared.id).catch(() => null);
        if (saved?.simulated === prepared.input.simulate && saved.transfers.length === prepared.input.transfers.length &&
          saved.transfers.every((item, index) => item.amountInCents === prepared.input.transfers[index].amountInCents &&
            item.pixKeyType === prepared.input.transfers[index].pixKeyType)) return saved;
      } else if (!uncertain) {
        remember();
      }
      throw failure;
    }
  }

  function followBatch(result: BatchDetail) {
    remember();
    query.setQueryData(batchKeys.detail(merchantId, result.id), result);
    void query.invalidateQueries({ queryKey: batchKeys.list(merchantId) });
    router.replace(batchesPath + "/" + result.id);
  }

  const verification = useCodeVerification<BatchDetail>({
    failureMessage: batchesUnavailable,
    isRejection: (failure) => failure instanceof ApiError && failure.code === "PIX_WITHDRAWAL_CODE_REJECTED",
    verify: (verificationCode) => submitBatch({ verificationCode }),
    onSuccess: followBatch,
  });
  const passkey = usePasskeyConfirmation({
    scope: step === 2 ? prepared?.id ?? null : null,
    loadOptions: () => prepared ? liveBatchesGateway.passkeyOptions(prepared.id, prepared.input) : Promise.resolve({ options: null }),
    verify: (credential) => submitBatch({ credential }),
    verifySession: (sessionConfirmation) => submitBatch({ sessionConfirmation }),
    onSuccess: followBatch,
  });
  const authorizingBusy = verification.busy || passkey.busy;

  function editTransfer(id: number, update: Partial<Omit<TransferDraft, "id">>) {
    setTransfers((current) => current.map((row) => row.id === id ? { ...row, ...update } : row));
    setInvalidField(undefined);
    setError("");
  }

  function showError(message: string, field?: string) {
    setError(message);
    setInvalidField(field);
    if (field) document.getElementById(field)?.focus();
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!available) return;
    if (!options.data || options.isFetching || options.isError) return showError("Consulte o saldo antes de revisar o lote.");
    if (simulate && !canSimulate) return showError("A simulação está indisponível.");

    const preparedTransfers: PreparedBatch["input"]["transfers"] = [];
    for (const [index, item] of transfers.entries()) {
      const field = formId + "-" + item.id;
      if (item.amountInCents < 1) return showError(`Informe o valor do Pix ${index + 1}.`, field + "-amount");
      const pixKey = simulate ? undefined : normalizeWithdrawalKey(item.pixKeyType, item.pixKey);
      if (!simulate && !pixKey) return showError(`Confira a chave Pix da transferência ${index + 1}.`, field + "-key");
      preparedTransfers.push({
        pixKeyType: simulate ? "EMAIL" : item.pixKeyType,
        ...(pixKey && { pixKey }),
        amountInCents: item.amountInCents,
        expenseCategory: item.expenseCategory,
      });
    }
    if (total + preparedTransfers.length * (fee ?? 0) > options.data.availableBalanceInCents)
      return showError("O saldo disponível não cobre o lote e as tarifas.");
    setPrepared({
      id: crypto.randomUUID(),
      input: { title: title.trim() || undefined, transfers: preparedTransfers, simulate, ...(fee != null && { feeLimitInCents: fee }) },
    });
    setError("");
    setStep(1);
  }

  function authorize() {
    if (!canReviewValues) {
      setError("Use o controle de privacidade do painel para conferir os valores antes de autorizar.");
      return;
    }
    setError("");
    verification.reset();
    setStep(2);
  }

  return (
    <div className="grid min-w-0 gap-5">
      <header className="grid gap-2">
        <Button asChild variant="ghost" className="h-11 w-fit">
          <Link href={batchesPath} prefetch={false}><ArrowLeft aria-hidden="true" /> Voltar aos lotes</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Novo lote Pix</h1>
      </header>
      <BatchStepper step={step} />
      {!available && <OperationalDataUnavailable title="Envio de lotes indisponível" />}
      <ToastNotice message={error || (options.isError ? options.error.message : null)} />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <Card className="min-w-0">
          <CardHeader className="p-5">
            <h2 ref={stageHeading} tabIndex={-1} className="text-lg font-semibold tracking-tight outline-none">
              {step === 0 ? "Monte o lote" : step === 1 ? "Revise os destinos" : "Autorize as transferências"}
            </h2>
            {step === 0 && <p className="text-sm text-muted-foreground">Adicione de 2 a {maxBatchTransferCount} transferências Pix.</p>}
            {step === 2 && <p className="text-sm text-muted-foreground">Use o código do seu aplicativo autenticador para autorizar o lote.</p>}
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {step === 0 ? (
              <form onSubmit={review} noValidate className="grid gap-5">
                <div className="grid gap-2">
                  <label htmlFor={formId + "-title"} className="text-sm font-medium">Nome do lote <span className="font-normal text-muted-foreground">(opcional)</span></label>
                  <Input id={formId + "-title"} maxLength={80} value={title} placeholder="Fornecedores de novembro"
                    onChange={(event) => setTitle(event.target.value)} className="h-11" />
                </div>
                {canSimulate && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <label htmlFor={formId + "-simulate"} className="flex items-center gap-2 text-sm font-medium">
                      <FlaskConical aria-hidden="true" className="size-4 text-muted-foreground" /> Simular lote com chave de teste
                    </label>
                    <Switch id={formId + "-simulate"} checked={simulate} onCheckedChange={setSimulate} />
                  </div>
                )}
                <div className="grid gap-5">
                  {transfers.map((item, index) => {
                    const field = formId + "-" + item.id;
                    return (
                      <fieldset key={item.id} aria-labelledby={field + "-label"} className="min-w-0 border-t border-border pt-3">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h3 id={field + "-label"} className="font-medium">Pix {index + 1}</h3>
                          <Button type="button" variant="ghost" size="icon" className="size-11"
                            disabled={transfers.length === 2} aria-label={`Remover Pix ${index + 1}`}
                            onClick={() => { setTransfers((rows) => rows.filter((row) => row.id !== item.id)); setError(""); }}>
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {!simulate && (
                            <>
                              <div className="grid min-w-0 gap-2">
                                <label htmlFor={field + "-type"} className="text-sm font-medium">Tipo de chave</label>
                                <Select value={item.pixKeyType} onValueChange={(value) => editTransfer(item.id, {
                                  pixKeyType: pixKeyTypeSchema.parse(value), pixKey: "",
                                })}>
                                  <SelectTrigger id={field + "-type"} className="h-11"><SelectValue /></SelectTrigger>
                                  <SelectContent><SelectGroup>
                                    {Object.entries(pixKeyLabels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
                                  </SelectGroup></SelectContent>
                                </Select>
                              </div>
                              <div className="grid min-w-0 gap-2">
                                <label htmlFor={field + "-key"} className="text-sm font-medium">Chave Pix de destino</label>
                                <BrazilianInput id={field + "-key"} value={item.pixKey} mask={pixKeyInputMask(item.pixKeyType)}
                                  className="h-11" maxLength={120} autoComplete="off" spellCheck={false}
                                  aria-invalid={invalidField === field + "-key" || undefined}
                                  inputMode={item.pixKeyType === "EMAIL" ? "email" : undefined}
                                  onChange={(event) => editTransfer(item.id, { pixKey: event.target.value })} />
                              </div>
                            </>
                          )}
                          <div className="grid min-w-0 gap-2">
                            <label htmlFor={field + "-amount"} className="text-sm font-medium">Valor</label>
                            <CurrencyInput id={field + "-amount"} valueInCents={item.amountInCents} className="text-base"
                              maxInCents={MAX_PIX_AMOUNT_IN_CENTS} aria-invalid={invalidField === field + "-amount" || undefined}
                              onValueChange={(amountInCents) => editTransfer(item.id, { amountInCents })} />
                          </div>
                          <div className="grid min-w-0 gap-2">
                            <label htmlFor={field + "-category"} className="text-sm font-medium">Categoria <span className="font-normal text-muted-foreground">(opcional)</span></label>
                            <ExpenseCategorySelect id={field + "-category"} value={item.expenseCategory}
                              onChange={(expenseCategory) => editTransfer(item.id, { expenseCategory })} />
                          </div>
                        </div>
                      </fieldset>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="h-11" disabled={transfers.length >= maxBatchTransferCount}
                    onClick={() => {
                      const id = ++nextRow.current;
                      setTransfers((rows) => [...rows, newTransfer(id)]);
                      window.requestAnimationFrame(() => document.getElementById(`${formId}-${id}-${simulate ? "amount" : "key"}`)?.focus());
                    }}>
                    <Plus aria-hidden="true" /> Adicionar Pix
                  </Button>
                  <Button type="submit" className="h-11" disabled={!available || !options.data || options.isError || options.isFetching}>Revisar lote <ArrowRight aria-hidden="true" /></Button>
                </div>
              </form>
            ) : step === 1 && prepared ? (
              <div className="grid gap-4">
                <ul className="divide-y divide-border">
                  {prepared.input.transfers.map((item, index) => (
                    <li key={transfers[index].id} className="flex min-h-16 flex-wrap items-center justify-between gap-2 py-3">
                      <div className="min-w-0">
                        <p className="break-all text-sm font-medium">{item.pixKey ?? options.data?.simulationDestination ?? "Chave de teste"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Pix {index + 1} · {prepared.input.simulate ? "Simulação" : pixKeyLabels[item.pixKeyType]}
                        </p>
                      </div>
                      <div className="grid gap-1 text-right text-sm tabular-nums">
                        <span className="font-semibold"><PanelAmount cents={item.amountInCents} /></span>
                        {item.expenseCategory && <ExpenseCategoryLabel category={item.expenseCategory} />}
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="h-11" onClick={() => setStep(0)}>Editar lote</Button>
                  <Button type="button" className="h-11" onClick={authorize}>Continuar para autorização</Button>
                </div>
              </div>
            ) : (
              <div className="grid max-w-md gap-4">
                <OperationFactorActions prompt={passkey} label="Autorizar lote">
                  <CodeSlots {...verification.field} id={formId + "-code"} format="totp" label="Código do autenticador"
                    autoFocus pendingLabel="Registrando lote…" successLabel="Lote autorizado." />
                  {passkey.available && (
                    <Button type="button" variant="outline" className="h-11" disabled={authorizingBusy} onClick={() => {
                      verification.reset();
                      passkey.choosePasskey();
                    }}>Usar biometria</Button>
                  )}
                </OperationFactorActions>
                {uncertain && prepared ? (
                  <Button asChild variant="outline" className="h-11"><Link href={batchesPath + "/" + prepared.id}>Consultar o lote</Link></Button>
                ) : (
                  <Button type="button" variant="ghost" className="h-11 w-fit" disabled={authorizingBusy}
                    onClick={() => { verification.reset(); setStep(1); }}>Voltar à revisão</Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="grid gap-4 p-5 xl:sticky xl:top-2">
          <h2 className="text-lg font-semibold tracking-tight">Resumo do lote</h2>
          <dl className="grid gap-3">
            <div><dt className="text-sm text-muted-foreground">Valor dos Pix</dt>
              <dd className="text-2xl font-semibold tracking-tight tabular-nums"><PanelAmount cents={total} /></dd></div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <dt className="text-muted-foreground">Transferências</dt><dd className="font-medium tabular-nums">{transfers.length}</dd>
            </div>
            {fee != null && <>
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <dt className="text-muted-foreground">Tarifa máxima por Pix</dt>
                <dd><PanelAmount cents={fee} /></dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2 text-sm font-medium">
                <dt>Débito máximo</dt>
                <dd><PanelAmount cents={total + transfers.length * fee} /></dd>
              </div>
            </>}
            <div className="flex items-center justify-between gap-2 text-sm">
              <dt className="text-muted-foreground">Saldo disponível</dt>
              <dd className="font-medium tabular-nums">
                {options.data ? <PanelAmount cents={options.data.availableBalanceInCents} /> : options.isLoading ? "Consultando…" : "Indisponível"}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">As tarifas são registradas após a confirmação de cada Pix.</p>
          {options.isError && <Button variant="outline" className="h-11" onClick={() => void options.refetch()}>Consultar saldo novamente</Button>}
          {lastIntent && step === 0 && (
            <Button asChild variant="outline" className="h-11"><Link href={batchesPath + "/" + lastIntent}>Consultar último envio</Link></Button>
          )}
        </Card>
      </div>
    </div>
  );
}
