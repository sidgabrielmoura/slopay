"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BrazilianInput } from "@/components/ui/brazilian-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GlideSelect } from "@/components/ui/glide-select";
import { Input } from "@/components/ui/input";
import { normalizeProfilePhone } from "@/features/account/profile";
import { formatBrazilianInput } from "@/lib/validators";
import {
  companyChangeSchema, companySegments, companySizes, type CompanyChange, type CompanyDetail, type CompanyProfile,
} from "../admin-companies";
import { AdminReasonField, CompanyChangeConfirmation } from "./company-change-dialog";

const labels = {
  legalName: "Razão social", tradeName: "Nome fantasia", segment: "Segmento", companySize: "Porte",
  website: "Site", contactName: "Nome do contato", contactRole: "Cargo", contactEmail: "E-mail comercial", contactPhone: "Telefone comercial",
} satisfies Record<keyof CompanyProfile, string>;
const fields = Object.keys(labels) as (keyof CompanyProfile)[];
const unspecified = "UNSPECIFIED";
const segmentOptions = [{ value: unspecified, label: "Não informado" },
  ...Object.entries(companySegments).map(([value, label]) => ({ value, label }))];
const sizeOptions = [{ value: unspecified, label: "Não informado" },
  ...Object.entries(companySizes).map(([value, label]) => ({ value, label }))];

function reviewValue(field: keyof CompanyProfile, profile: CompanyProfile) {
  if (field === "segment" && profile.segment) return companySegments[profile.segment];
  if (field === "companySize" && profile.companySize) return companySizes[profile.companySize];
  if (field === "contactPhone" && profile.contactPhone) return formatBrazilianInput("PHONE", profile.contactPhone) ?? profile.contactPhone;
  return profile[field] ?? "Removido";
}

export function AdminCompanyEdit({ company, detailHref, onChange }: {
  company: CompanyDetail; detailHref: string; onChange: () => void;
}) {
  const router = useRouter();
  const original = useRef(company);
  const reviewButton = useRef<HTMLButtonElement>(null);
  const saved = useRef(false);
  const [draft, setDraft] = useState<Extract<CompanyChange, { action: "EDIT_PROFILE" }>>();
  const data = original.current;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const value = (name: keyof CompanyProfile) => String(values.get(name) ?? "").trim() || null;
    const phone = value("contactPhone");
    const contactPhone = phone ? normalizeProfilePhone(phone) : null;
    if (phone && !contactPhone) {
      toast.error("Informe um telefone brasileiro com DDD.");
      (form.elements.namedItem("contactPhone") as HTMLInputElement)?.focus();
      return;
    }
    const input = companyChangeSchema.safeParse({
      action: "EDIT_PROFILE", version: data.profileVersion, reason: values.get("reason"),
      profile: {
        legalName: value("legalName"), tradeName: value("tradeName"),
        segment: value("segment") === unspecified ? null : value("segment"),
        companySize: value("companySize") === unspecified ? null : value("companySize"),
        website: value("website"), contactName: value("contactName"), contactRole: value("contactRole"),
        contactEmail: value("contactEmail"), contactPhone,
      },
    });
    if (!input.success || input.data.action !== "EDIT_PROFILE") {
      const field = !input.success ? input.error.issues[0]?.path.at(-1) : undefined;
      toast.error(field === "reason" ? "Informe o motivo da alteração." : field === "website" ? "Informe um site válido com http ou https." : "Confira os dados do cadastro.");
      const control = typeof field === "string" ? form.elements.namedItem(field) : null;
      if (control instanceof HTMLElement) control.focus();
      return;
    }
    const profile = input.data.profile;
    if (fields.every((field) => profile[field] === data[field])) {
      toast.error("Altere pelo menos um campo do cadastro.");
      return;
    }
    saved.current = false;
    setDraft(input.data);
  }

  return (
    <>
      <form className="grid min-w-0 gap-5" onSubmit={submit}>
        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-2">
          <Card className="min-w-0">
            <CardHeader className="gap-1 p-5">
              <h2 className="text-balance text-lg font-semibold">Dados da empresa</h2>
            </CardHeader>
            <CardContent className="grid min-w-0 gap-4 px-5 pb-5 sm:grid-cols-2">
              <Field name="legalName"><Input id="company-legalName" name="legalName" className="h-11" required maxLength={150} defaultValue={data.legalName} /></Field>
              <Field name="tradeName"><Input id="company-tradeName" name="tradeName" className="h-11" maxLength={150} defaultValue={data.tradeName ?? ""} /></Field>
              <Field name="segment">
                <GlideSelect id="company-segment" name="segment" ariaLabel="Segmento" size="lg" options={segmentOptions} defaultValue={data.segment ?? unspecified} />
              </Field>
              <Field name="companySize">
                <GlideSelect id="company-companySize" name="companySize" ariaLabel="Porte" size="lg" options={sizeOptions} defaultValue={data.companySize ?? unspecified} />
              </Field>
              <div className="sm:col-span-2">
                <Field name="website"><Input id="company-website" name="website" type="url" className="h-11" maxLength={250}
                  defaultValue={data.website ?? ""} placeholder="https://empresa.com.br" /></Field>
              </div>
            </CardContent>
          </Card>
          <Card className="min-w-0">
            <CardHeader className="gap-1 p-5">
              <h2 className="text-balance text-lg font-semibold">Contato comercial</h2>
              <p className="text-pretty text-sm text-muted-foreground">Dados para contato com a empresa.</p>
            </CardHeader>
            <CardContent className="grid min-w-0 gap-4 px-5 pb-5 sm:grid-cols-2">
              <Field name="contactName"><Input id="company-contactName" name="contactName" className="h-11" maxLength={150} defaultValue={data.contactName ?? ""} /></Field>
              <Field name="contactRole"><Input id="company-contactRole" name="contactRole" className="h-11" maxLength={100} defaultValue={data.contactRole ?? ""} /></Field>
              <Field name="contactEmail"><Input id="company-contactEmail" name="contactEmail" type="email" className="h-11" maxLength={254} defaultValue={data.contactEmail ?? ""} /></Field>
              <Field name="contactPhone"><BrazilianInput id="company-contactPhone" name="contactPhone" mask="PHONE" className="h-11" defaultValue={data.contactPhone ?? ""} /></Field>
            </CardContent>
          </Card>
        </div>
        <Card className="grid gap-4 p-5">
          <AdminReasonField />
          <div className="flex flex-wrap justify-end gap-2">
            <Button asChild variant="outline" className="h-11"><Link href={detailHref}>Cancelar</Link></Button>
            <Button type="submit" ref={reviewButton} className="h-11">Revisar alterações</Button>
          </div>
        </Card>
      </form>
      {draft && (
        <CompanyChangeConfirmation company={data} change={draft}
          reviewed={fields.filter((field) => data[field] !== draft.profile[field]).map((field) => [labels[field], reviewValue(field, draft.profile)])}
          onChange={onChange} onSuccess={() => { saved.current = true; }} restoreFocus={() => reviewButton.current?.focus()}
          onClose={() => {
            setDraft(undefined);
            if (saved.current) router.replace(detailHref);
          }} />
      )}
    </>
  );
}

function Field({ name, children }: { name: keyof CompanyProfile; children: ReactNode }) {
  return <div className="grid min-w-0 gap-2"><label htmlFor={"company-" + name} className="text-sm font-medium">{labels[name]}</label>{children}</div>;
}
