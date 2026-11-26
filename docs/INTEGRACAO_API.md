# Integração com a API do Slopay

O titular gerencia credenciais em **Integrações → Chaves de API**. Crie uma chave para cada aplicação e selecione os escopos que ela usa. Copie o segredo na emissão e armazene-o no cofre do seu servidor. Use **Segurança** para restringir por IPv4, IPv6 ou CIDR e consulte **Logs** para conferir chamadas e entregas.

## Conectar pela primeira vez

1. Conclua a abertura da conta e a configuração de segurança do titular. Em **Chaves de API**, crie uma chave com o escopo `pix:charges:read` e confirme com seu segundo fator.
2. Copie o endereço exibido em **Conectar uma aplicação**. Defina `SLOPAY_API_URL` e `SLOPAY_API_KEY` no servidor que fará as chamadas.
3. Consulte a lista de cobranças e confira o HTTP `200`. A mesma chamada aparece em **Logs → Requisições**, com o identificador retornado em `X-Correlation-ID`.

```bash
curl -i "$SLOPAY_API_URL/v1/pix/charges" \
  -H "X-API-Key: $SLOPAY_API_KEY"
```

## Requisições

Use a origem HTTPS pública do backend Slopay e envie a chave Slopay em `X-API-Key`. Em desenvolvimento, o painel informa os caminhos da API de homologação e emite a credencial correspondente ao ambiente. Os limites são de 60 requisições por minuto por chave e 180 por empresa. Ao receber `429`, aguarde o intervalo do cabeçalho `Retry-After`.

| Rota | Escopo | Uso |
| --- | --- | --- |
| `POST /v1/pix/charges` | `pix:charges:create` | Registra a cobrança e retorna `202` com seu identificador Slopay. |
| `GET /v1/pix/charges` | `pix:charges:read` | Lista até 25 cobranças. Envie `before` com o `nextCursor` anterior e, se desejar, `updatedAfter` em UTC. |
| `GET /v1/pix/charges/:id` | `pix:charges:read` | Consulta situação, vencimento, última alteração, confirmação e estornos. |
| `GET /v1/pix/charges/:id/qr-code` | `pix:charges:read` | Obtém o QR Code e Pix Copia e Cola enquanto a cobrança estiver pagável. |
| `POST /v1/pix/withdrawals` | `pix:withdrawals:request` | Registra uma solicitação aguardando a aprovação do titular e retorna `202`. |
| `GET /v1/pix/withdrawals/:id` | `pix:withdrawals:read` | Consulta uma solicitação ou saque da conta. |

Os dois `POST` exigem `Content-Type: application/json`, `Idempotency-Key` e `amountInCents` inteiro. Para novas operações, gere uma chave de idempotência por instrução do seu sistema. Em retentativas após timeout, envie a mesma chave e os mesmos dados. Reutilizá-la com dados diferentes retorna `409`.

### Criar cobrança

```json
{
  "amountInCents": 2500,
  "payer": {
    "name": "Nome cadastrado do pagador",
    "document": "<CPF ou CNPJ numérico do pagador>"
  }
}
```

Guarde o `id` da resposta. Consulte o detalhe com intervalos crescentes enquanto a emissão estiver em andamento, ou aguarde `PIX_CHARGE_CREATED`. Quando `qrCodeAvailable` ficar verdadeiro, consulte o QR Code da mesma cobrança. A resposta traz `encodedImage` em Base64, `payload` para o Pix Copia e Cola e `expirationDate`.

O endpoint do QR Code confirma a situação no Asaas. Se devolver `409 PIX_QR_UNAVAILABLE`, atualize o detalhe da cobrança antes de oferecer pagamento. Se devolver `503 ASAAS_QR_UNAVAILABLE`, faça uma nova consulta ao mesmo identificador após um intervalo. Acompanhe cobranças em revisão pelo campo `state`. Confirme o recebimento pelo evento `PIX_RECEIVED` ou pelo estado `PAID` no detalhe da cobrança. Use `updatedAt` para acompanhar alterações e `refund` para os estornos.

### Solicitar saque

```json
{
  "amountInCents": 2500,
  "pixKeyType": "EMAIL",
  "pixKey": "financeiro@example.com"
}
```

Os tipos aceitos são `CPF`, `CNPJ`, `EMAIL`, `PHONE` e `EVP`. Ao enviar telefone, use E.164 com o prefixo `+55`. Uma conta com limites definidos e carteira habilitada pode criar uma solicitação em `AWAITING_APPROVAL`. Caso contrário, a API devolve `409 PIX_WITHDRAWAL_UNAVAILABLE`.

A solicitação fica disponível para decisão por 24 horas. Em **Aprovações**, o titular confere o destino, o valor, a tarifa do Slopay e o teto da tarifa do provedor. A autorização reserva o total máximo exibido. Se a chave originadora estiver pausada, revogada ou expirada, a solicitação fica impedida de avançar. Use o detalhe para consultar a decisão ou uma expiração com `reason: "REQUEST_EXPIRED"`. Use `PIX_SENT` ou o estado `DONE` no detalhe para confirmar a liquidação. Saques em lote são montados e autorizados pelo titular no painel.

### Diagnóstico pela resposta

| Resposta | Como tratar |
| --- | --- |
| `401 INVALID_API_KEY` | Confira a credencial do ambiente e seu estado na lista de chaves. |
| `403` | Confira os escopos e o IP de saída permitido em **Segurança**. |
| `404` | Confira se a rota está habilitada no ambiente e se o registro pertence à conta da chave. |
| `409 IDEMPOTENCY_KEY_CONFLICT` | Retome a operação com os dados originais ou use outra chave de idempotência para uma nova operação. |
| `429` | Aguarde o intervalo retornado em `Retry-After`. |

O histórico registra método, rota, status HTTP, duração, prefixo mascarado da chave e ID de rastreio por 30 dias. Corpos e segredos das chamadas ficam fora dos logs. Se o backend estiver atrás de um proxy, configure `TRUSTED_PROXY_CIDRS` com os endereços do ingress confiável e confira a autorização a partir do IP de saída da aplicação cliente.

## Webhooks

Em **Integrações → Webhooks**, cadastre um endpoint HTTPS público sem redirecionamento e escolha os eventos. Se quiser autenticar a requisição também por token, informe ou gere um valor exclusivo. Quando configurado, o Slopay envia o token no cabeçalho `webhook-token`, inclusive na verificação do destino. Copie as credenciais exibidas após salvar e configure o servidor receptor. Ao receber `WEBHOOK_VERIFICATION`, valide a assinatura e responda `2xx` com JSON `{"challenge":"valor recebido em data.challenge"}`. Um destino começa a enviar eventos após ser verificado e com a fila ativada.

| Evento | Momento |
| --- | --- |
| `PIX_CHARGE_CREATED` | A cobrança foi registrada no provedor e conciliada com a referência do Slopay. |
| `PIX_RECEIVED` | O recebimento foi confirmado e o crédito foi registrado no Slopay. |
| `PIX_REFUNDED` | O estorno confirmado foi lançado. |
| `APPROVAL_REQUIRED` | Uma chave de API solicitou um saque e o titular precisa decidir. |
| `PIX_SENT` | O saque foi concluído e a baixa da reserva foi registrada. |
| `WITHDRAWAL_FAILED` | O saque foi encerrado sem liquidação, incluindo recusa pelo titular. |

Em `PIX_SENT`, `data.feeInCents` soma as tarifas confirmadas do provedor e do Slopay. Quando houve cobrança da tarifa do Slopay, `data.slopayFeeInCents` informa a parcela já incluída nesse total.

Para eventos de negócio, responda `2xx` após persistir a recepção de forma idempotente. Em modo **Sequencial**, uma falha definitiva interrompe a fila. Após corrigir o destino, clique em **Reativar fila** para repetir o evento que a interrompeu. No modo **Não sequencial**, os eventos podem chegar fora de ordem, e uma falha definitiva permite reenviar aquela entrega pelos logs. As retentativas automáticas cobrem falhas temporárias, como `429` ou `503`, quando habilitadas.

Uma fila pausada guarda os novos eventos para envio após a reativação. Se houver um e-mail de avisos configurado, o Slopay envia até um alerta por hora por webhook quando uma entrega termina com falha. **Logs → Webhooks** mostra os IDs, os estados e o resultado de cada tentativa.

### Verificação da assinatura

1. Capture o corpo bruto da requisição e os cabeçalhos `webhook-id`, `webhook-timestamp` e `webhook-signature`. O timestamp de envio em segundos fica no cabeçalho.
2. Remova `whsec_` do segredo e decodifique o restante de Base64.
3. Calcule HMAC-SHA256 sobre `webhook-id + "." + webhook-timestamp + "." + corpo bruto`. Compare os bytes com a assinatura Base64 após `v1,` usando comparação em tempo constante.
4. Rejeite timestamps fora da janela aceitável para o seu servidor, por exemplo cinco minutos. Depois de autenticar, deduplique pelo `webhook-id`. O Slopay mantém o ID entre tentativas e assina novamente com o timestamp do envio.
5. Use o `type` e o `id` do corpo para registrar a mudança. O corpo também contém `version`, `timestamp`, `environment` e `data`. Produção usa `environment: "live"`.

Exemplo em Node.js. Passe o corpo bruto recebido pelo seu servidor como um `Buffer`.

```js
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifySlopayWebhook(rawBody, headers, secret) {
  const id = headers["webhook-id"];
  const timestamp = headers["webhook-timestamp"];
  const signature = headers["webhook-signature"];
  const now = Math.floor(Date.now() / 1000);
  if (
    typeof id !== "string" ||
    typeof timestamp !== "string" ||
    !/^\d{1,12}$/.test(timestamp) ||
    Math.abs(now - Number(timestamp)) > 300 ||
    typeof signature !== "string" ||
    !/^v1,[A-Za-z0-9+/]{43}=$/.test(signature) ||
    typeof secret !== "string" ||
    !/^whsec_[A-Za-z0-9+/]{43}=$/.test(secret)
  ) return false;

  const expected = createHmac("sha256", Buffer.from(secret.slice(6), "base64"))
    .update(`${id}.${timestamp}.`)
    .update(rawBody)
    .digest();
  const supplied = Buffer.from(signature.slice(3), "base64");
  return supplied.length === expected.length && timingSafeEqual(expected, supplied);
}
```

Depois de verificar, responda ao desafio ou grave o ID do evento com uma restrição de unicidade antes de retornar sucesso. A tolerância de tempo considera o cabeçalho de envio. O `timestamp` no corpo corresponde à criação do evento e permanece igual nas retentativas.

## Rotação de chaves

Crie uma nova credencial com os mesmos escopos necessários, atualize seu servidor e valide uma consulta. Revogue a chave antiga em **Chaves de API**. Ao trocar o segredo de um webhook verificado, as entregas pendentes e os novos eventos da assinatura ficam na fila. O destino volta a recebê-los após verificação e habilitação. Quando a URL muda, o destino precisa de uma nova verificação e as entregas pendentes da URL anterior são canceladas.

## Ativação em produção

1. Aplique as migrações do backend no banco de produção e publique a versão correspondente no Render. O ambiente usa `NODE_ENV=production`, `AMBIENTE=producao`, Redis para limites distribuídos e `INTEGRATIONS_CREDENTIAL_ENCRYPTION_KEY` para os segredos de integração armazenados.
2. Use `INTEGRATIONS_LIVE_ENABLED=true` para liberar o gerenciamento e as rotas `/v1/pix`. Recebimentos e saques também dependem das flags e dos limites do Asaas e de carteiras habilitadas para a conta. Mantenha ativos os webhooks de eventos do Asaas e a validação de saques das carteiras. [Configuração dos webhooks do Asaas](https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook)
3. Publique o frontend com o endereço público correto. Se o endereço da API dos clientes for diferente de `SLOPAY_BACKEND_URL`, informe sua origem HTTPS em `SLOPAY_PUBLIC_API_URL`.
