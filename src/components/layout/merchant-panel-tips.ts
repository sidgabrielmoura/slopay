import type { PanelNotice } from "./panel-notice-strip";

const [firstTip, ...accountTips] = [
  "Veja seus recebimentos e saques na página Movimentações.",
  "Use o período do Início para comparar a atividade da conta.",
  "O ícone de olho no cabeçalho oculta os valores do painel.",
  "Em Movimentações, escolha Recebimentos Pix para ver as entradas.",
  "A aba Saídas Pix reúne os saques registrados na conta.",
  "Use os filtros do extrato para localizar uma operação por data ou situação.",
  "Abra uma movimentação para ver sua referência e situação atual.",
  "O saldo disponível indica quanto pode ser usado naquele momento.",
  "O saldo reservado reúne valores comprometidos em operações pendentes.",
  "Abra Indicadores para acompanhar a evolução dos recebimentos.",
  "Em Perfil, consulte o e-mail e o telefone cadastrados.",
  "Em Usuários, confira qual perfil de acesso está ativo para você.",
  "Abra Segurança para gerenciar o aplicativo autenticador da conta.",
  "Em Segurança, use Testar neste aparelho para conferir sua chave de acesso.",
  "Use Ajustes para escolher entre a densidade compacta e a confortável.",
  "Em Ajustes, ative a redução de movimentos para suavizar as animações.",
  "Em Ajuda, encontre os atalhos para segurança e consulta de operações.",
  "No celular, abra Mais para encontrar as outras páginas da conta.",
] as const;

const operationTips = [
  "Use Receber Pix para criar uma cobrança e gerar o QR Code.",
  "Compartilhe o Pix copia e cola quando o pagador preferir colar o código.",
  "Confira o valor antes de compartilhar o QR Code da cobrança.",
  "Acompanhe a confirmação do recebimento em Movimentações.",
  "Se o pagamento estiver em processamento, confira o status antes de emitir outra cobrança.",
  "Em Movimentações, abra Comprovantes para encontrar os Pix confirmados.",
  "No detalhe de um Pix elegível, use o botão de compartilhar comprovante.",
  "Use Exportar CSV em Movimentações para guardar os dados filtrados do extrato.",
  "Em Saque direto, selecione o tipo de chave Pix antes de informar o destino.",
  "Revise a chave Pix e o valor do saque antes de confirmar.",
  "Confira o total com a tarifa na revisão do saque.",
  "Autorize o saque com a chave de acesso ou o código do autenticador.",
  "Consulte a situação do saque em Saídas Pix antes de tentar novamente.",
  "Em Saques em lote, clique em Novo lote para montar várias transferências.",
  "Confira o total e os destinatários no passo Revisar do lote.",
  "Abra um lote enviado para acompanhar o status de cada transferência.",
  "Em Aprovações, revise os saques solicitados pela API.",
  "Em Aprovações, a aba Histórico mostra as decisões registradas.",
  "Em Aprovações, expanda Regras de aprovação para consultar como os saques são autorizados.",
  "Em Taxas e limites, confira as condições Pix aplicadas à sua conta.",
  "A franquia mensal cobre a tarifa do Slopay nos recebimentos elegíveis.",
  "Use Controle financeiro para acompanhar despesas por categoria.",
  "Categorize um saque para encontrá-lo depois no Controle financeiro.",
  "Em Controle financeiro, compare os gastos deste mês com os do mês anterior.",
  "Em Usuários, gerencie os acessos da equipe vinculada à sua conta.",
  "Abra Integrações e acesse Chaves de API para gerenciar o acesso do seu sistema.",
  "Ao criar uma chave de API, selecione as permissões que a integração precisa.",
  "Guarde a chave de API quando ela for exibida após a criação.",
  "Em Integrações, use Webhooks para configurar os eventos enviados ao seu sistema.",
  "Ao configurar um webhook, use Verificar destino para validar o endereço.",
  "Em Webhooks, use Ver entregas para acompanhar as tentativas de envio.",
  "Se uma fila de webhook parar, corrija o destino e use Reativar fila.",
] as const;

export const memberPanelTips: readonly [PanelNotice, ...PanelNotice[]] = [
  { id: "account-tip-0", message: firstTip },
  ...accountTips.map((message, index) => ({ id: `account-tip-${index + 1}`, message })),
];

export const merchantPanelTips: readonly [PanelNotice, ...PanelNotice[]] = [
  ...memberPanelTips,
  ...operationTips.map((message, index) => ({ id: `operation-tip-${index}`, message })),
];
