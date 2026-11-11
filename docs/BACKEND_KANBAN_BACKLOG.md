# SloPay Gateway — Backlog de Pendências do Backend (Kanban Cards)

Este documento contém os **Cards de Tarefas e Melhorias Técnicas do Backend** (`gatepay-back`), formatados prontos para serem adicionados a um quadro **Kanban** (Linear, Trello, Jira, GitHub Projects ou Notion).

Cada card segue rigorosamente as diretrizes da **Regra Global de Segurança e Escalabilidade** (Payment Gateway Standards: *SECURE + AUTHORIZED + VALIDATED + IDEMPOTENT + AUDITABLE + OBSERVABLE + RESILIENT + SCALABLE*).

---

## 📋 Resumo das Fases do Kanban

| Coluna Kanban | Qtd de Cards | Foco Principal |
| :--- | :---: | :--- |
| **To Do — Sprint 1 (Crítico: Auth & Resiliência)** | 5 cards | E-mails transacionais reais, Redis no Rate Limit, Limpeza de Sessões, Token 2FA Pending, Auditoria avançada |
| **To Do — Sprint 2 (Crítico: Financeiro & Pix)** | 5 cards | Idempotência estrita, Double-Entry Ledger, Proteção de Concorrência (`FOR UPDATE`), Máquina de Estados, Alçadas de Saque |
| **To Do — Sprint 3 (Integrações & Webhooks)** | 4 cards | Antifraude & SSRF em Webhooks, Fila com Dead Letter Queue (DLQ), Assinatura HMAC estrita, Circuit Breaker PSP |
| **To Do — Sprint 4 (Observabilidade & Governança)** | 3 cards | Correlation ID distribuído, Redaction em logs, Multi-Tenancy estrito em queries |

---

## 🏷️ Sprint 1: Autenticação, Sessões & Infraestrutura Base

---

### [CARD-AUTH-01] Integração com Provedor Transacional de E-mails
* **Prioridade:** 🔴 Alta (Nível 2 — Sensível)
* **Coluna Sugerida:** `To Do` / `Next Sprint`
* **Módulos Afetados:** `src/modules/auth/application/services/email-dispatcher.service.ts`
* **Estimativa:** 3 pontos / 1 dia

#### 📝 Descrição:
Atualmente, o serviço `EmailDispatcherService` apenas emite logs no console informando que o link foi despachado. É necessário plugar um provedor transacional em nuvem (ex: **Resend**, **AWS SES**, **Postmark** ou **SendGrid**) para envio real de:
1. E-mail de confirmação de cadastro (`/verify-email?token=...`).
2. E-mail de recuperação e redefinição de senha (`/reset-password?token=...`).
3. Alerta de segurança de senha alterada.
4. Notificação de novo login a partir de IP/dispositivo não reconhecido.

#### 🎯 Critérios de Aceite:
- [ ] Template HTML responsivo e com a identidade visual do **SloPay**.
- [ ] Envio assíncrono não-bloqueante (usar fila ou processamento desacoplado).
- [ ] Timeout de 5000ms configurado para o cliente HTTP do provedor.
- [ ] Retry automático com exponential backoff (máximo 3 tentativas).
- [ ] Fallback caso a chave de API falhe, gravando erro estruturado no logger sem expor segredos.
- [ ] Nenhum token bruto exposto nos logs de envio.

---

### [CARD-AUTH-02] Armazenamento Distribuído do Rate Limiting com Redis
* **Prioridade:** 🔴 Alta (Nível 0/1 — Infraestrutura)
* **Coluna Sugerida:** `To Do` / `Next Sprint`
* **Módulos Afetados:** `src/app.module.ts`, `src/modules/auth/presentation/http/controllers/auth.controller.ts`
* **Estimativa:** 2 pontos / Meio dia

#### 📝 Descrição:
O rate limiting do NestJS (`@nestjs/throttler`) está utilizando o storage em memória RAM padrão da instância Node.js. Em ambiente com múltiplas réplicas/pods (escalabilidade horizontal), um invasor pode contornar os limites enviando requisições alternadas entre réplicas. É obrigatório plugar o `ThrottlerStorageRedisService`.

#### 🎯 Critérios de Aceite:
- [ ] Instalar e configurar `@nest-lab/throttler-storage-redis` ou `ioredis`.
- [ ] Utilizar a variável de ambiente `REDIS_URL`.
- [ ] Chave de cache no Redis padronizada: `throttle:slopay:<ip>:<endpoint>`.
- [ ] Em caso de indisponibilidade temporária do Redis, implementar fallback graceful (fail-open controlado com log de alerta de infraestrutura).
- [ ] Teste unitário e de integração garantindo bloqueio HTTP 429 persistido entre reinicializações do app.

---

### [CARD-AUTH-03] Worker de Limpeza Periódica de Sessões e Tokens Expirados
* **Prioridade:** 🟡 Média (Nível 1 — Manutenção e Performance)
* **Coluna Sugerida:** `To Do`
* **Módulos Afetados:** `src/modules/auth/infrastructure/cron/`, `@nestjs/schedule`
* **Estimativa:** 2 pontos / Meio dia

#### 📝 Descrição:
As tabelas `sessions`, `refresh_tokens`, `password_reset_tokens` e `email_verification_tokens` acumulam registros com o passar do tempo. Embora tokens expirados sejam rejeitados nas consultas (`WHERE expiresAt > NOW()`), o crescimento indefinido da tabela degrada os índices e o consumo de storage do PostgreSQL.

#### 🎯 Critérios de Aceite:
- [ ] Configurar `@Cron('0 3 * * *')` (execução diária às 03:00 UTC).
- [ ] Deletar em lotes (batching de 1.000 em 1.000 itens para não travar o banco nem segurar locks) tokens expirados há mais de 30 dias.
- [ ] Não deletar sessões que estejam sob auditoria ou investigação de fraude ativa.
- [ ] Registrar métrica de quantidade de registros expurgados a cada ciclo.

---

### [CARD-AUTH-04] Otimização do Fluxo 2FA: Token Temporário `2FA_PENDING`
* **Prioridade:** 🟡 Média (Nível 2 — Performance & Segurança)
* **Coluna Sugerida:** `To Do`
* **Módulos Afetados:** `src/modules/auth/application/use-cases/login.use-case.ts`
* **Estimativa:** 3 pontos / 1 dia

#### 📝 Descrição:
No fluxo atual, quando o usuário tem 2FA ativo, o frontend envia `email + password + twoFactorCode`. Isso faz com que o backend execute o cálculo de `Argon2id` (alto custo de CPU) em **duas requisições sucessivas** (uma para descobrir que requer 2FA e outra para validar junto com o código TOTP).
A melhoria consiste em:
1. No primeiro passo (e-mail + senha corretos, mas 2FA pendente): retornar `{ requires2FA: true, tempToken: "jwt_ephemeral_5min" }`.
2. No segundo passo (`POST /auth/2fa/verify`): enviar apenas `{ tempToken, code: "123456" }`.

#### 🎯 Critérios de Aceite:
- [ ] O `tempToken` deve ter escopo estrito `SCOPE_2FA_PENDING`, expiração máxima de 5 minutos e ser assinado por chave de uso único ou HMAC.
- [ ] O `tempToken` não permite acesso a nenhuma rota de negócio ou dados confidenciais do usuário.
- [ ] Elimina a necessidade de recalcular Argon2id no segundo passo.
- [ ] Rate limit estrito de 5 tentativas por `tempToken` no Redis antes de invalidar o token e forçar novo login.

---

### [CARD-AUTH-05] Detecção de Reutilização de Refresh Token (Compromised Token Detection)
* **Prioridade:** 🔴 Alta (Nível 2 — Segurança Crítica)
* **Coluna Sugerida:** `To Do`
* **Módulos Afetados:** `src/modules/auth/application/use-cases/refresh-token.use-case.ts`
* **Estimativa:** 3 pontos / 1 dia

#### 🎯 Critérios de Aceite:
- [ ] Se uma requisição de renovação utilizar um Refresh Token que já consta como `isRevoked: true` ou já foi rotacionado anteriormente:
  1. Identificar tentativa de invasão (token roubado em trânsito).
  2. Imediatamente revogar **todas as sessões e tokens ativos daquele usuário**.
  3. Emitir evento de auditoria `SECURITY_BREACH_REFRESH_TOKEN_REUSE`.
  4. Enviar e-mail de alerta de segurança urgente ao titular da conta.

---

## 💰 Sprint 2: Motor Financeiro, Pix & Ledger

---

### [CARD-FIN-01] Motor de Idempotência Obrigatória em Rotas Financeiras
* **Prioridade:** 🔴 Crítica (Nível 3 — Financeira)
* **Coluna Sugerida:** `To Do`
* **Módulos Afetados:** `src/core/security/guards/idempotency.guard.ts`, Prisma Schema
* **Estimativa:** 5 pontos / 2 dias

#### 📝 Descrição:
Conforme a Regra Global nº 13, nenhuma operação que movimente saldo (criação de cobrança Pix, transferência, liquidação, estorno, saque) pode ocorrer sem chave de idempotência (`Idempotency-Key` no header HTTP). A repetição da mesma requisição com a mesma chave deve retornar a resposta anterior em cache sem reprocessar o débito/crédito.

#### 🎯 Critérios de Aceite:
- [ ] Criar tabela `idempotency_records`:
  - `key` (varchar 128, unique composto com `merchantId`),
  - `requestHash` (SHA-256 do body para garantir que o payload não foi alterado),
  - `responseStatus` (HTTP code),
  - `responseBody` (JSON),
  - `lockedUntil` (lock pessimista contra concorrência imediata),
  - `createdAt`, `expiresAt` (24 horas).
- [ ] Se a mesma chave for reutilizada com payload diferente: retornar `422 Unprocessable Entity (IDEMPOTENCY_KEY_PAYLOAD_MISMATCH)`.
- [ ] Se duas requisições chegarem ao mesmo milissegundo com a mesma chave: a segunda deve aguardar o lock ou retornar `409 Conflict (REQUEST_IN_PROGRESS)`.

---

### [CARD-FIN-02] Double-Entry Ledger (Partidas Dobradas Imutáveis)
* **Prioridade:** 🔴 Crítica (Nível 3 — Financeira / Contábil)
* **Coluna Sugerida:** `To Do`
* **Módulos Afetados:** `src/modules/ledger/`, Prisma Schema
* **Estimativa:** 8 pontos / 3 dias

#### 📝 Descrição:
Conforme a Regra Global nº 11 e 12, saldo **nunca** deve ser um campo mutável isolado (`UPDATE accounts SET balance = balance - 100`). Todo movimento financeiro precisa gerar duas entradas no ledger contábil:
- Uma conta debitada (origem).
- Uma conta creditada (destino).
A soma de todos os débitos deve ser estritamente igual à soma de todos os créditos (`SUM(debits) == SUM(credits)`).

#### 🎯 Critérios de Aceite:
- [ ] Criar tabelas: `ledger_accounts`, `ledger_transactions`, `ledger_entries`.
- [ ] Toda movimentação salva atomicamente dentro de uma transação Prisma (`$transaction`).
- [ ] Saldo do cliente é computado através do extrato ou de snapshots periódicos auditados.
- [ ] Proibido comando SQL `UPDATE` direto na tabela de lançamentos (`ledger_entries` deve ser tabela append-only / imutável).

---

### [CARD-FIN-03] Proteção de Concorrência em Saques (`SELECT FOR UPDATE`)
* **Prioridade:** 🔴 Crítica (Nível 3 — Antifraude / Prevenção de Race Condition)
* **Coluna Sugerida:** `To Do`
* **Módulos Afetados:** `src/modules/withdrawals/application/use-cases/request-withdrawal.use-case.ts`
* **Estimativa:** 5 pontos / 1.5 dias

#### 📝 Descrição:
Ataques de saque simultâneo exploram requisições paralelas que passam pela checagem de saldo antes que a primeira termine de subtrair o valor. É terminantemente proibido o padrão *check-then-act* sem lock atômico.

#### 🎯 Critérios de Aceite:
- [ ] Executar lock pessimista na linha do saldo da conta (`SELECT balance FROM merchant_balances WHERE id = $1 FOR UPDATE`).
- [ ] Validar saldo disponível considerando saques já solicitados e retenções de liquidação pendente.
- [ ] Reservar o saldo no mesmo lock atômico.
- [ ] Teste de carga automatizado disparando 20 saques simultâneos com saldo para apenas 1 (deve aprovar 1 e rejeitar 19 com `INSUFFICIENT_FUNDS`).

---

### [CARD-FIN-04] Máquina de Estados Finita para Transações Pix
* **Prioridade:** 🔴 Alta (Nível 3 — Integridade Transacional)
* **Coluna Sugerida:** `To Do`
* **Módulos Afetados:** `src/modules/transactions/domain/transaction-state-machine.ts`
* **Estimativa:** 3 pontos / 1 dia

#### 📝 Descrição:
Transações financeiras não podem aceitar transições arbitrárias de status. Por exemplo: uma transação com status `REFUNDED` ou `FAILED` não pode transicionar diretamente para `SETTLED` caso chegue um webhook atrasado.

#### 🎯 Critérios de Aceite:
- [ ] Implementar classe de Domínio `TransactionStateMachine`.
- [ ] Matriz estrita de transições permitidas:
  - `CREATED` ➔ `PENDING` ➔ `CONFIRMED` ➔ `SETTLED`.
  - `SETTLED` ➔ `REFUND_REQUESTED` ➔ `REFUNDED`.
  - `PENDING` ➔ `EXPIRED` ou `FAILED`.
- [ ] Qualquer tentativa de transição proibida deve rejeitar com `InvalidStateTransitionException` e gerar log de auditoria.

---

### [CARD-FIN-05] Governança de Alçadas e Aprovação Dupla de Saques (MFA no Saque)
* **Prioridade:** 🟡 Média (Nível 3 — Compliance BACEN)
* **Coluna Sugerida:** `To Do`
* **Estimativa:** 3 pontos / 1 dia

#### 🎯 Critérios de Aceite:
- [ ] Saques acima de R$ 5.000,00 (ou configurado pelo Merchant) exigem confirmação via código TOTP / 2FA.
- [ ] Saques acima de R$ 50.000,00 exigem aprovação de um segundo usuário com perfil `FINANCEIRO_ADMIN`.
- [ ] Registro completo do IP, navegador e geolocalização do operador no momento da aprovação.

---

## 🌐 Sprint 3: Webhooks, Integrações Externas & Antifraude

---

### [CARD-INT-01] Validação Estrita de Assinatura HMAC e Replay Window em Webhooks Recebidos
* **Prioridade:** 🔴 Crítica (Nível 1/3 — Segurança de Integração)
* **Coluna Sugerida:** `To Do`
* **Módulos Afetados:** `src/modules/webhooks/presentation/http/controllers/webhook-receiver.controller.ts`
* **Estimativa:** 3 pontos / 1 dia

#### 🎯 Critérios de Aceite:
- [ ] Validação da assinatura HMAC-SHA256 usando `crypto.timingSafeEqual` sobre o **raw body** da requisição antes de fazer o parse JSON.
- [ ] Verificação de cabeçalho de timestamp (`X-Signature-Timestamp`): tolerância máxima de 300 segundos (5 minutos) contra ataques de replay.
- [ ] Tabela de eventos recebidos (`processed_webhook_events`) com índice `UNIQUE(provider, event_id)` para descarte imediato de entregas duplicadas sem reprocessar saldo.

---

### [CARD-INT-02] Proteção contra SSRF em Webhooks de Saída (Cadastrados por Usuários)
* **Prioridade:** 🔴 Crítica (Nível 0/1 — Infraestrutura & Segurança de Rede)
* **Coluna Sugerida:** `To Do`
* **Módulos Afetados:** `src/modules/webhooks/application/services/webhook-dispatcher.service.ts`
* **Estimativa:** 3 pontos / 1 dia

#### 📝 Descrição:
Conforme a Regra Global nº 20, endpoints configurados por clientes para receber webhooks não podem apontar para a infraestrutura interna da plataforma ou redes locais.

#### 🎯 Critérios de Aceite:
- [ ] Resolução DNS da URL configurada antes de disparar o HTTP request.
- [ ] Bloqueio absoluto para:
  - `127.0.0.0/8`, `::1` (localhost)
  - `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (RFC1918)
  - `169.254.169.254` (Metadata do provedor de nuvem AWS/GCP/Azure)
  - Portas não padrão (permitir apenas 443 HTTPS).
- [ ] Não seguir redirecionamentos automáticos (`maxRedirects: 0`) para evitar DNS Rebinding.

---

### [CARD-INT-03] Fila com Dead Letter Queue (DLQ) para Despacho de Webhooks
* **Prioridade:** 🟡 Média (Nível 1 — Resiliência)
* **Coluna Sugerida:** `To Do`
* **Módulos Afetados:** `src/modules/webhooks/infrastructure/queues/`
* **Estimativa:** 5 pontos / 2 dias

#### 🎯 Critérios de Aceite:
- [ ] Configuração de fila com BullMQ / Redis.
- [ ] Política de retentativa exponencial com jitter:
  - Tentativa 1: Imediata.
  - Tentativa 2: 1 minuto.
  - Tentativa 3: 5 minutos.
  - Tentativa 4: 30 minutos.
  - Tentativa 5: 2 horas.
- [ ] Falha persistente após 5 tentativas: mover para a **Dead Letter Queue (DLQ)** e marcar o webhook do cliente como instável (`DEGRADED`).
- [ ] Timeout estrito de 10 segundos por tentativa de webhook.

---

### [CARD-INT-04] Circuit Breaker e Timeout Estrito nas APIs de Bancos e PSPs
* **Prioridade:** 🔴 Alta (Nível 3 — Resiliência Financeira)
* **Coluna Sugerida:** `To Do`
* **Módulos Afetados:** `src/modules/integrations/psp/`
* **Estimativa:** 3 pontos / 1 dia

#### 🎯 Critérios de Aceite:
- [ ] Implementação de Circuit Breaker (ex: via `opossum` ou lógica interna).
- [ ] Se a taxa de erro do PSP parceiro ultrapassar 40% em uma janela de 1 minuto: abrir o circuito por 30 segundos e rotear para o adquirente de contingência (fallback gateway).
- [ ] Timeout de chamada de rede máximo de 4.000ms para geração de QR Code Pix.

---

## 🛡️ Sprint 4: Observabilidade, Auditoria & Multi-Tenancy

---

### [CARD-OBS-01] Propagação de Correlation ID Distribuído (`X-Correlation-Id`)
* **Prioridade:** 🟡 Média (Nível 1 — Observabilidade)
* **Coluna Sugerida:** `To Do`
* **Módulos Afetados:** `src/core/infrastructure/middleware/correlation-id.middleware.ts`
* **Estimativa:** 2 pontos / Meio dia

#### 🎯 Critérios de Aceite:
- [ ] Middleware extrai `X-Correlation-Id` ou `X-Request-Id` do header HTTP ou gera um novo UUIDv4 seguro.
- [ ] Devolve o header na resposta HTTP para o cliente (`res.setHeader('X-Correlation-Id', correlationId)`).
- [ ] Injeta o Correlation ID no contexto assíncrono (usando `AsyncLocalStorage`) para que todos os logs incluam o ID automaticamente.
- [ ] Propaga o Correlation ID nas mensagens de filas e nas chamadas HTTP para parceiros externos.

---

### [CARD-OBS-02] Redaction Automático de Dados Sensíveis nos Logs
* **Prioridade:** 🔴 Alta (Nível 2 — Privacidade e Compliance PCI-DSS / LGPD)
* **Coluna Sugerida:** `To Do`
* **Módulos Afetados:** `src/core/infrastructure/logger/`
* **Estimativa:** 3 pontos / 1 dia

#### 🎯 Critérios de Aceite:
- [ ] Interceptor global de logging com máscara automática:
  - Senhas, hashes e secrets: `[REDACTED_SECRET]`
  - CVV/CVC e chaves privadas: `[REDACTED_PCI]`
  - CPF/CNPJ: máscara preservando apenas os dígitos finais (`***.***.123-45`)
  - Tokens JWT e bearer headers: mostrar apenas primeiros 10 caracteres (`Bearer eyJhbGci...[REDACTED]`)
- [ ] Garantir que erros lançados pelo Prisma ou bibliotecas terceiras nunca vazem connection strings ou senhas no console.

---

### [CARD-OBS-03] Validação Automática de Tenant Isolation em Queries Prisma
* **Prioridade:** 🔴 Crítica (Nível 2 — Prevenção de BOLA / IDOR)
* **Coluna Sugerida:** `To Do`
* **Módulos Afetados:** `src/core/infrastructure/prisma/tenant-extension.ts`
* **Estimativa:** 5 pontos / 1.5 dias

#### 📝 Descrição:
Conforme a Regra Global nº 6, toda consulta que acesse recursos de clientes (transações, recebedores, extrato, configurações) deve obrigatoriamente incluir `tenantId: authenticatedTenantId`. Nenhuma busca pode confiar apenas em `findById(id)`.

#### 🎯 Critérios de Aceite:
- [ ] Criar extensão de cliente Prisma (`$extends`) ou middleware de repositório que valide que toda operação de leitura/escrita em tabelas multi-tenant possui o filtro de `tenantId`.
- [ ] Disparar exceção em desenvolvimento e testes se uma query multi-tenant for executada sem o `tenantId`.
- [ ] Teste unitário comprovando que o Tenant A não consegue ler nem alterar transações do Tenant B mesmo conhecendo o UUID da transação.
