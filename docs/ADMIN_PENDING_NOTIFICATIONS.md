# Fila de pendências e notificações administrativas

`/admin/pendencias` consulta o banco do Slopay no ambiente Sandbox. A fila contém somente estados que exigem uma próxima etapa identificável:

- **Cadastros:** titular com e-mail verificado e autenticador cadastrado, ainda sem vínculo Sandbox.
- **Revisões Pix:** cobrança em revisão ou saque em revisão/bloqueado.
- **Aprovações do titular:** saque aguardando autorização no acesso do titular. O superadmin acompanha sem substituir essa autorização.
- **Webhooks:** destino ativo cuja entrega está interrompida.

Cobranças abertas aguardando o pagador e saques em processamento normal não entram nessa fila. A ordenação prioriza revisões, aprovações e webhooks, seguida por idade e identificador. Filtros e paginação são executados no servidor. Uma pendência resolvida sai da fila, e uma consulta já aberta informa a mudança de estado.

## Central compartilhada

O cliente e o superadmin usam `NotificationCenter`, com o mesmo `NotificationBadge`, popover, foco e navegação por teclado. O adaptador do cliente preserva seu histórico de avisos Pix. O adaptador administrativo consulta um histórico persistente, paginado, com leitura independente por superadmin. Ler um aviso não resolve a pendência correspondente.

O histórico administrativo registra cadastros prontos ou atualizados, vinculações, cobranças criadas, recebimentos confirmados, estornos, revisões, saques registrados/pendentes/processados/falhos/cancelados e interrupção/retomada de filas de webhook. A migração importa resultados confirmados e pendências existentes. Não inventa eventos intermediários anteriores à instalação.

Os eventos administrativos são inseridos por triggers na mesma transação que altera o estado de origem. Um rollback também remove o aviso. Confirmações financeiras possuem chave de negócio única. As notificações contêm referência interna, estado e valor, sem chaves de API, destinos completos, tokens ou payloads do provedor.

## Atualização e reconexão

O navegador abre um único canal SSE em `/api/admin/live`, usando o cookie HttpOnly do BFF. O token não aparece na URL nem no JavaScript. O backend verifica a sessão canônica a cada leitura e envia snapshots após mudanças. A implementação consulta o banco a cada **3 segundos** enquanto a aba está visível. Uma confirmação aparece depois que a transação do gateway foi confirmada.

O canal dura no máximo 55 segundos e é reaberto com a credencial atual. Há limite de três conexões por sessão e 100 por instância. A aba oculta fecha o canal. Em indisponibilidade, a consulta HTTP é retomada a cada 15 segundos e a interface informa a reconexão. Leituras em segundo plano não renovam a inatividade da sessão. Revogação interrompe as emissões e dispara nova verificação de acesso.

O snapshot completo e a contagem de não lidas permitem recuperar a situação após desconexão sem depender de um contador de sequência alocado antes do commit. A leitura é armazenada por identificador, evitando que uma confirmação tardia seja marcada como lida por um cursor anterior. O botão de leitura em massa marca os eventos visíveis no snapshot transacional do servidor, sem marcar eventos confirmados depois dele.

O sino mostra o total de não lidas e o histórico paginado. Cada superadmin escolhe em `/admin/preferencias` quais categorias geram avisos flutuantes e o valor mínimo dos avisos Pix. Até dois toasts aparecem por atualização. O histórico, a contagem e a fila continuam recebendo todos os eventos. O navegador guarda apenas identificadores para deduplicar a apresentação. A preferência de movimento reduzido utiliza os mesmos tratamentos das primitivas compartilhadas.

## Isolamento e operação

As tabelas `admin_notifications` e `admin_notification_reads` usam RLS ativo e obrigatório. O runtime lê notificações somente com uma sessão administrativa ativa, MFA e versão de autenticação válidas. A gravação de leitura exige o identificador do próprio administrador. O runtime não pode inserir ou alterar eventos administrativos. A função de captura é uma trigger com identificadores de esquema qualificados, `search_path` fixo e execução pública revogada.

A view `admin_pending_items` usa `security_invoker` e verifica o mesmo escopo administrativo. Os endpoints não chamam o Asaas. A fila não fornece comandos para confirmar, aprovar ou reemitir operações financeiras.

Esta primeira versão atende ao Sandbox com poucos superadmins. Antes de ampliar o volume, medir o custo da contagem do histórico e das leituras periódicas e considerar distribuição de eventos entre instâncias, preservando o histórico persistente e a revalidação das sessões.

Referências usadas na implementação: [SSE no NestJS](https://docs.nestjs.com/techniques/server-sent-events), [protocolo SSE e reconexão](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) e [funções com privilégios controlados no PostgreSQL](https://www.postgresql.org/docs/current/sql-createfunction.html).
