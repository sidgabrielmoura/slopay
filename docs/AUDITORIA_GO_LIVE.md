# Auditoria de preparação para produção

## Atualização de 23 de novembro de 2026

O código de produção cobre a carteira cadastrada, o roteamento, os recebimentos Pix, o saque direto, o lote, o extrato, os comprovantes e as integrações de clientes. Os testes usam PostgreSQL isolado e respostas controladas do Asaas. As flags de movimentação começam desligadas. A configuração das carteiras reais e o teste com dinheiro real ainda dependem do ambiente publicado.

| Área | Implementação |
| --- | --- |
| Contas bolsão | Superadmin cadastra a carteira, configura permissões e tokens com MFA e escolhe sorteio padrão, carteira fixa ou sorteio restrito por titular. O gateway guarda a carteira escolhida em cada operação. A troca de chave valida a nova credencial na mesma carteira, exige MFA, protege alterações concorrentes e registra auditoria. |
| Receber Pix | O Slopay grava a cobrança antes de enviar ao Asaas. O pagador da cobrança é cadastrado na carteira escolhida com dados reais e reutilizado nas cobranças seguintes. O webhook autenticado agenda a conciliação e o gateway confere na API a referência, a carteira, o pagador, o valor e o status antes de creditar o saldo líquido. |
| Saques e lotes | O titular revisa os dados e usa biometria ou autenticador. O gateway reserva valor e tarifa máxima antes do envio. Cada item de um lote tem operação, reserva e liquidação próprias. O lote usa uma carteira com saldo suficiente para o total do próprio titular. |
| Movimentações | Extrato, indicadores, dashboard, controle financeiro e comprovantes do cliente leem operações persistidas. Categorias editáveis usam apenas saques confirmados do titular. Os comprovantes compartilhados expiram após 30 dias. |
| Integrações | As chaves pertencem ao titular e usam escopos, expiração, pausa, revogação, regras de rede e logs. A API lista cobranças e registra solicitações de saque para revisão do titular. Os webhooks são verificados por desafio HTTPS, assinados e entregues em sequência com interrupção e retomada da fila. |
| Superadmin | Transações, cobranças, lotes, aprovações, extrato global e relatórios consultam o livro financeiro de produção. A fila e o sino acompanham revisões, aprovações e webhooks interrompidos. O monitor global mostra dados operacionais das entregas. |
| Tesouraria | Contas operacionais e Saldos & Posições mostram o saldo contabilizado e reservado por carteira, a última consulta de saldo ao Asaas e a diferença. Taxas e Limites consulta as tarifas do provedor com cache e mostra os limites configurados do Slopay. Regras de Alçada mostra o titular como aprovador e a configuração da validação por carteira. [Taxas da conta](https://docs.asaas.com/reference/recuperar-taxas-da-conta) |
| Encerramento | O superadmin pode tratar contas com histórico por encerramento assistido do acesso. O banco impede exclusão de vínculos com operações reais. A interface e o backend bloqueiam encerramento quando existe saldo, reserva, estorno ou operação pendente. |

### Ativação controlada

1. Publique backend e frontend com `AMBIENTE=producao`. Configure o backend em `NODE_ENV=production`, com Redis, banco de produção, papel de runtime sem `BYPASSRLS` e a chave separada `INTEGRATIONS_CREDENTIAL_ENCRYPTION_KEY`. Aplique as migrações `20261122190000_add_live_pix_operations`, `20261123120000_scope_live_receipt_shares` e `20261123150000_complete_live_integrations` com a conexão administrativa de migração. As credenciais ficam no cofre do ambiente. [Variáveis do backend](../../gatepay-back/.env.example)
2. Confirme o domínio do Resend e a entrega do código de e-mail. Cadastre um titular do zero, configure o segundo fator, confirme o e-mail e conclua o perfil. No superadmin, assuma a análise e aprove o cadastro. O operador, quando necessário, recebe convite do titular pela área de usuários. O titular continua sendo o autorizador de saques.
3. Habilite `ASAAS_LIVE_ACCOUNT_REGISTRATION_ENABLED`. Em **Contas bolsão**, cadastre a carteira com o ID e a chave de produção da própria conta Asaas. Em **Configurar**, confira os caminhos dos dois callbacks e use valores aleatórios distintos. Em **Roteamento**, deixe o sorteio padrão ou escolha a política da conta piloto.
4. No Asaas, cadastre o webhook de eventos com a URL pública do backend e o caminho `/webhooks/asaas/live/<id-da-conta-bolsao>`. Configure eventos de criação, recebimento, expiração, estorno e transferências. Para saques, habilite também **Integrações → Mecanismos de segurança** com a URL `/webhooks/asaas/live/<id-da-conta-bolsao>/withdrawal-authorization`. Confirme que os dois tokens correspondem à carteira e que a validação se aplica aos saques via API. [Criar webhook no Asaas](https://docs.asaas.com/docs/criar-novo-webhook-pela-aplicacao-web) · [Validação de saques](https://docs.asaas.com/docs/mecanismo-para-validacao-de-saque-via-webhooks)
5. Defina os limites em centavos `ASAAS_LIVE_CHARGE_LIMIT_CENTS`, `ASAAS_LIVE_WITHDRAWAL_LIMIT_CENTS` e `ASAAS_LIVE_DAILY_WITHDRAWAL_LIMIT_CENTS`. Habilite primeiro `ASAAS_LIVE_RECEIVING_ENABLED` e faça um recebimento de baixo valor. Compare cobrança, valor líquido, data de liquidação, crédito, extrato e comprovante com o Asaas. Depois de validar o callback de saques e a tarifa máxima da carteira, habilite `ASAAS_LIVE_WITHDRAWALS_ENABLED`. Faça um saque pequeno e um lote de dois itens. Compare reserva, tarifa efetiva e saldo final. [Cobranças Pix](https://docs.asaas.com/docs/cobrancas-via-pix) · [Transferências Pix](https://docs.asaas.com/reference/transferir-para-conta-de-outra-instituicao-ou-chave-pix)
6. Habilite `INTEGRATIONS_LIVE_ENABLED` para o piloto de integrações. Crie uma chave por escopo e teste emissão, pausa e revogação. Crie um destino HTTPS e confirme sua assinatura e resposta ao desafio antes de observar a fila. Use o mesmo ID de evento para deduplicar tentativas recebidas. `ASAAS_LIVE_PIX_RECONCILIATION_ENABLED` permite manter o acompanhamento das operações já iniciadas quando a entrada de novas movimentações estiver pausada.

### Contrato de integração de produção

| Método e rota | Escopo |
| --- | --- |
| `POST /v1/pix/charges` | `pix:charges:create` |
| `GET /v1/pix/charges` | `pix:charges:read` |
| `GET /v1/pix/charges/:id` | `pix:charges:read` |
| `GET /v1/pix/charges/:id/qr-code` | `pix:charges:read` |
| `POST /v1/pix/withdrawals` | `pix:withdrawals:request` |
| `GET /v1/pix/withdrawals/:id` | `pix:withdrawals:read` |

O guia descreve os payloads, os estados, a idempotência, o escopo por rota, o desafio e a validação da assinatura. [Integração com a API do Slopay](INTEGRACAO_API.md)

### Validação

Passaram os builds do Nest e do Next em produção, 80 testes unitários e 114 de integração. As suítes usam PostgreSQL descartável com papel de runtime e respostas Asaas controladas. A execução cobre abertura de conta, roteamento, crédito segregado, saque direto, lotes, aprovação via API, webhooks, rotação de chave, notificações, taxas, posições e relatórios.

As migrações foram aplicadas ao banco de desenvolvimento e ao Neon de produção. No Neon, a inspeção confirmou 54 migrações aplicadas, RLS forçado nas tabelas verificadas, três comprovantes vigentes preservados e zero operações visíveis sem contexto de sessão com o papel de runtime. O runtime carece de leitura direta da chave cifrada da carteira.

O Render publicou o backend `3b87a08` e a Vercel publicou o frontend `803afa5`. Em `app.slopay.com.br`, o login abriu e recusou credenciais fictícias com `401`. As novas rotas administrativas e de integração exigiram sessão. O backend respondeu `200` em `/ready` e `404` nas rotas Pix de Sandbox e da API pública de produção. [Deploy do backend](https://dashboard.render.com/web/srv-dbvipbe1egvs73addskg/deploys/dep-dc26h2mc6qcc738ku3ug) · [Deploy do frontend](https://vercel.com/sid-gabriel-barbosa-mouras-projects/slopay/5dBJy4UdyNgQYumaUAnK4E59B6n9)

### Limites desta entrega

- O Neon de produção ainda está sem carteiras reais cadastradas. A API pública de produção depende de ativação. Há uma conta administrativa com endereço de teste ainda ativa. Valide o acesso de um superadmin real com MFA antes de remover o acesso de teste.
- A fila de e-mail registrou um envio aceito pelo provedor nos últimos sete dias. O piloto deve conferir o recebimento do OTP, dos avisos de aprovação ou recusa e dos convites nas caixas dos destinatários.
- Falta a homologação com uma carteira real no ambiente publicado, incluindo o identificador, a chave Pix e a tarifa recebidos no callback de autorização, os valores retidos pelo Asaas e os estornos com diferenças de tarifa. Os testes locais não chamaram o Asaas real.
- A diferença por carteira compara o saldo contabilizado atual com o último saldo consultado no Asaas. O provedor apresenta saldo disponível, que pode refletir movimentos externos, retenções e diferença de horário. Falta importar e cruzar o extrato completo do provedor por lançamento, com histórico das divergências e tratamento assistido. [Saldo da conta](https://docs.asaas.com/reference/recuperar-saldo-da-conta) · [Extrato do Asaas](https://docs.asaas.com/reference/recuperar-extrato)
- Os comprovantes reais compartilham os dados conciliados no Slopay. O vínculo ao comprovante oficial do Asaas, o identificador End-to-End e os dados da contraparte seguem fora da versão compartilhável.
- A API externa solicita saque individual. O lote começa no painel e continua autorizado pelo titular. As solicitações por API expiram após 24 horas. O histórico conserva a referência e o estado. Ainda falta definir a política de retenção das chaves Pix cifradas de solicitações expiradas.
- O saldo fica segregado por titular e carteira. Uma alteração no roteamento pode deixar saldo em uma carteira fora da seleção. Para sacar aquele saldo, a carteira deve voltar ao conjunto elegível. A movimentação interna entre carteiras precisa de um fluxo de tesouraria.
- Uma resposta inconclusiva do Asaas após o envio leva a operação para verificação. O gateway mantém a carteira original e a reserva necessária. Uma operação que permaneça inconclusiva precisa de procedimento de conciliação assistida. A homologação publicada deve conferir a origem dos IPs na cadeia de proxy usada pelas chaves de API, a entrega do Resend, o tempo de resposta dos callbacks e o custo das consultas com volume representativo.

## Revisão anterior de 22 de novembro

O inventário a seguir registra o estado observado antes da atualização acima. Use a seção inicial para a situação atual.

Revisão de 22 de novembro de 2026. O cadastro do titular, a aprovação no Slopay e o cadastro de uma carteira real no Asaas são etapas distintas. Esta entrega prepara o cadastro de carteiras reais, incluindo a verificação da chave e da aprovação cadastral. A carteira cadastrada fica aguardando habilitação. Recebimentos, saques e integrações financeiras dos clientes ainda dependem do fluxo produtivo descrito neste documento.

## Correções

| Achado | Correção |
| --- | --- |
| O formulário de contas bolsão exigia um pagador de teste e chave de Sandbox. | A área de produção tem cadastro próprio. Confere a chave, o ID da carteira e o status geral da conta na API de produção do Asaas. Solicita confirmação do superadmin por chave de acesso ou autenticador. |
| Usar o cadastro de teste para armazenar uma carteira real colocaria a chave ao alcance de consultas e workers de teste. | A tabela de produção é separada, com RLS forçado, carteira única e chave cifrada em um contexto de produção. O papel da aplicação lê somente os campos públicos e a API registra o cadastro na trilha de auditoria. |
| Requisições recusadas pela regra de rede podiam atualizar o último uso da chave. | A atualização foi movida para depois da validação de rede e limites. |
| Entre a leitura de um webhook e o envio, o destino ou a situação do titular podia mudar. | A verificação checa novamente a versão e o titular depois da resolução DNS, antes do envio. O worker evita novas entregas para contas suspensas ou encerradas e volta a conferir o estado imediatamente antes de transmitir. |
| Algumas listas podiam reaproveitar resultados da consulta anterior sem conferir a identidade do superadmin. | Os dados reaproveitados para a paginação das listas afetadas ficam vinculados ao mesmo superadmin. |
| O Postgres local podia devolver datas com fuso diferente do esperado pelo adaptador do Prisma. A hora do cadastro de carteira chegou a divergir três horas entre a resposta de criação e a listagem. A janela das métricas de webhook também foi afetada. | As conexões da aplicação inicializam a sessão em UTC. A interface continua exibindo os horários de operação em Brasília. Registros antigos precisam ser conferidos antes de qualquer correção em massa. [PostgreSQL](https://www.postgresql.org/docs/current/runtime-config-client.html) · [Pool de conexões do Neon](https://neon.com/docs/connect/connection-pooling) |
| Em telas estreitas, a navegação administrativa permitia abrir apenas cinco páginas pela barra inferior. | O menu **Mais** usa o `Sheet` padrão do Slopay e herda os mesmos grupos da barra lateral. **Empresas** passou para o menu. O título e o botão de fechamento continuam visíveis durante a rolagem. [Sheet do shadcn/ui](https://ui.shadcn.com/docs/components/radix/sheet) |
| O botão de biometria comprimía a descrição no card de Segurança da conta em desktop. | O cartão passa a organizar texto e botão conforme sua própria largura. A ação fica abaixo do texto em cartões estreitos. Essa correção de leitura mantém as interações atuais. |

## Inventário do superadmin

A primeira coluna acompanha a navegação. A segunda registra a leitura funcional da página, da API e da origem dos dados. A terceira registra a revisão de permissões, isolamento e operações.

| Página | Fluxo e dados | Segurança e situação de produção |
| --- | --- | --- |
| Visão geral | Métricas Pix, movimentações, pendências e total de empresas. | O total de empresas é real. Os indicadores Pix aguardam transações de produção. A lista mantém o estado de indisponibilidade. |
| Fila de pendências | Busca, paginação, detalhes e avisos em tempo real. | A emissão do feed revalida a sessão. Produção exibe pendências de abertura de conta. A fila financeira e a cobertura dos alertas de produção seguem pendentes. |
| Abertura de contas | Listagem, detalhes, solicitação de ajustes, reprovação, reabertura e aprovação. | A aprovação exige análise assumida pelo mesmo superadmin, solicitação enviada e MFA. A decisão libera o cadastro Slopay e mantém a ativação financeira como etapa própria. |
| Empresas | Lista, detalhes, edição, histórico e controle de acesso. | O vínculo e as operações Pix do Sandbox ficam fora da visão produtiva. O perfil da empresa é persistido no banco. Acesso administrativo e alterações devem continuar separados do roteamento financeiro. |
| Contas operacionais | Posição das contas do modelo legado, detalhes e atividade. | Consulta financeira em Sandbox. As carteiras reais novas são verificadas em Contas bolsão. Falta uma posição conciliada por carteira de produção e titular. |
| Contas bolsão | Carteiras, verificação de credencial e, em desenvolvimento, regras de roteamento. | O cadastro real usa a API oficial de produção, RLS, MFA e auditoria. Roteamento, rotação de credencial e operações produtivas estão pendentes. |
| Transações Pix | Filtros, operações recentes, detalhes e exportação. | Backend de consulta restrito ao Sandbox. Falta uma leitura segregada da base financeira de produção. |
| Cobranças dinâmicas | Consulta, QR Code, estados e conciliação. | A cobrança nasce no banco e o worker usa a carteira registrada na operação. A rota produtiva, o pagador de produção e a conciliação real seguem pendentes. |
| Lotes de saída | Lista e detalhe de itens, andamento e resultados por Pix. | O lote usa regras e dados de Sandbox. Produção precisa de reserva de saldo por item, autorização do titular, recuperação parcial e limites próprios. |
| Aprovações extraordinárias | Consulta de solicitações financeiras e seus estados. | A autorização do titular continua sendo a regra. Falta integrar a fila de produção com os estados de autorização e validação de saque do Asaas. |
| Extrato global | Consolidação, busca e exportação. | O extrato financeiro está bloqueado em produção. Depende de conciliação dos registros Asaas com o razão do Slopay e trilha de exportações. |
| Saldos e posições | Lista de carteiras, valores e última atualização. | Saldo do provedor e saldo disponível de cada titular são conceitos distintos. Falta definir reserva, estornos, tarifas e conciliação antes de autorizar saídas. |
| Relatórios e fechamentos | Prévia por período, emissão, histórico e CSV. | As rotas atuais são de Sandbox. Falta fechar períodos com dados produtivos, tratar divergências e separar relatórios financeiros de cadastro. |
| Taxas e limites | Consulta e atualização de posições do provedor. | O retrato de tarifas do Sandbox não autoriza um saque real. A produção exige regras de tarifa, limites e permissões verificados pela carteira selecionada. |
| Regras de alçada | Resumo das regras vigentes de aprovação. | A decisão do titular em todas as faixas é a política adotada no Sandbox. A regra precisa ser aplicada ao fluxo produtivo antes de habilitar saques pela API. |
| Webhooks globais | Destinos, tentativas e filas interrompidas. | O superadmin recebe o domínio e estados de entrega. A configuração pertence ao titular. A produção precisará de monitoramento próprio para entrada do Asaas e saída do Slopay. |
| Equipe administrativa | Lista, detalhes, convite, suspensão e reativação. | Cadastro por convite, verificação de e-mail, MFA e trilha de auditoria. A entrega real depende da configuração do Resend. |
| Trilha de auditoria | Consulta paginada e detalhes com projeção de campos permitidos. | O evento de cadastro de carteira real aparece em Integrações em produção. Eventos operacionais do Sandbox ficam restritos ao ambiente de desenvolvimento. |
| Usuários credenciados | Consulta, suspensão, exclusão e encerramento operacional conforme vínculo. | Exclusão exige MFA e ausência de histórico protegido. Encerramento revoga o acesso. Falta certificar a política de retenção e tratamento dos saldos no ambiente produtivo. |
| Preferências | Preferências do superadmin persistidas por usuário. | As preferências são restritas ao próprio superadmin. Controles e rótulos de teste aparecem em desenvolvimento. |

## Cadastro de carteiras reais

O serviço produtivo usa `AMBIENTE=producao` e `NODE_ENV=production`. A migração `20261121110000_add_asaas_live_pool_registry` foi aplicada no Neon de produção com a identidade de migração. A API deve usar a credencial de banco de runtime que herda `gatepay_runtime`, com RLS ativo. O runtime tem INSERT e leitura de metadados. A aplicação valida esses privilégios antes da gravação.

Com `ASAAS_LIVE_ACCOUNT_REGISTRATION_ENABLED=true` e `INTEGRATIONS_CREDENTIAL_ENCRYPTION_KEY` de produção configurada, o cadastro aparece em **Superadmin → Contas bolsão → Contas**. Informe o nome, o `walletId` e a chave de produção criada no Asaas. A verificação usa `GET /v3/wallets/` e `GET /v3/myAccount/status/` no host de produção. A chave é cifrada, sem leitura na API, e o ID do pagador de teste fica fora do formulário. Desative a flag para interromper novos cadastros e manter a consulta às carteiras já registradas. [Autenticação do Asaas](https://docs.asaas.com/docs/autentica%C3%A7%C3%A3o-1) · [WalletId](https://docs.asaas.com/reference/recuperar-walletid) · [Situação cadastral](https://docs.asaas.com/reference/consultar-situacao-cadastral-da-conta)

O cadastro atesta que a carteira corresponde à credencial e que a conta tem aprovação geral no Asaas. Antes de ativar movimentações, confirme permissões, chaves Pix, limites, status operacional, restrição de IP, alertas e o mecanismo de validação de saques. [Preparação para produção](https://docs.asaas.com/docs/prepara%C3%A7%C3%A3o-para-produ%C3%A7%C3%A3o) · [Whitelist de IPs](https://docs.asaas.com/docs/whitelist-de-ips) · [Autorização de saques](https://docs.asaas.com/docs/mecanismo-para-validacao-de-saque-via-webhooks)

## Integrações do cliente

| Operação crítica | Primeira passagem | Segunda passagem e pendência |
| --- | --- | --- |
| Emitir, pausar e revogar chave de API | Sessão de titular, permissões por escopo, confirmação reforçada, hash da chave, vencimento e segredo exibido uma vez. | A criação depende de uma linha Asaas legada do titular. A chave atual tem prefixo de Sandbox e só é aceita em rotas de Sandbox. A configuração de produção precisa de escopo por titular e ambiente independente da carteira sorteada, rotas e prefixo próprios, testes de revogação e limites por cliente. |
| Rede e logs da API | Allowlist para IPv4 e IPv6, limite por chave e empresa e correlação das requisições. | Uso indevido recusado pela rede deixou de atualizar `lastUsedAt`. Ainda falta validar o IP confiável na cadeia Vercel, Render e Nest, usar Redis distribuído e medir a retenção e o custo dos logs em volume. |
| Criar, editar, verificar e girar o segredo de webhook | Configuração de titular com confirmação, HTTPS, desafio de propriedade do destino, segredo cifrado e evento de auditoria. | O transporte evita redirecionamentos e usa a resolução DNS validada. Foi incluída nova conferência de versão e titular antes de enviar o desafio. Falta desacoplar a configuração de produção do vínculo Asaas legado e adicionar testes de rotação e remoção para o novo escopo. |
| Entregar, repetir e reativar webhook | Eventos gravados no banco, assinatura HMAC, tentativas com lease, entrega sequencial e interrupção da fila em esgotamento. | O worker checa se o titular e o destino continuam aptos. O vínculo legado é chave estrangeira de eventos e destinos e o envelope assinado contém `sandbox`. Eventos de conta bolsão sem vínculo individual não entram nesse fluxo. Produção exige namespace próprio, retenção, reconciliação de entregas e teste de perda, duplicidade e retomada com receptor real de homologação. |
| Receber eventos do Asaas | Recepção autenticada por segredo da carteira, identificação de operação e persistência idempotente. | Recebimentos confirmados exigem consulta ao provedor e verificação de valor e identidade. Falta configurar callbacks de produção por carteira, validar origem e provar rejeição de eventos de outro ambiente ou carteira. [Recepção de eventos](https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook) |
| Cobrança Pix e estorno | O Slopay registra a cobrança antes de chamar o Asaas e vincula a carteira à operação durante as novas tentativas. | O QR Code dinâmico exige o `customer` da carteira que emite a cobrança. A operação real precisa definir o pagador e conferir pagamentos, estornos parciais, tarifas e divergências. [Cobrança Pix](https://docs.asaas.com/docs/cobrancas-via-pix) |
| Saque e lote | O Sandbox registra a intenção, revisão, autorização, tentativa, estado do provedor e conciliação local. | Roteamento compartilhado cadastrado atende entradas no Sandbox. Falta razão segregado, reserva atômica de saldo, liberação de reservas, idempotência por item, limites e webhook produtivo de validação. [Validação de saques](https://docs.asaas.com/docs/mecanismo-para-validacao-de-saque-via-webhooks) |

## Decisões antes da liberação financeira

1. Confirmar a modalidade contratada com o Asaas para receber e repassar valores de terceiros por carteiras do Slopay. A documentação oficial descreve contas BaaS e repasses via Split com requisitos próprios. A aprovação cadastral da conta que recebe a chave não confirma a modalidade de repasse. [Asaas BaaS](https://docs.asaas.com/docs/cria%C3%A7%C3%A3o-de-subcontas-baas) · [Split de pagamento](https://docs.asaas.com/docs/split-de-pagamentos)
2. Definir como identificar o pagador real por cobrança, o saldo disponível de cada titular, a cobertura em cada carteira e o tratamento de tarifas, estornos, reservas e repasses.
3. Definir os limites da primeira operação, responsáveis pela operação e pela pausa e ordem de habilitação por carteira. A decisão do titular para saques pela API permanece prevista.
4. Aplicar migrações com credenciais separadas do runtime, verificar Redis, domínio Resend, ingress, latência, restauração e alertas. Homologar a migração e a conexão entre Render e Neon antes do deploy. Inventariar a equipe de produção, revogar eventuais superadmins de demonstração e confirmar o acesso nominal com MFA. O histórico de testes mostrou um superadmin de teste na implantação, cuja situação atual não foi conferida.
5. Homologar a jornada autenticada em navegador e os callbacks HTTPS produtivos com carteiras controladas. Conferir o extrato Asaas com o razão do Slopay antes de disponibilizar a operação a clientes.

## Validação e limites da revisão

A revisão de código abrangeu as rotas, componentes principais e serviços das páginas do inventário. Os fluxos críticos foram conferidos pela lógica de negócio e pela autorização, persistência e recuperação. Os testes usam PostgreSQL descartável, o papel de runtime e um simulador das respostas do Asaas.

A prévia local do build de produção renderizou as 20 páginas do menu administrativo com HTTP 200 e a navegação presente, usando uma sessão fictícia e um backend HTTPS isolado. A amostra de acesso sem sessão redirecionou para o login, o titular recebeu 404 na administração e as rotas de Sandbox amostradas retornaram 404. As suítes de integração também verificaram a separação no Nest. A homologação contra os serviços publicados continua pendente.

Os builds de backend e frontend passaram. As suítes direcionadas cobriram RLS, autenticação, equipe, abertura de conta, usuários, empresas, dashboard, pendências, chaves, webhooks, recebimentos, saques, lotes e relatórios. A primeira execução conjunta encontrou dependência entre fixtures. As suítes afetadas passaram na reexecução em schemas isolados. Os testes verificaram a recusa por mudança de destino de webhook, carteira de produção inválida, aprovação pendente no Asaas, chave de teste na rota produtiva e leitura de credencial cifrada pelo runtime.

A migração foi aplicada no banco de desenvolvimento isolado e o backend local voltou a responder em `/ready`. A verificação da carteira usou respostas simuladas do Asaas. Nenhum cadastro externo, saque ou Pix real fez parte da validação.

### Navegação autenticada no Sandbox local

As 20 páginas do menu abriram no Chrome com a sessão de superadmin autenticada. O dashboard, as cobranças e o extrato exibiram dados do banco isolado. As páginas de lotes, aprovações e webhooks exibiram estados vazios. As listas de posição, limites e alçada consultam o vínculo legado e ficaram vazias nesse banco, que tem carteira no modelo de contas bolsão. Esses estados ainda precisam de uma posição consolidada no modelo produtivo.

No detalhe de um cadastro com análise já assumida pelo superadmin da sessão, apareceu **Aprovar cadastro**. Em **Contas bolsão**, a listagem e a aba de roteamento abriram com os controles esperados. Em **Equipe administrativa**, o modal **Criar membro** abriu com foco no e-mail e foi fechado pelo botão **Cancelar**. Nenhuma decisão, alteração de carteira ou envio de convite foi executado durante essa inspeção.

Em largura reduzida, o menu **Mais** apresentou os 20 destinos, indicou a página ativa e abriu **Segurança da conta** a partir do fim da lista. A descrição da biometria e seu botão foram conferidos em duas larguras de janela. As alterações passaram no build do frontend com `AMBIENTE=producao`. Os tempos de primeiro acesso durante a compilação do Next em desenvolvimento variaram e ficam fora das medições de produção.

### Migrações no Neon de produção

Em 22 de novembro de 2026, o Prisma aplicou as cinco migrações pendentes de contas bolsão, aprovação e atribuição de cadastros, convites administrativos e cadastro de carteiras reais. A conferência posterior encontrou 51 migrações aplicadas, sem pendências, falhas ou divergência de checksum.

O catálogo confirmou `ENABLE` e `FORCE ROW LEVEL SECURITY` em `asaas_live_pool_accounts`. A credencial de runtime tem INSERT sob política administrativa e leitura das colunas de listagem. O catálogo confirmou que essa credencial carece de privilégio para ler a chave cifrada, alterar ou apagar as carteiras. A consulta sem contexto administrativo retornou zero registros. O enum `APPROVED` e a política que habilita a abertura da conta após aprovação também estão presentes.

Após a migração, `/health` e `/ready` do backend responderam HTTP 200. A página de login também respondeu HTTP 200 após o redirecionamento. Os três testes locais do cliente de verificação de carteira Asaas passaram com respostas simuladas.

O deploy ativo do backend conferido no Render ainda apontava para `f1b3985`, versão anterior ao cadastro real de carteiras. A mudança no banco prepara a publicação da aplicação atualizada. A validação de uma carteira real com o Asaas, a jornada de cadastro de titular e a movimentação financeira ainda requerem homologação. [Serviço no Render](https://dashboard.render.com/web/srv-dbvipbe1egvs73addskg)
