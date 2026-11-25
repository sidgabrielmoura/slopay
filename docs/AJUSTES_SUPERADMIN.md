# Ajustes do superadmin

| Etapa | Resultado esperado | Validação |
| --- | --- | --- |
| 1. Equipe | A conta administrativa mais antiga ainda cadastrada, pela data de criação, fica protegida contra exclusão. | Conferir o botão, o bloqueio na API e a exclusão de outro membro com segundo fator e auditoria. |
| 2. Saldos | Cada liquidação mostra o saldo contábil do cliente imediatamente antes e depois do lançamento. A liberação da reserva de saque aparece separadamente. | Conferir créditos, débitos, reservas, estornos e operações repetidas. |
| 3. Pagador | O detalhe mostra contraparte e referência da transação Pix verificadas na liquidação, conforme os campos fornecidos pelo provedor. | Conferir vínculo com cobrança, carteira, status e valor, documentos mascarados e dados ausentes. |
| 4. Filtros | Movimentações permite combinar cliente pesquisável, provedor, período e situação, com o mesmo recorte na lista, nos totais e na exportação. | Conferir seleção, combinação, navegação e paginação por identificador. |
| 5. Provedores | Em **Carteiras → Provedores**, a administração cadastra o nome e o código com segundo fator. As carteiras existentes usam o Asaas. | Conferir cadastro, permissões, vínculo das carteiras e situação da integração. |
| 6. Split | O Slopay calcula a tarifa sobre o valor bruto na criação e contabiliza a receita e o crédito do cliente quando o pagamento liquida. | Conferir tarifa do provedor, franquia, reenvio, estorno e conciliação de cobranças com split anterior. |
| 7. Origem | A movimentação identifica se começou na plataforma ou pela API. A aprovação pelo painel preserva a origem da solicitação. | Conferir cobranças, saques, lotes, estornos e registros anteriores à mudança. |
| 8. Tarifa mínima | Fora da franquia, cobrar o maior valor entre a tarifa mínima e a soma das parcelas fixa e percentual. | Conferir piso, arredondamento em centavos, regras por cliente, franquia e valores incompatíveis com as tarifas. |

## Regras operacionais

- A proteção é aplicada ao superadmin mais antigo entre os membros ainda cadastrados, com desempate por identificador. A exclusão de outro membro mantém o segundo fator e o registro de auditoria.
- Os saldos históricos aparecem quando o extrato permite reconstruir a posição e conferir o total atual. Os detalhes do pagador são registrados na conciliação quando o provedor devolve os dados no Pix confirmado. A origem histórica aparece como **Não registrada** quando a operação não traz evidência do canal.
- Provedores novos ficam como **Aguardando integração**. O código identifica a integração e precisa de um adaptador antes de processar operações.
- A tarifa do Slopay é congelada ao emitir a cobrança. Fora da franquia, aplica-se o maior valor entre o piso e a soma do valor fixo com o percentual arredondado sobre o bruto. A tarifa do provedor segue as condições da carteira emissora.
- A liquidação contabiliza a receita do Slopay e o saldo do cliente na mesma transação. A receita permanece na carteira emissora do provedor, com registro contábil separado. Estornos revertem a tarifa do Slopay proporcionalmente. Cobranças legadas já emitidas com split externo seguem o plano gravado.
- A carteira mostra a receita do Slopay separada dos saldos dos clientes. A conciliação compara a soma de ambos ao saldo consultado no provedor. Uma divergência que deixe o líquido do recebimento abaixo da tarifa prevista coloca a cobrança em revisão.

## Validação e publicação

O build do backend e os 83 testes unitários passaram. Os 45 testes de integração passaram no PostgreSQL isolado com o perfil de permissões do backend e respostas simuladas do provedor. O build de produção do frontend e cinco verificações HTTP das rotas administrativas também passaram.

Para homologar em produção, aplique as seis migrações de saldos, pagador, provedores, split, origem e tarifa mínima junto com as versões correspondentes do backend e do frontend.
