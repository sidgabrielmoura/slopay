import { BriefcaseBusiness, ChevronRight, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyInput } from "@/components/ui/currency-input";
import { GlideSelect, type GlideOption } from "@/components/ui/glide-select";
import { AuthField } from "@/features/auth/components/auth-form-controls";
import { formatCentsToBrl } from "@/lib/money";
import { formatBrazilianInput, formatCPF, formatCNPJ } from "@/lib/validators";
import {
  accountTypeLabels, companyTypes, formatOpeningDate, formatPostalCode, maxDeclaredIncome,
  stateOptions, type OpeningApplication, type OpeningDraft,
} from "../account-opening-application";

type FieldProps = {
  draft: OpeningDraft;
  invalid?: keyof OpeningDraft;
  update: <K extends keyof OpeningDraft>(field: K, value: OpeningDraft[K]) => void;
};

export function AccountTypeChoices({ current, pending, onChoose }: {
  current?: OpeningDraft["accountType"];
  pending: boolean;
  onChoose: (type: OpeningDraft["accountType"]) => void;
}) {
  const choices = [
    { type: "PF", details: "Abra a conta em seu nome, usando seu CPF.", Icon: UserRound },
    { type: "PJ", details: "Abra a conta em nome de um negócio com CNPJ.", Icon: BriefcaseBusiness },
  ] as const;
  return (
    <div className="grid gap-2.5">
      {choices.map(({ type, details, Icon }) => (
        <Button key={type} type="button" variant="outline" disabled={pending} onClick={() => onChoose(type)}
          className="h-auto min-h-18 w-full justify-start gap-3.5 whitespace-normal rounded-xl bg-card px-3.5 py-3.5 text-left hover:border-primary/60 hover:bg-secondary/60 data-[selected=true]:border-primary/50 sm:px-4"
          data-selected={current === type}>
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
            <Icon size={19} aria-hidden="true" />
          </span>
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="text-sm font-semibold">{accountTypeLabels[type]}</span>
            <span className="text-xs leading-relaxed font-normal text-muted-foreground">{details}</span>
          </span>
          <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
        </Button>
      ))}
    </div>
  );
}

function OpeningSelect({ field, label, options, value, invalid, onChange }: {
  field: string; label: string; options: GlideOption[]; value?: string; invalid?: boolean; onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={field} className="block text-sm font-medium">{label}</label>
      <GlideSelect id={field} name={field} options={options} value={value ?? ""} size="lg"
        menuWidth={224} required aria-invalid={invalid || undefined} className="w-full"
        onChange={onChange} />
    </div>
  );
}

export function AccountIdentityFields({ owner, draft, invalid, update }: FieldProps & { owner: OpeningApplication["owner"] }) {
  return (
    <div className="grid gap-4">
      <dl className="grid min-w-0 gap-x-4 gap-y-2.5 rounded-xl border border-border bg-card p-3.5 text-sm sm:grid-cols-2 sm:p-4">
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Titular</dt>
          <dd className="mt-0.5 wrap-anywhere font-medium">{owner.name}</dd>
        </div>
        {owner.cpf && <div><dt className="text-xs text-muted-foreground">CPF</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{formatCPF(owner.cpf)}</dd></div>}
        <div className="min-w-0 sm:col-span-2">
          <dt className="text-xs text-muted-foreground">E-mail confirmado</dt>
          <dd className="mt-0.5 wrap-anywhere font-medium">{owner.email}</dd>
        </div>
      </dl>
      <AuthField id="whatsapp" label="WhatsApp com DDD" mask="PHONE" autoComplete="tel"
        placeholder="(11) 99999-9999" aria-invalid={invalid === "whatsapp"} value={draft.whatsapp ?? ""} required
        onChange={(event) => update("whatsapp", event.currentTarget.value)} />
      {draft.accountType === "PF" ? (
        <AuthField id="birthDate" label="Data de nascimento" type="date" autoComplete="bday" required
          aria-invalid={invalid === "birthDate"} value={draft.birthDate ?? ""}
          onChange={(event) => update("birthDate", event.currentTarget.value)} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
            <AuthField id="cnpj" label="CNPJ" mask="CNPJ" placeholder="00.000.000/0000-00"
              aria-invalid={invalid === "cnpj"} value={draft.cnpj ?? ""} required
              onChange={(event) => update("cnpj", event.currentTarget.value)} />
            <OpeningSelect field="companyType" label="Tipo de empresa" options={[...companyTypes]} value={draft.companyType}
              invalid={invalid === "companyType"} onChange={(value) => update("companyType", value as OpeningDraft["companyType"])} />
          </div>
          <AuthField id="legalName" label="Razão social" autoComplete="organization" maxLength={150}
            aria-invalid={invalid === "legalName"} value={draft.legalName ?? ""} required
            onChange={(event) => update("legalName", event.currentTarget.value)} />
          <AuthField id="representativeRole" label="Seu vínculo com a empresa" placeholder="Ex. sócio-administrador"
            autoComplete="organization-title" maxLength={80} aria-invalid={invalid === "representativeRole"}
            value={draft.representativeRole ?? ""} required
            onChange={(event) => update("representativeRole", event.currentTarget.value)} />
        </>
      )}
    </div>
  );
}

export function AccountAddressFields({ draft, invalid, update }: FieldProps) {
  const incomeLabel = draft.accountType === "PJ" ? "Faturamento mensal estimado" : "Renda mensal estimada";
  return (
    <div className="grid gap-3.5">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,1.35fr)]">
        <AuthField id="postalCode" label="CEP" placeholder="00000-000" inputMode="numeric" autoComplete="postal-code"
          value={formatPostalCode(draft.postalCode ?? "")} required aria-invalid={invalid === "postalCode"}
          onChange={(event) => update("postalCode", formatPostalCode(event.currentTarget.value))} />
        <AuthField id="address" label="Rua ou avenida" autoComplete="address-line1" maxLength={120}
          value={draft.address ?? ""} required aria-invalid={invalid === "address"}
          onChange={(event) => update("address", event.currentTarget.value)} />
      </div>
      <div className="grid grid-cols-[minmax(0,0.75fr)_minmax(0,1.35fr)] gap-3">
        <AuthField id="addressNumber" label="Número" maxLength={18} value={draft.addressNumber ?? ""}
          required aria-invalid={invalid === "addressNumber"}
          onChange={(event) => update("addressNumber", event.currentTarget.value)} />
        <AuthField id="complement" label="Complemento (opcional)" autoComplete="address-line2" maxLength={80}
          value={draft.complement ?? ""} onChange={(event) => update("complement", event.currentTarget.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem]">
        <AuthField id="province" label="Bairro" autoComplete="address-level3" maxLength={80} value={draft.province ?? ""}
          aria-invalid={invalid === "province"} required onChange={(event) => update("province", event.currentTarget.value)} />
        <AuthField id="city" label="Cidade" autoComplete="address-level2" maxLength={80} value={draft.city ?? ""}
          aria-invalid={invalid === "city"} required onChange={(event) => update("city", event.currentTarget.value)} />
        <OpeningSelect field="state" label="UF" options={stateOptions} value={draft.state} invalid={invalid === "state"}
          onChange={(value) => update("state", value as OpeningDraft["state"])} />
      </div>
      <AuthField id="activity" label={draft.accountType === "PJ" ? "Atividade principal" : "Profissão ou atividade"}
        maxLength={100} value={draft.activity ?? ""} aria-invalid={invalid === "activity"} required
        onChange={(event) => update("activity", event.currentTarget.value)} />
      <div className="min-w-0 space-y-1.5">
        <label htmlFor="incomeInCents" className="block text-sm font-medium">{incomeLabel}</label>
        <CurrencyInput id="incomeInCents" valueInCents={draft.incomeInCents} maxInCents={maxDeclaredIncome} required
          aria-invalid={invalid === "incomeInCents"}
          className="text-base aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive"
          onValueChange={(cents) => update("incomeInCents", cents)}
          onBlur={() => { if (draft.incomeInCents === undefined) update("incomeInCents", 0); }} />
      </div>
    </div>
  );
}

function ReviewSection({ title, rows, onEdit }: {
  title: string; rows: Array<{ label: string; value: string }>; onEdit: () => void;
}) {
  return (
    <section className="grid gap-2.5 border-b border-border pb-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Button type="button" variant="ghost" size="sm" className="h-9 text-primary" onClick={onEdit}
          aria-label={`Editar ${title.toLowerCase()}`}>Editar</Button>
      </div>
      <dl className="grid gap-2.5 text-sm sm:grid-cols-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 wrap-anywhere">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function AccountReview({ owner, draft, confirmed, onConfirm, onEdit }: {
  owner: OpeningApplication["owner"]; draft: OpeningDraft; confirmed: boolean;
  onConfirm: (value: boolean) => void; onEdit: (step: number) => void;
}) {
  return (
    <div className="grid gap-3">
      <ReviewSection title="Identificação" onEdit={() => onEdit(2)} rows={[
        { label: "Tipo de conta", value: accountTypeLabels[draft.accountType] },
        { label: "Titular", value: owner.name },
        ...(owner.cpf ? [{ label: "CPF", value: formatCPF(owner.cpf) }] : []),
        { label: "E-mail", value: owner.email },
        { label: "WhatsApp", value: formatBrazilianInput("PHONE", draft.whatsapp ?? "") ?? "" },
        ...(draft.accountType === "PJ" ? [
          { label: "Razão social", value: draft.legalName ?? "" },
          { label: "CNPJ", value: formatCNPJ(draft.cnpj ?? "") },
          { label: "Tipo de empresa", value: companyTypes.find(({ value }) => value === draft.companyType)?.label ?? "" },
          { label: "Vínculo com a empresa", value: draft.representativeRole ?? "" },
        ] : [
          { label: "Nascimento", value: draft.birthDate ? formatOpeningDate(draft.birthDate) : "" },
        ]),
      ]} />
      <ReviewSection title="Endereço e atividade" onEdit={() => onEdit(3)} rows={[
        { label: "Endereço", value: [draft.address, draft.addressNumber, draft.complement, draft.province].filter(Boolean).join(", ") },
        { label: "Cidade e CEP", value: `${draft.city} / ${draft.state} · ${formatPostalCode(draft.postalCode ?? "")}` },
        { label: "Atividade", value: draft.activity ?? "" },
        { label: draft.accountType === "PJ" ? "Faturamento mensal" : "Renda mensal", value: formatCentsToBrl(draft.incomeInCents ?? 0) },
      ]} />
      <label className="flex cursor-pointer items-start gap-2.5 py-2 text-sm leading-6" htmlFor="opening-confirmed">
        <Checkbox id="opening-confirmed" checked={confirmed} required className="mt-0.5"
          onChange={(event) => onConfirm(event.currentTarget.checked)} />
        Confirmo que os dados informados estão corretos.
      </label>
    </div>
  );
}
