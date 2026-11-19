"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { GlideSelect } from "@/components/ui/glide-select";
import { LoadingConfirmation, LoadingIndicator } from "@/components/ui/loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { Switch } from "@/components/ui/switch";
import { ToastNotice } from "@/components/ui/toast-notice";
import { formatDateTime } from "@/lib/dates";
import { adminAppearanceSchema, maxPixNoticeMinimum, type AdminPreferenceChanges, type AdminPreferences, type AdminPreferencesView } from "../admin-preferences";
import { AdminConnectionStatus } from "./admin-activity-provider";
import { useAdminPreferences } from "./admin-preferences-provider";
import { CompanyField, CompanyReadError } from "./company-display";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";

const densityOptions = [
  { value: "comfortable", label: "Confortável" },
  { value: "compact", label: "Compacta" },
];

function PreferenceSwitch({ label, description, checked, disabled, onChange }: {
  label: string; description: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void;
}) {
  const id = useId();

  return (
    <div className="flex min-w-0 items-center gap-4 px-4 py-3.5 sm:px-5">
      <label htmlFor={id} className="grid min-h-11 min-w-0 flex-1 cursor-pointer content-center gap-0.5">
        <span id={`${id}-label`} className="text-pretty text-sm font-medium">{label}</span>
        <span id={`${id}-help`} className="text-pretty text-sm text-muted-foreground">{description}</span>
      </label>
      <Switch id={id} type="button" checked={checked} disabled={disabled} onCheckedChange={onChange}
        aria-labelledby={`${id}-label`} aria-describedby={`${id}-help`} />
    </div>
  );
}

function PanelPolicy({ view }: { view: AdminPreferencesView }) {
  const development = useDevelopmentFeatures();
  return (
    <aside className="grid min-w-0 content-start gap-4">
      <Card className="min-w-0" aria-labelledby="admin-session-policy">
        <div className="space-y-1 border-b border-border p-4 sm:p-5">
          <h2 id="admin-session-policy" className="text-balance text-lg font-semibold">Sessão</h2>
          <p className="text-pretty text-sm text-muted-foreground">O painel pede nova verificação após o período de inatividade.</p>
        </div>
        <dl className="grid gap-3 p-4 sm:p-5">
          <CompanyField label="Bloqueio por inatividade"><span className="tabular-nums">{view.session.idleMinutes} min</span></CompanyField>
          <CompanyField label="Duração máxima"><span className="tabular-nums">{view.session.absoluteHours} h</span></CompanyField>
        </dl>
        <div className="border-t border-border px-3 py-2 sm:px-4">
          <Button asChild variant="ghost" className="h-11 justify-start px-2">
            <Link href="/conta/seguranca" prefetch={false}>Segurança da conta <ArrowUpRight aria-hidden="true" /></Link>
          </Button>
        </div>
      </Card>
      <Card className="grid min-w-0 gap-4 p-4 sm:p-5" aria-labelledby="admin-preferences-monitoring">
        <h2 id="admin-preferences-monitoring" className="text-balance text-lg font-semibold">Monitoramento</h2>
        <dl className="grid gap-4">
          <CompanyField label="Canal de avisos"><AdminConnectionStatus /></CompanyField>
          {development && <CompanyField label="Integrações Sandbox">
            <Badge variant={view.sandboxEnabled ? "success" : "secondary"}>{view.sandboxEnabled ? "Ativas" : "Desativadas"}</Badge>
          </CompanyField>}
        </dl>
      </Card>
    </aside>
  );
}

function PreferencesForm({ view }: { view: AdminPreferencesView }) {
  const development = useDevelopmentFeatures();
  const { saving, save } = useAdminPreferences();
  const [draft, setDraft] = useState<AdminPreferenceChanges>({});
  const [feedback, setFeedback] = useState<"saved" | "unconfirmed" | null>(null);
  const values = { ...view.preferences, ...draft };
  const changes = Object.fromEntries(Object.entries(draft).filter(([field, value]) => view.preferences[field as keyof AdminPreferences] !== value));
  const dirty = Object.keys(changes).length > 0;

  function change<K extends keyof AdminPreferences>(field: K, value: AdminPreferences[K]) {
    setFeedback(null);
    setDraft((previous) => {
      const next = { ...previous };
      if (value === view.preferences[field]) delete next[field];
      else next[field] = value;
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !dirty) return;
    setFeedback(null);
    const result = await save(changes);
    if (!result) {
      setFeedback("unconfirmed");
      return;
    }
    setDraft({});
    setFeedback("saved");
  }

  return (
    <form onSubmit={submit} className="grid min-w-0 content-start gap-4">
      <Card className="min-w-0" aria-labelledby="admin-preferences-appearance">
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <h2 id="admin-preferences-appearance" className="text-balance text-lg font-semibold">Interface e acessibilidade</h2>
        </div>
        <div className="divide-y divide-border">
          <div className="grid min-w-0 gap-2 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center sm:gap-4 sm:px-5">
            <div className="min-w-0 space-y-0.5">
              <span id="admin-preferences-density" className="text-sm font-medium">Densidade das tabelas</span>
              <p className="text-pretty text-sm text-muted-foreground">A opção compacta reduz o espaço entre as linhas.</p>
            </div>
            <GlideSelect aria-labelledby="admin-preferences-density" size="lg" value={values.density} options={densityOptions} disabled={saving}
              onChange={(value) => change("density", adminAppearanceSchema.shape.density.parse(value))} />
          </div>
          <PreferenceSwitch label="Ocultar valores monetários" description="Mascarar saldos e valores de operações no painel."
            checked={values.hideValues} disabled={saving} onChange={(value) => change("hideValues", value)} />
          <PreferenceSwitch label="Reduzir movimento" description="Encurtar as animações do painel. A preferência do dispositivo também é respeitada."
            checked={values.reduceMotion} disabled={saving} onChange={(value) => change("reduceMotion", value)} />
        </div>
      </Card>

      <Card className="min-w-0" aria-labelledby="admin-preferences-notices">
        <div className="space-y-1 border-b border-border px-4 py-4 sm:px-5">
          <h2 id="admin-preferences-notices" className="text-balance text-lg font-semibold">Avisos flutuantes</h2>
          <p className="text-pretty text-sm text-muted-foreground">Escolha quais avisos aparecem no canto da tela. O sino mantém todos os eventos.</p>
        </div>
        <div className="divide-y divide-border">
          <PreferenceSwitch label="Abertura de contas" description="Cadastros prontos, ajustes e reenvios."
            checked={values.notifyAccountOpenings} disabled={saving} onChange={(value) => change("notifyAccountOpenings", value)} />
          {development && <>
          <PreferenceSwitch label="Operações Pix" description="Cobranças, recebimentos, saques e estornos a partir do valor definido abaixo."
            checked={values.notifyPix} disabled={saving} onChange={(value) => change("notifyPix", value)} />
          <div className="grid min-w-0 gap-2 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center sm:gap-4 sm:px-5">
            <div className="min-w-0 space-y-0.5">
              <label htmlFor="admin-preferences-pix-minimum" className="text-sm font-medium">Valor mínimo para avisos Pix</label>
              <p id="admin-preferences-pix-minimum-help" className="text-pretty text-sm text-muted-foreground">R$ 0,00 inclui todas as operações Pix habilitadas acima.</p>
            </div>
            <CurrencyInput id="admin-preferences-pix-minimum" aria-describedby="admin-preferences-pix-minimum-help" className="text-base"
              valueInCents={values.pixMinimumInCents} maxInCents={maxPixNoticeMinimum} disabled={saving || !values.notifyPix}
              onValueChange={(value) => change("pixMinimumInCents", value)} />
          </div>
          <PreferenceSwitch label="Pendências e falhas" description="Aprovações, operações em revisão, falhas e mudanças na fila de webhooks."
            checked={values.notifyOperationalWarnings} disabled={saving} onChange={(value) => change("notifyOperationalWarnings", value)} />
          </>}
        </div>
      </Card>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 pt-1">
        <div role="status" className="flex min-h-6 min-w-0 items-center gap-2 text-sm text-muted-foreground">
          {feedback === "saved" ? <><LoadingConfirmation size={20} animate /><span>Preferências salvas.</span></>
            : feedback === "unconfirmed" ? <span>Salvamento pendente de confirmação.</span>
              : dirty ? <span>Alterações pendentes</span>
                : view.updatedAt && <time dateTime={view.updatedAt} className="tabular-nums">Salvas em {formatDateTime(view.updatedAt)}</time>}
        </div>
        <div className="flex flex-wrap gap-2">
          {dirty && <Button type="button" variant="ghost" className="h-11" disabled={saving}
            onClick={() => { setDraft({}); setFeedback(null); }}>Descartar</Button>}
          <Button type="submit" className="h-11" disabled={!dirty || saving}>
            {saving && <LoadingIndicator />} {saving ? "Salvando…" : "Salvar preferências"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function PreferencesSkeleton() {
  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="grid gap-4"><Skeleton className="h-56 animate-none" /><Skeleton className="h-64 animate-none" /></div>
      <div className="grid content-start gap-4"><Skeleton className="h-52 animate-none" /><Skeleton className="h-40 animate-none" /></div>
    </div>
  );
}

export function AdminPreferencesScreen({ user }: { user: AdminIdentity }) {
  const { view, loading, readError, retry } = useAdminPreferences();

  return (
    <AdminPanel user={user}>
      <header className="min-w-0 space-y-1">
        <h1 className="text-balance text-2xl font-semibold sm:text-3xl">Preferências</h1>
        <p className="text-pretty text-sm text-muted-foreground">Personalize a interface e os avisos da sua conta administrativa.</p>
      </header>
      <ToastNotice message={readError} />
      {loading && <span role="status" className="sr-only">Carregando preferências</span>}
      <SkeletonReveal flow revealed={!loading} skeleton={<PreferencesSkeleton />}>
        {view ? <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <PreferencesForm view={view} />
          <PanelPolicy view={view} />
        </div> : readError && <CompanyReadError title="Preferências indisponíveis" retry={retry} />}
      </SkeletonReveal>
    </AdminPanel>
  );
}
