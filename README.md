# SloPay · Painel de Operações Pix Corporativo

Frontend profissional de um painel de operação de pagamentos Pix, construído com **Next.js 16 (App Router)**, **React 19**, **TypeScript (Strict)**, **Tailwind CSS v4** e **shadcn/ui**.

O sistema foi desenhado para oferecer máxima clareza operacional, estabilidade visual em sessões prolongadas de trabalho, conformidade contábil estrita e fidelidade às diretrizes do Sistema de Pagamentos Instantâneos (SPI / DICT) do Banco Central do Brasil.

---

## Destaques de Design & Arquitetura

1. **Estética Gráfica Refinada (Tema Dark Grafite)**
   - Fundo em grafite profundo (`#111417`), superfícies de cartão em `#191D22` e acento moderado em lima (`#C6DD72`).
   - Baixa fadiga ocular para uso prolongado em mesas de operações financeiras.
   - Tipografia **Inter** com alinhamento tabular (`tabular-nums`) para todos os valores monetários, datas e identificadores de transação.
   - Sem animações desnecessárias de contagem (zero-to-value countup), garantindo leitura estática e confiável.

2. **Invariantes Contábeis & Governança Rigorosa**
   - **Contabilidade em Centavos Inteiros:** Todos os valores, taxas e saldos são manipulados em centavos inteiros (`number`), evitando erros clássicos de ponto flutuante.
   - **Equação de Balanço em Tempo Real:**  
     $$\text{Saldo Disponível} = \text{Saldo Contábil} - \text{Saldos em Reserva Ativa}$$
   - **Regras de Alçada Automáticas:** Operações com valor $\ge$ R$ 5.000,00 bloqueiam temporariamente os fundos em reserva e aguardam aprovação de alçada nominal.
   - **Particionamento de Lotes:** Lotes de saque a partir de R$ 30.000,00 são automaticamente fracionados em parcelas atômicas de até R$ 15.000,00 cada.

3. **Repositório em Memória Reativo & Determinístico**
   - Implementado através do `DemoRepository` com injeção assíncrona desacoplada via `IGatewayService`.
   - **Relógio de Demonstração Ancorado:** Fixo em **16/09/2026 às 13:00 (UTC)** para garantir que cálculos de vencimento de QR Code e carimbos de data sejam consistentes entre recargas.
   - **Alternador Dinâmico de Cenários:**
     - `NORMAL`: Conta corporativa com histórico consolidado e saldo suficiente.
     - `NEW_ACCOUNT`: Empresa recém-aberta (saldo zerado, sem movimentações).
     - `INSUFFICIENT_FUNDS`: Saldo insuficiente para saques elevados.
     - `LIMIT_REACHED`: Limite diário do SPI atingido.
     - `READONLY`: Operador com perfil de apenas consulta.

4. **Navegação Híbrida & Acessibilidade WCAG 2.2 AA**
   - **Desktop:** Shell com sidebar colapsável (248px para 64px com tooltips), cabeçalho fixo com busca global (`Ctrl+K`), modo privacidade e notificações.
   - **Mobile:** Barra inferior de 5 posições com botão de ação rápida Pix (Action Sheet de Receber / Saque / Lote) e menu geral de atalhos.
   - Rótulo persistente e discreto: `Demonstração · dados fictícios`.

---

## Estrutura de Rotas do Projeto

```
src/app/
├── (auth)/
│   ├── entrar/                     # Login corporativo com dados demonstrativos
│   ├── recuperar-acesso/           # Recuperação de acesso e envio de link
│   └── verificar-acesso/           # Verificação em duas etapas (2FA / TOTP)
├── (panel)/
│   ├── inicio/                     # Painel geral com saldos, gráficos e atalhos
│   ├── movimentacoes/              # Extrato completo com filtros avançados
│   │   └── [id]/                   # Detalhes do lançamento e comprovante impresso
│   ├── pix/
│   │   ├── page.tsx                # Hub central de operações Pix
│   │   ├── receber/                # Gerador de cobranças com QR Code dinâmico
│   │   ├── cobrancas/[id]/         # Detalhe da cobrança, copia-e-cola e simulação
│   │   ├── saque-direto/           # Transferência Pix em 3 etapas com PIN
│   │   └── saques-em-lote/         # Gestão de dispersões fracionadas
│   │       ├── novo/               # Construtor de lote (mínimo R$ 30k)
│   │       └── [id]/               # Detalhe do lote e status das parcelas
│   ├── aprovacoes/                 # Fila de governança e alçadas pendentes
│   │   └── [id]/                   # Votação de alçada com motivo obrigatório
│   ├── indicadores/                # Relatórios de conversão e métricas temporais
│   ├── conta/
│   │   ├── perfil/                 # Dados cadastrais auditados Bacen e operador
│   │   ├── taxas-e-limites/        # Tarifas contratuais e consumo do limite diário
│   │   ├── usuarios/               # Gestão de colaboradores e permissões
│   │   │   ├── novo/               # Cadastro de novo usuário
│   │   │   └── [id]/               # Edição de perfil e acessos granulares
│   │   ├── regras-de-aprovacao/    # Políticas de alçada de valor e quóruns
│   │   │   ├── nova/               # Criação de regra com sumário dinâmico
│   │   │   └── [id]/               # Edição de parâmetros da regra
│   │   └── seguranca/              # Configuração de 2FA, PIN e trilha de auditoria
│   ├── integracoes/
│   │   └── webhooks/               # Endpoints HTTP para notificações em tempo real
│   │       ├── novo/               # Cadastro com validação HTTPS e headers
│   │       └── [id]/               # Edição de endpoint e simulação de disparos
│   ├── preferencias/               # Densidade de tabelas, privacidade e animações
│   ├── ajuda/                      # Central de documentação operacional e FAQ
│   └── mais/                       # Hub de seções para telas móveis
```

---

## Como Executar Localmente

### Pré-requisitos
- Node.js compatível com a versão do Next.js no lockfile.
- Yarn Classic para instalar o `yarn.lock`.

### 1. Clonar e Instalar Dependências
```bash
git clone https://github.com/sua-organizacao/slopay.git
cd slopay
yarn install --frozen-lockfile
```

### 2. Iniciar o Servidor de Desenvolvimento

Copie `.env.example` para `.env.local` e aponte `SLOPAY_BACKEND_URL` para o NestJS local. Defina `SLOPAY_APP_ORIGIN` como a origem em que o navegador abre o Next.js.

```bash
yarn dev
```
O painel estará disponível em [http://localhost:3000](http://localhost:3000).

Para navegar pelas telas de demonstração com dados fictícios, use `SLOPAY_DEMO_MODE=1` no `.env.local` e reinicie `yarn dev`. As rotas demonstrativas são exclusivas do servidor de desenvolvimento.

Em produção, forneça `SLOPAY_BACKEND_URL` e `SLOPAY_APP_ORIGIN` como origens HTTPS. O navegador chama apenas as rotas de autenticação do Next. O Next encaminha as chamadas ao Nest e grava as credenciais em cookies HttpOnly. As telas operacionais aguardam a homologação das integrações financeiras.

### 3. Executar Validação de Tipos & Build de Produção
```bash
# Verificação de tipagem estrita TypeScript
yarn tsc --noEmit

# Build de produção otimizado do Next.js
yarn build
```

---

## Credenciais & Informações para Demonstração

| Parâmetro | Valor Padrão | Observação |
|---|---|---|
| **E-mail de Acesso** | `gabriel@nexuspagamentos.com.br` | Pré-preenchido na tela de login |
| **PIN de Transações** | `123456` | Exigido para saques, lotes e governança |
| **Código 2FA (TOTP)** | Qualquer 6 dígitos (ex: `123456`) | Simulação ativa no login e no perfil |
| **Data Base do Relógio** | `16/09/2026 13:00 UTC` | Ancoragem estática em `demoClock` |
| **Empresa Fictícia** | Nexus Soluções Digitais Ltda | CNPJ: `12.345.678/0001-90` |
