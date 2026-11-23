# Integração com a API do Slopay

O titular gerencia credenciais em **Integrações → Chaves de API**. Crie uma chave para cada aplicação e selecione os escopos que ela usa. Copie o segredo na emissão e armazene-o no cofre do seu servidor. Use **Segurança** para restringir por IPv4, IPv6 ou CIDR e consulte **Logs** para conferir chamadas e entregas.

## Requisições

Use a origem HTTPS pública do backend Slopay e envie a chave Slopay em `X-API-Key`. Os limites são de 60 requisições por minuto por chave e 180 por empresa. Ao receber `429`, aguarde o intervalo do cabeçalho `Retry-After`.

| Rota | Escopo | Uso |
| --- | --- | --- |
| `POST /v1/pix/charges` | `pix:charges:create` | Registra a cobrança e retorna `202` com seu identificador Slopay. |
| `GET /v1/pix/charges` | `pix:charges:read` | Lista até 25 cobranças. Envie `before` com o `nextCursor` anterior e, se desejar, `updatedAfter` em UTC. |
| `GET /v1/pix/charges/:id` | `pix:charges:read` | Consulta situação, vencimento, confirmação e estornos. |
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

Guarde o `id` da resposta. Consulte a cobrança até `qrCodeAvailable` ficar verdadeiro ou até receber `PIX_CHARGE_CREATED`. Consulte o QR Code da mesma cobrança. Confirme a entrada depois que o gateway registrar o pagamento. Use `PIX_RECEIVED` ou o detalhe da cobrança para atualizar sua conciliação.

### Solicitar saque

```json
{
  "amountInCents": 2500,
  "pixKeyType": "EMAIL",
  "pixKey": "financeiro@example.com"
}
```

Os tipos aceitos são `CPF`, `CNPJ`, `EMAIL`, `PHONE` e `EVP`. A solicitação começa em `AWAITING_APPROVAL` e fica disponível para decisão por 24 horas. O titular confere o destino, o valor e a tarifa máxima em **Aprovações** e confirma com biometria ou autenticador. A reserva só é criada na autorização. Se a chave originadora estiver pausada, revogada ou expirada, a solicitação fica impedida de avançar. Use o detalhe para consultar a decisão e `PIX_SENT` para acompanhar a liquidação. Saques em lote são montados e autorizados pelo titular no painel.

## Webhooks

Em **Integrações → Webhooks**, cadastre um endpoint HTTPS público sem redirecionamento, escolha os eventos e copie o segredo de assinatura. Quando o Slopay enviar `WEBHOOK_VERIFICATION`, valide a assinatura e responda `2xx` com JSON `{"challenge":"valor recebido em data.challenge"}`. Depois de verificar, habilite o destino.

| Evento | Momento |
| --- | --- |
| `PIX_CHARGE_CREATED` | A cobrança foi registrada no provedor e conciliada com a referência do Slopay. |
| `PIX_RECEIVED` | O recebimento foi confirmado e o crédito foi registrado no Slopay. |
| `PIX_REFUNDED` | O estorno confirmado foi lançado. |
| `APPROVAL_REQUIRED` | Uma chave de API solicitou um saque e o titular precisa decidir. |
| `PIX_SENT` | O saque foi concluído e a baixa da reserva foi registrada. |
| `WITHDRAWAL_FAILED` | O saque foi encerrado sem liquidação, incluindo recusa pelo titular. |

Apenas a entrega do desafio depende do corpo da resposta. Para eventos de negócio, responda `2xx` após persistir a recepção de forma idempotente. Cada destino recebe eventos em sequência. Quando a entrega esgota as tentativas, a fila para naquele evento. Depois de corrigir o destino, o titular pode retomá-la no painel.

### Verificação da assinatura

1. Capture o corpo bruto da requisição e os cabeçalhos `webhook-id`, `webhook-timestamp` e `webhook-signature`. O timestamp de envio em segundos fica no cabeçalho.
2. Remova `whsec_` do segredo e decodifique o restante de Base64.
3. Calcule HMAC-SHA256 sobre `webhook-id + "." + webhook-timestamp + "." + corpo bruto`. Compare os bytes com a assinatura Base64 após `v1,` usando comparação em tempo constante.
4. Rejeite timestamps fora da janela aceitável para o seu servidor, por exemplo cinco minutos. Depois de autenticar, deduplique pelo `webhook-id`. O Slopay mantém o ID entre tentativas e assina novamente com o timestamp do envio.
5. Use o `type` e o `id` do corpo para registrar a mudança. O corpo também contém `version`, `timestamp`, `environment` e `data`. Produção usa `environment: "live"`.

## Rotação de chaves

Crie uma nova credencial com os mesmos escopos necessários, atualize seu servidor e valide uma consulta. Revogue a chave antiga em **Chaves de API**. Em **Webhooks**, a troca do segredo é uma operação separada que exige ajustar a validação do receptor.
