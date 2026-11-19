# SloPay · Mapeamento de Cobertura de Telas (Screen Coverage)

Este documento descreve a cobertura das telas do protótipo demonstrativo do Slopay. Veja a situação dos fluxos ligados à API, ao Postgres e ao Asaas na [revisão de produção](docs/VERIFICACAO_PRODUCAO.md).

---

## Matriz de Rastreabilidade das Telas

| # | Tela / Fluxo de Referência | Rota Next.js | Componente Principal | Status | Principais Recursos Implementados |
|---|---|---|---|:---:|---|
| **01** | **Início (Visão Geral)** | `/inicio` | `OverviewScreen` | ✅ Concluído | Cards de saldos (Disponível, Contábil, Reservado), fluxo diário de caixa, comparativo mensal, atalhos operacionais rápidos, últimas movimentações e aviso de alçadas pendentes. |
| **02** | **Extrato de Movimentações** | `/movimentacoes` | `TransactionsScreen` | ✅ Concluído | Tabela com filtros de direção (Entradas/Saídas), status, tipos, busca e paginação. Balanço consolidado do período, suporte a modo privacidade e exportação simulada (CSV/PDF). |
| **03** | **Detalhes da Transação / Comprovante** | `/movimentacoes/[id]` | `TransactionDetailScreen` | ✅ Concluído | Dados do pagador/recebedor, código EndToEnd Id Bacen, valor líquido e tarifa, linha do tempo dos eventos e comprovante oficial com botão de impressão estilizada (`@media print`). |
| **04** | **Hub de Operações Pix** | `/pix` | `PixHubScreen` | ✅ Concluído | Painel centralizador de atalhos rápidos: Receber com Pix, Saque Direto, Saques em Lote e Fila de Aprovações. |
| **05** | **Receber Pix (Gerar Cobrança)** | `/pix/receber` | `ReceiveFormScreen` | ✅ Concluído | Formulário com valor em centavos, tempo de expiração customizado, chave Pix, identificação opcional do pagador e geração instantânea de cobrança dinâmica. |
| **06** | **Detalhe da Cobrança / QR Code** | `/pix/cobrancas/[id]` | `ChargeDetailScreen` | ✅ Concluído | QR Code em SVG escalável, código Pix Copia e Cola com botão de cópia, contador regressivo de expiração e simulação interativa de pagamento instantâneo. |
| **07** | **Saque Direto (Transferência Pix)** | `/pix/saque-direto` | `WithdrawFormScreen` | ✅ Concluído | Fluxo guiado em 3 etapas: (1) Dados da chave e favorecido, (2) Revisão e verificação de alçada de aprovação, (3) Autenticação por PIN operacional (`123456`). |
| **08** | **Saques em Lote (Listagem)** | `/pix/saques-em-lote` | `BatchesListScreen` | ✅ Concluído | Visão de lotes com barra de progresso, valores total/concluído/pendente, status de liquidação e atalho para novo lote. |
| **09** | **Novo Saque em Lote** | `/pix/saques-em-lote/novo` | `NewBatchScreen` | ✅ Concluído | Validação de montante mínimo de R$ 30.000,00, cálculo automático de partição em parcelas de até R$ 15.000,00 cada e assinatura com PIN demonstrativo. |
| **10** | **Detalhe do Saque em Lote** | `/pix/saques-em-lote/[id]` | `BatchDetailScreen` | ✅ Concluído | Métricas do lote, lista de parcelas atômicas com status individual, IDs de liquidação e histórico do quórum de aprovação associado. |
| **11** | **Fila de Aprovações** | `/aprovacoes` | `ApprovalsListScreen` | ✅ Concluído | Filtros por status (Pendentes, Aprovados, Rejeitados), cards de alçada com impacto no saldo, quórum atual e prazos de resposta. |
| **12** | **Detalhe da Solicitação de Aprovação** | `/aprovacoes/[id]` | `ApprovalDetailScreen` | ✅ Concluído | Dados da operação e da regra de alçada, histórico de votos nominais, diálogo de aprovação e diálogo de rejeição com motivo obrigatório. |
| **13** | **Regras de Aprovação (Alçadas)** | `/conta/regras-de-aprovacao` | `RulesListScreen` | ✅ Concluído | Tabela de políticas de governança, faixas de valores, tipos de fluxo (paralelo/sequencial), quórum de assinaturas exigido e interruptor de ativação. |
| **14** | **Nova / Editar Regra de Alçada** | `/conta/regras-de-aprovacao/nova`, `.../[id]` | `RuleFormScreen` | ✅ Concluído | Construtor interativo de regras com validação de valor mínimo, quórum, seleção de aprovadores elegíveis e sumário visual dinâmico de governança. |
| **15** | **Indicadores & Métricas Pix** | `/indicadores` | `AnalyticsScreen` | ✅ Concluído | Dashboard analítico com taxa de conversão de cobranças, volume financeiro, ticket médio, gráficos temporais (Recharts) e divisão por canal de origem (Painel vs API). |
| **16** | **Taxas e Limites Operacionais** | `/conta/taxas-e-limites` | `TaxesAndLimitsScreen` | ✅ Concluído | Tabela de tarifas de recebimento e saque (percentual vs mínimo fixo) e barra de consumo do limite diário do SPI com sincronização de abas via URL (`?aba=taxas`). |

---

## Módulos Suplementares Implementados

Além das 16 telas do escopo principal, foram implementados os módulos complementares para paridade total com sistemas bancários corporativos:

- **Gestão de Usuários & Permissões:**
  - Listagem de colaboradores: `/conta/usuarios` (`UsersListScreen`)
  - Cadastro / Edição: `/conta/usuarios/novo` e `/conta/usuarios/[id]` (`UserFormScreen`) com papéis (Titular, Operador, Aprovador, Consulta), bloqueio de rebaixamento do último titular e matriz de permissões granulares por módulo.
- **Perfil Cadastral da Empresa & Usuário:**
  - `/conta/perfil` (`ProfileScreen`): Dados corporativos validados pelo Bacen (ISPB, CNPJ, Razão Social, conta gráfica), operador ativo e controle de encerramento de outras sessões.
- **Segurança & Autenticação:**
  - `/conta/seguranca` (`SecurityScreen`): Simulação de ativação de 2FA (TOTP com QR Code e chave secreta), alteração de PIN de pagamentos (`123456`), troca de senha de acesso e trilha de auditoria cronológica de eventos.
- **Webhooks & Integrações:**
  - `/integracoes/webhooks`, `/novo`, `/[id]` (`WebhooksListScreen`, `WebhookFormScreen`): Endpoints HTTP com validação HTTPS, seleção de eventos Pix, headers customizados, retentativas automáticas e modal de disparo de teste com preview de payload JSON.
- **Preferências & Acessibilidade:**
  - `/preferencias` (`PreferenciasPage`): Alternador de densidade visual (Confortável vs Compacta), modo privacidade de saldos (`••••••`) e redução de movimentos (`prefers-reduced-motion`).
- **Central de Ajuda & Operações:**
  - `/ajuda` (`AjudaPage`): FAQ interativo sobre normas do SPI/Bacen, documentação do relógio determinístico e canais corporativos de atendimento.
- **Menu Geral Mobile:**
  - `/mais` (`MaisPage`): Hub de atalhos e seções para dispositivos móveis integrado à barra de navegação inferior.
- **Autenticação Demonstrativa:**
  - `/entrar`, `/recuperar-acesso`, `/verificar-acesso`: Fluxo completo de login corporativo com credenciais demonstrativas pré-preenchidas e validação de 2FA.
