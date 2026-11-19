"use client";

import React, { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import { ArrowLeft, Building2, Save, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { BrazilianInput } from "@/components/ui/brazilian-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Company } from "@/types/domain";

export default function AdminEmpresaEditarPage({ params }: { params: Promise<{ empresaId: string }> }) {
  const { empresaId } = use(params);
  const router = useRouter();
  const service = useGatewayService();
  const queryClient = useQueryClient();

  const { data: company, isLoading } = useQuery({
    queryKey: ["admin_company_detail", empresaId],
    queryFn: () => service.getCompanyById(empresaId),
  });

  const [formData, setFormData] = useState<Partial<Company>>({});
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (company) {
      setFormData({
        tradeName: company.tradeName,
        legalName: company.legalName,
        website: company.website || "",
        segment: company.segment,
        companySize: company.companySize,
        responsibleName: company.responsibleName,
        responsiblePhone: company.responsiblePhone,
        responsibleEmail: company.responsibleEmail,
        roleInCompany: company.roleInCompany,
      });
    }
  }, [company]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) {
        throw new Error("Informe a justificativa operacional da edição cadastral.");
      }
      return service.updateCompany(empresaId, formData, reason);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin_company_detail", empresaId] });
      queryClient.invalidateQueries({ queryKey: ["admin_companies"] });
      toast.success("Cadastro atualizado e registrado na trilha de auditoria.");
      router.push(`/admin/empresas/${empresaId}`);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Falha ao salvar dados da empresa.");
    },
  });

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs text-muted-foreground">
        Carregando dados da empresa...
      </div>
    );
  }

  if (!company) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Empresa não encontrada.</p>
        <NextLink href="/admin/empresas">
          <Button variant="outline" size="sm" className="text-xs border-border">
            Voltar
          </Button>
        </NextLink>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <NextLink
        href={`/admin/empresas/${empresaId}`}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" /> Cancelar e voltar para {company.tradeName}
      </NextLink>

      <Card className="bg-card border-border">
        <CardHeader className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <Building2 className="size-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-foreground">
                Editar Cadastro da Empresa
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground font-mono mt-0.5">
                CNPJ: {company.cnpjMasked} · ID: {company.id}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate();
          }}
        >
          <CardContent className="p-6 space-y-5">
            {/* Bloco Empresa */}
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Dados Institucionais
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Nome Fantasia</label>
                  <Input
                    value={formData.tradeName || ""}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                    className="h-9 text-xs bg-background border-border"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Razão Social</label>
                  <Input
                    value={formData.legalName || ""}
                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                    className="h-9 text-xs bg-background border-border"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Segmento de Mercado</label>
                  <Select
                    value={formData.segment || "SERVICOS"}
                    onValueChange={(val) => setFormData({ ...formData, segment: val })}
                  >
                    <SelectTrigger aria-label="Segmento da empresa" className="h-9 text-xs bg-background border-border">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-xs">
                      <SelectItem value="ECOMMERCE">E-commerce</SelectItem>
                      <SelectItem value="SAAS">Software / SaaS</SelectItem>
                      <SelectItem value="MARKETPLACE">Marketplace</SelectItem>
                      <SelectItem value="SERVICOS">Serviços</SelectItem>
                      <SelectItem value="FINTECH">Fintech</SelectItem>
                      <SelectItem value="OUTRO">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Porte da Empresa</label>
                  <Select
                    value={formData.companySize || "1-10"}
                    onValueChange={(val) => setFormData({ ...formData, companySize: val })}
                  >
                    <SelectTrigger aria-label="Porte da empresa" className="h-9 text-xs bg-background border-border">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-xs">
                      <SelectItem value="1-10">1 a 10 funcionários</SelectItem>
                      <SelectItem value="11-50">11 a 50 funcionários</SelectItem>
                      <SelectItem value="51-200">51 a 200 funcionários</SelectItem>
                      <SelectItem value="200+">Acima de 200 funcionários</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Website Oficial</label>
                  <Input
                    value={formData.website || ""}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://empresa.com.br"
                    className="h-9 text-xs bg-background border-border"
                  />
                </div>
              </div>
            </div>

            {/* Bloco Responsável */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Responsável Legal pelo Contrato
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Nome Completo</label>
                  <Input
                    value={formData.responsibleName || ""}
                    onChange={(e) => setFormData({ ...formData, responsibleName: e.target.value })}
                    className="h-9 text-xs bg-background border-border"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Cargo / Qualificação</label>
                  <Input
                    value={formData.roleInCompany || ""}
                    onChange={(e) => setFormData({ ...formData, roleInCompany: e.target.value })}
                    className="h-9 text-xs bg-background border-border"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">E-mail de Contato</label>
                  <Input
                    type="email"
                    value={formData.responsibleEmail || ""}
                    onChange={(e) => setFormData({ ...formData, responsibleEmail: e.target.value })}
                    className="h-9 text-xs bg-background border-border"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="company-contact-phone" className="text-xs font-medium text-foreground">Telefone</label>
                  <BrazilianInput
                    id="company-contact-phone"
                    mask="PHONE"
                    value={formData.responsiblePhone || ""}
                    onChange={(e) => setFormData({ ...formData, responsiblePhone: e.target.value })}
                    className="h-9 text-xs bg-background border-border"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Bloco de Justificativa para Auditoria */}
            <div className="space-y-2 pt-4 border-t border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <AlertCircle className="size-3.5 text-primary" />
                Justificativa da Alteração (Obrigatória para Auditoria)
              </div>
              <p className="text-[11px] text-muted-foreground">
                Todas as alterações cadastrais efetuadas pela mesa administrativa são auditáveis perante BACEN e gravadas com autor e carimbo de data/hora.
              </p>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex.: Solicitação formal de atualização contratual via chamado #8491..."
                rows={3}
                className="text-xs bg-background border-border"
                required
              />
            </div>
          </CardContent>

          <CardFooter className="p-6 border-t border-border flex justify-end gap-2.5">
            <NextLink href={`/admin/empresas/${empresaId}`}>
              <Button type="button" variant="outline" size="sm" className="h-9 text-xs border-border">
                Cancelar
              </Button>
            </NextLink>

            <Button
              type="submit"
              size="sm"
              disabled={updateMutation.isPending || !reason.trim()}
              className="h-9 text-xs font-medium gap-1.5"
            >
              <Save className="size-3.5" />
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
