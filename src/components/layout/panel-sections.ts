type PanelSection = {
  title: string;
  description: string;
  links?: { path: string; title: string }[];
};

export const panelSections: Readonly<Record<string, PanelSection>> = {
  "/pix/receber": { title: "Receber Pix", description: "A emissão de cobranças depende da conexão com o provedor Pix." },
  "/pix/saque-direto": { title: "Saque direto", description: "Os saques Pix aguardam a integração financeira." },
  "/pix/saques-em-lote": { title: "Saques em lote", description: "O envio de lotes aguarda a liberação de saques." },
  "/pix/saques-em-lote/novo": { title: "Novo lote de saques", description: "A criação de lotes aguarda a liberação de saques." },
  "/conta": {
    title: "Conta",
    description: "Gerencie seu cadastro e as opções de acesso.",
    links: [
      { path: "/conta/perfil", title: "Perfil" },
      { path: "/conta/seguranca", title: "Segurança" },
      { path: "/conta/usuarios", title: "Usuários" },
      { path: "/conta/taxas-e-limites", title: "Taxas e limites" },
    ],
  },
  "/preferencias": { title: "Preferências", description: "Ajustes locais do painel." },
  "/mais": {
    title: "Mais",
    description: "Navegue pelos módulos da sua conta.",
    links: [
      { path: "/conta", title: "Conta" },
      { path: "/integracoes", title: "Integrações" },
      { path: "/preferencias", title: "Preferências" },
      { path: "/ajuda", title: "Ajuda" },
    ],
  },
  "/ajuda": {
    title: "Ajuda",
    description: "Encontre as opções de segurança e de consulta de operações.",
    links: [
      { path: "/conta/seguranca", title: "Gerenciar meu autenticador" },
      { path: "/movimentacoes", title: "Encontrar uma operação" },
    ],
  },
};
