# Catálogo de microinterações do Slopay

Pesquisa de 12 de novembro de 2026. As aplicações no Slopay são propostas para avaliação por fluxo. O painel de operação prioriza leitura rápida, estabilidade dos valores e confirmação inequívoca de cada ação.

- **Transitions.dev** — 44 receitas oficiais, das quais 33 têm código público e 11 são Pro. O catálogo inclui os 35 exemplos públicos que o feed da comunidade retornou na data da pesquisa. [Receitas oficiais](https://transitions.dev/transitions/) · [Comunidade](https://transitions.dev/community.html)
- **React Bits** — 216 componentes do índice gratuito em cinco famílias. O catálogo irmão React Bits Pro tem 230 componentes criativos. A descrição dos itens Pro se baseia na documentação e nas prévias públicas. Os blocos de aplicação, marketing e templates têm uma visão por família. [Índice gratuito](https://reactbits.dev/get-started/index) · [Componentes Pro](https://pro.reactbits.dev/docs/components)
- **Taste Skill** — exemplos de UI, microinterações e efeitos publicados no repositório oficial, com referência à biblioteca de telas de aplicativo apresentada no site. A documentação do site descreve a 2.1.5, enquanto o repositório consultado está na 2.5.1. [Documentação](https://www.tasteskill.dev/docs) · [Versão 2.5.1](https://github.com/Leonxlnx/taste-skill/tree/v2.5.1)

[Consulta por fluxo](#consulta-por-fluxo) · [Como aplicar](#como-aplicar-no-frontend) · [Transitions.dev](#transitionsdev) · [React Bits](#react-bits) · [React Bits Pro](#react-bits-pro) · [Taste Skill](#taste-skill)

## Consulta por fluxo

| Tela ou evento | Padrão a considerar primeiro | Aplicação no Slopay |
| --- | --- | --- |
| Linha do extrato → detalhe de transação | **Modal open/close** ou **Panel reveal** | `Dialog` para leitura rápida no desktop e `Sheet` no mobile. Abrir a partir da linha, manter posição e filtros do extrato e devolver o foco à origem ao fechar. Preservar acesso direto ao detalhe por URL para compartilhamento interno ou recarga. |
| Saque Pix → revisão → autenticação → envio | **Stepper** + **Text states swap** | Manter destino, total e taxa legíveis durante revisão. A etapa avança após validação. Enquanto a requisição corre, manter o texto de processamento no botão e proteger contra envio repetido. O rótulo final reflete a resposta do gateway. |
| Receber Pix no dashboard → escolher valor → QR Code → pagamento | **Modal open/close**, **Number pop-in**, **Image generation placeholder** e **LoadingConfirmation** | Abrir o Dialog de recebimento e aplicar Number pop-in aos valores rápidos. Revelar o QR Code assim que a imagem retornada pelo gateway carregar. Mostrar o check ou o X quando houver um resultado confirmado. |
| Crédito, débito, estorno ou reserva | **Number subtle change** + realce local da movimentação | Exibir o saldo oficial no formato BRL, com dígitos tabulares. Sinalizar a variação confirmada com sinal, texto e um realce breve na linha ou no delta. Atualizações de saldo disponível, contábil e reservado mantêm seus rótulos próprios. |
| Primeira consulta de saldo, extrato ou indicadores | **Skeleton loader and reveal** | Manter dimensões próximas do conteúdo final. Ao chegar a resposta, tirar o pulso e cruzar a opacidade com os dados em uma passagem. Se o resultado for vazio ou erro, revelar o estado correspondente no mesmo espaço. |
| Atualização de dados já exibidos | **Text states swap** ou **Number subtle change** | Manter dados anteriores quando ainda forem válidos para a consulta em curso, sinalizar atualização e trocar o trecho alterado. Em troca de conta, filtro ou período, identificar claramente a consulta a que os dados pertencem. |
| Filtros, abas e intervalos do gráfico | **Tabs sliding**, **Glide Select** e **Chart card** | Mover só o indicador ativo e transicionar o conjunto de dados quando chegar. Manter eixo, unidade e legendas legíveis. O filtro escolhido responde imediatamente ao toque e ao teclado. |
| Aprovação, recusa e ações administrativas | **Modal open/close**, **Status Mark** e **Checkbox check** | Reaproveitar o diálogo de decisão, manter justificativa e resultado textual, e atualizar o status com ícone e texto. Uma aprovação registrada pode ainda depender de outras aprovações ou de processamento. |
| Lotes e importações | **Panel reveal**, **Stepper** e **fx-progress** | Mostrar validação, revisão e processamento como etapas distintas. Exibir fração ou progresso apenas se a fonte informar total e avanço. Oferecer seletor de arquivo quando houver drag and drop. |
| Busca, menus, ajuda e preferências | **Menu dropdown**, **Tooltip open/close**, **Accordion**, **Toggle** | Animar a partir do controle acionado. Usar foco, seleção e confirmação textual. Dar prioridade ao resultado da busca e ao estado salvo em preferências. |
| Privacidade e autenticação | **Icon swap** e **Code Slots** | Trocar o ícone do olho e aplicar a máscara de privacidade imediatamente. Em campos de verificação, enviar ao completar o código, conservar colagem e preenchimento automático quando suportado e indicar o foco na célula ativa. Exibir a rejeição ou o check conforme a resposta do gateway. |
| Erro, conexão intermitente ou tempo de espera | **OperationFailure**, **Text states swap** e **Toast open/close** | Exiba a falha da operação na tela em que ela foi solicitada. Para erros de preenchimento, use o Sonner e preserve o foco, a indicação de inválido e a descrição acessível. Quando o resultado financeiro estiver indefinido, preserve o acompanhamento e a ação de consulta. |
| Imagens, QR Codes, boletos e prévias | **Image generation placeholder** | Reserve a área da prévia e anime a luminosidade dos pontos enquanto o conteúdo carrega. Revele a imagem assim que estiver pronta, com opacidade e transição de nitidez. |

## Como aplicar no frontend

A implementação deve partir do estado do produto e da primitiva já existente. O repositório usa Next.js App Router, React, Tailwind v4, wrappers Radix e Sonner. `Dialog`, `AlertDialog`, `Sheet`, `DropdownMenu`, `Tabs`, `Switch`, `Tooltip` e `Skeleton` são pontos naturais para reutilizar. Há classes de entrada e saída em parte dos wrappers. Ao propor um ajuste, confira o CSS gerado e o comportamento no navegador do build usado para a tela. [Primitivas do Slopay](../src/components/ui/) · [Design do Slopay](../DESIGN.md)

A inspeção encontrou rotas de demonstração para cobrança, saque e lotes e rotas live específicas para o painel e a consulta de movimentações. No código live consultado, os campos de saldo da visão geral ainda chegam indisponíveis. A proposta de animação de saldo entra em uso quando essa tela tiver um valor oficial para renderizar. Verifique a variante ativa de cada rota antes de trabalhar no fluxo. [Configuração de rotas](../next.config.ts) · [Visão geral live](../src/features/overview/components/live-overview-screen.tsx) · [Consulta de movimentações live](../src/app/%28panel%29/%5B...section%5D/page.live.tsx)

### Detalhe e confirmação em modais

- Para consulta rápida, associe a linha a um acionador real e permita que o operador volte à mesma posição. O conteúdo principal pode entrar com opacidade e escala curta, enquanto o fundo escurece sem alterar o layout. Para revisão extensa, histórico ou comprovante imprimível, mantenha o detalhe em página própria e use o modal para a ação pontual.
- Em saque ou aprovação, apresente valor, destino e ação final de forma estável. Ao enviar, mantenha o foco dentro do diálogo e faça a troca de estado no botão ou no texto de status. Fechar a interface, quando o fluxo permitir, tem significado distinto de cancelar a operação. Preserve revisão, permissões, autenticação e idempotência do fluxo existente.
- Na abertura, mova o foco para o título ou para um controle apropriado ao conteúdo. Em confirmação sensível, priorize um foco inicial que evite disparo acidental. Preserve `Tab`, `Shift+Tab`, `Esc` e o retorno de foco. Em celular, confira altura do painel com o teclado aberto e visibilidade do botão de fechamento. [Padrão de diálogo modal do W3C](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

### Saldo e status de operações

- Use o saldo formatado a partir do valor oficial em centavos. Em primeira renderização, mostre o valor recebido inteiro. Em mudança confirmada, prefira realçar o delta ou a linha correspondente. Uma troca de opacidade em dígitos pode marcar a atualização se o valor canônico já estiver no DOM e o texto antigo for apenas uma camada decorativa, fora da árvore de acessibilidade. Use `tabular-nums` e evite rolar dígitos por valores intermediários.
- Diferencie **solicitação enviada**, **em processamento**, **aguardando aprovação**, **liquidada**, **recusada** e **estornada** conforme os estados realmente disponíveis na API. Um aceite de requisição é feedback de envio. O estado de liquidação vem do resultado de negócio.
- Use o disco verde com check ou o disco vermelho com X para resultados confirmados. Exiba a mensagem de falha dentro da tela ou do modal. Em consultas de histórico, mostre o símbolo estático. [LoadingConfirmation e OperationFailure](../src/components/ui/loading-indicator.tsx)
- Em refetch, deduplique a ênfase pelo identificador da operação ou pela mudança semântica do estado. Um filtro, troca de conta ou nova montagem da tela deve mostrar o total do contexto selecionado sem parecer uma nova entrada ou saída.
- Quando o modo privacidade estiver ativo, renderize só a versão mascarada nos elementos animados, na leitura assistiva e nos tooltips. Elimine a camada anterior no mesmo instante em que a máscara passa a valer. Tome `PanelAmount` como referência para evitar revelação antes da leitura das preferências. [Componente de privacidade](../src/components/layout/panel-privacy.tsx)

### Da espera ao conteúdo

- Na primeira carga, o skeleton acompanha a geometria do conteúdo esperado. Reserve espaço para números, linhas e ações para evitar que o clique seguinte caia em outro controle. Em resposta rápida, deixe a animação ser interrompida imediatamente pelos dados. Na volta do foco ou revalidação em segundo plano, prefira manter a última versão válida e sinalizar a atualização localmente.
- No crossfade, trate o skeleton como decorativo. Exponha o carregamento uma vez na região pertinente e retire `aria-busy` assim que o estado resolvido estiver disponível. A camada que sai deve ficar fora de foco, leitura e captura de cliques. Sem movimento, o estado final é imediato.
- Em imagens e códigos, use a grade de pontos verde-lima em fundo verde enquanto a busca ou a decodificação estiver em andamento. Preserve a área da prévia até a revelação, a margem branca dos QR Codes e a opção de tentar novamente quando houver erro. [ImageLoadingSurface](../src/components/ui/image-loading.tsx)
- O guia local de Next.js distingue fallback de segmento, `Suspense` e navegação. Consulte `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md` e `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md` se a proposta afetar rotas. O guia usa APIs de React 19.3. O `package.json` consultado declara React 19.2.8. Verifique a API disponível no build antes de propor `ViewTransition`. Para troca local de estado, opacidade e transformações CSS nas primitivas atuais são um ponto de partida.

### Ritmo, custo e verificação

- Como ponto de partida para protótipos, use cerca de **100–160 ms** para feedback de pressão e foco, **150–220 ms** para troca local de texto, ícone ou indicador e **180–260 ms** para entrada de modal ou painel. A saída pode ser ligeiramente mais curta. Em uso frequente, avalie pela capacidade de clicar, digitar e navegar durante a transição.
- Use movimento onde ele orienta, confirma uma ação ou explica mudança de estado. Distribua pequenos sinais entre controles e reserve a ênfase mais visível para o evento que pede atenção. Preferir `transform` e `opacity` reduz a chance de recalcular o layout. Restrinja blur a áreas pequenas, evite `transition: all` e mantenha WebGL, partículas e loops fora do painel de trabalho diário.
- Para animação por JS, respeite tanto `prefers-reduced-motion` quanto a preferência `reduceMotion` do Slopay. A classe `.reduce-motion` em `globals.css` cobre CSS. Springs, timers e canvas precisam reagir à preferência diretamente e parar ao desmontar ou perder visibilidade. [Preferências do Slopay](../src/providers/preferences-provider.tsx) · [Movimento reduzido no CSS](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)
- Teste em desktop e mobile, por toque e teclado, com movimento reduzido e privacidade ativados. Exercite carregamento rápido e lento, ausência de dados, erro, troca de filtros, fechamento durante carregamento e retorno por URL. Em fluxos financeiros, confirme que resultado pendente e resultado final continuam distinguíveis, que o leitor de tela anuncia a mudança relevante uma vez e que a resposta permanece visível sem esperar a animação.

## Como propor uma microinteração

Em toda mudança ou adição do frontend, comece pela [consulta por fluxo](#consulta-por-fluxo), procure pelo controle e pelo estado alterado nos catálogos e compare com a primitiva atual. Pergunte ao desenvolvedor sobre a melhor opção quando houver benefício concreto. Indique o disparo, o comportamento, a razão e o efeito da preferência de movimento reduzido. Se nenhuma proposta melhorar a operação, registre isso em uma frase.

> Na abertura de uma movimentação pelo extrato, faz sentido usar o padrão Modal open/close no Dialog atual? A entrada faria um fade curto e devolveria o foco à linha ao fechar. Com movimento reduzido, abriria imediatamente.

## Transitions.dev

As receitas são exemplos de CSS com estados, tokens de duração e easing e tratamento de movimento reduzido. A versão React encapsula o exemplo. Ao adaptar, mantenha o controle semântico da primitiva do Slopay e transplante a transição que interessa. Os 11 itens Pro abaixo têm descrição baseada na prévia pública. [Biblioteca](https://transitions.dev/transitions/) · [Documentação](https://transitions.dev/detail.html?doc=introduction) · [Termos](https://transitions.dev/terms.html)

### Receitas gratuitas

| Receita | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| [Card resize](https://transitions.dev/transitions/card-resize/) | Suaviza a mudança de dimensões entre dois estados do mesmo card. O contêiner transiciona a geometria, com os elementos internos acompanhando a troca. | Detalhe compacto de taxa, limite ou composição de total. Use em uma área pequena para limitar o recálculo de layout. |
| [Number pop-in](https://transitions.dev/detail.html?t=number-pop-in) | Sobrepõe os dígitos antigo e novo e combina deslocamento vertical e escala para sugerir um tambor. | Ações explícitas de adição ou seleção de valores monetários. Preserve o valor real, a digitação imediata, a máscara de privacidade e o estado estático em movimento reduzido. |
| [Notification badge](https://transitions.dev/transitions/notification-badge/) | A bolha numérica desliza na diagonal e cresce com um pequeno retorno elástico sobre o ícone. | Primeiro alerta ou nova aprovação pendente na topbar, com contagem e nome acessível atualizados no mesmo evento. |
| [Text states swap](https://transitions.dev/transitions/text-states-swap/) | Cruza dois rótulos no mesmo espaço com opacidade e desfoque breve. O estado seleciona qual rótulo fica visível. | Botão de envio, exportação ou salvamento. Reserve largura para os rótulos e anuncie o estado final uma vez. |
| [Menu dropdown](https://transitions.dev/transitions/menu-dropdown/) | Combina opacidade e escala partindo de uma origem configurável de acordo com a posição do gatilho. | Ações por linha, exportação e seletor do período. Use a origem de posicionamento do Radix. |
| [Modal open/close](https://transitions.dev/transitions/modal-open-close/) | O overlay escurece e a superfície entra com escala curta e opacidade. O estado fechado desativa a interação. | Detalhe rápido de movimentação, revisão de saque e confirmação de aprovação. O Dialog mantém foco, teclado e título. |
| [Panel reveal](https://transitions.dev/transitions/panel-reveal/) | Uma superfície entra deslocada e desfocada levemente, resolve em opacidade plena e sai em sentido inverso dentro de um recorte. | Sheet de movimentação, filtros no mobile ou detalhe de lote. Reduza o percurso e use opacidade sem blur em superfícies grandes. |
| [Page side-by-side](https://transitions.dev/transitions/page-side-by-side/) | Alterna painéis laterais com direção diferente para avançar e voltar. O painel atual recebe os eventos. | Etapas de revisão dentro do mesmo modal. Preserve cabeçalho, posição do foco e estado dos campos durante ida e volta. |
| [Icon swap](https://transitions.dev/transitions/icon-swap/) | Ícones no mesmo espaço encolhem e perdem nitidez enquanto o novo ganha escala e foco. | Copiar → copiado e olho aberto → fechado. Mantenha o nome do botão e aplique a máscara de valores imediatamente. |
| [Success check](https://transitions.dev/detail.html?t=success-check) | O contêiner entra com fade, rotação e pequeno deslocamento, seguido do desenho do traço do check. | Confirmações de ações importantes, como recebimento e saque concluído. Dispare uma vez no resultado confirmado e mostre o check estático em movimento reduzido. |
| [Avatar group hover](https://transitions.dev/transitions/avatar-group-hover/) | O avatar sob o cursor sobe mais que os vizinhos, e todos retornam com amortecimento. | Grupo de aprovadores em um detalhe, com nome acessível por foco. Evite mover avatars em listas densas. |
| [Error state shake](https://transitions.dev/transitions/error-state-shake/) | Um keyframe desloca horizontalmente o campo por uma sequência curta e a borda muda para o estado de erro. | Validação após envio de formulário. A mensagem, o foco e `aria-invalid` carregam o erro. Uma repetição por tentativa é suficiente. |
| [Input clear with dissolve](https://transitions.dev/transitions/input-clear-with-dissolve/) | O valor é limpo e uma camada temporária de palavras se dispersa enquanto desaparece. | Botão de limpar busca simples em área de ajuda. Em filtros operacionais, mantenha a limpeza instantânea e, se preciso, anime o ícone. |
| [Skeleton loader and reveal](https://transitions.dev/transitions/skeleton-loader-and-reveal/) | O esqueleto pulsa durante espera. Quando o estado muda, a camada de placeholder perde opacidade e o conteúdo entra no mesmo quadro. | Prioridade para saldo, extrato e detalhes. A mesma superfície comporta resultado, vazio e erro, com tamanho reservado. |
| [Texts reveal](https://transitions.dev/transitions/texts-reveal/) | Duas linhas entram de baixo para cima com opacidade e um intervalo pequeno entre elas. | Mensagem de conclusão de onboarding ou vazio inicial. Use uma entrada única e mantenha ações disponíveis. |
| [Tabs sliding](https://transitions.dev/transitions/tabs-sliding/) | Um indicador mede posição e largura da aba ativa e desliza até ela, enquanto rótulos mantêm posição. | Entradas e saídas, período ou área administrativa. Recalcule na responsividade e preserve semântica de abas e setas. |
| [Shimmer text](https://transitions.dev/transitions/shimmer-text/) | Uma faixa de gradiente recortada pela forma das letras se desloca sobre o texto base. | Demonstração de carregamento. No painel, rótulo legível e indicador localizado costumam bastar para uma espera longa. |
| [Tooltip open/close](https://transitions.dev/transitions/tooltip-open-close/) | O primeiro tooltip tem atraso de entrada, segue para gatilhos vizinhos e fecha rapidamente ao sair. | Ícones de cópia, privacidade e menu recolhido. Use foco, tooltip curto e saída ao abrir menus ou painéis. |
| [3D tilt](https://transitions.dev/transitions/3d-tilt/) | A posição do cursor alimenta ângulos X/Y em perspectiva e a posição do reflexo. | Mockup público de produto ou cartão ilustrativo. Mantenha cartões de saldo planos para leitura consistente. |
| [Dropdown menu morph](https://transitions.dev/transitions/dropdown-menu-morph/) | O acionador parece se expandir até a superfície de menu, com troca de ícone e revelação do conteúdo. | Ações rápidas Pix, se houver poucas opções. A transformação visual deve manter o foco e a geometria dos alvos previsíveis. |
| [Accordion](https://transitions.dev/transitions/accordion/) | A altura interpola entre `0fr` e `1fr` no grid e o chevron muda de orientação. | Taxas, regras de aprovação, detalhes técnicos de webhook e FAQ. Preserve cabeçalhos, estado expandido e leitura do conteúdo. |
| [Toast open/close](https://transitions.dev/transitions/toast-open-close/) | O toast sobe alguns pixels com opacidade, escala e blur que se resolve na entrada. | Cópia, exportação e salvamento de preferências via Sonner. Estados críticos persistem também na tela. |
| [Like button](https://transitions.dev/transitions/like-button/) | O coração muda preenchimento e escala. Partículas seguem trajetórias curtas ao marcar. | Favorito de documentação ou feedback opcional. Para favoritar um filtro, basta a mudança de ícone e rótulo. |
| [Learn more hover](https://transitions.dev/transitions/learn-more-hover/) | O chevron se desloca e seus dois braços giram para abrir o ângulo ao passar o cursor. | Link “Ver detalhes” ou “Como funciona”. Uma translação pequena em hover e foco mantém o alvo estável. |
| [Checkbox check](https://transitions.dev/transitions/checkbox-check/) | A marca de verificação aparece à medida que o deslocamento do traço SVG se reduz. | Seleção de linhas de um lote ou aceite explícito. Preserve a caixa nativa, o estado indeterminado e a área de toque. |
| [Spinning counter](https://transitions.dev/transitions/spinning-counter/) | Tiras individuais de dígitos percorrem posições numa representação de tambor até assentar no número alvo. | Contagem de métricas ilustrativas em material público. No extrato, exiba valores oficiais sem números intermediários. |
| [Number subtle change](https://transitions.dev/transitions/number-subtle-change/) | Mantém os dígitos iguais e sobrepõe apenas os que mudaram com um crossfade no mesmo alinhamento. | Atualização real de saldo ou contador, preservando texto canônico e tabularidade. Comece com destaque local no delta. |
| [Toggle](https://transitions.dev/transitions/toggle/) | O trilho muda de cor e o polegar desliza com leve ultrapassagem e retorno. | Preferências de densidade, movimento ou notificações. Use o Switch existente e responda ao estado salvo quando houver persistência remota. |
| [Thinking states](https://transitions.dev/transitions/thinking-states/) | Uma linha em espera recebe um brilho e é trocada por outra com opacidade e deslocamento curto. | Etapas verdadeiras de validação de lote. Se só houver estado indeterminado, mantenha um rótulo estável. |
| [Reasoning stream](https://transitions.dev/transitions/reasoning-stream/) | Uma janela curta mostra linhas de um texto em rolagem vertical e recicla a posição para manter continuidade. | Inspiração para log de integração. Em produção, fixe a posição escolhida pelo operador e ofereça histórico legível. |
| [Streaming text](https://transitions.dev/transitions/streaming-text/) | Cada palavra recebida entra em um span e passa de difusa para nítida, com opacidade crescente. | Texto secundário que chega progressivamente em uma futura central de suporte. Para eventos Pix, atualize rótulos inteiros e preserve datas e valores legíveis. |
| [Matrix dot loader](https://transitions.dev/transitions/matrix-dot-loader/) | Uma matriz de 16 células muda luminosidade em padrões temporizados. | Loader de uma ferramenta de teste de webhook, acompanhado de texto. Use um spinner simples no envio financeiro. |
| [Banner stacking](https://transitions.dev/transitions/banner-stacking/) | Banners sobrepostos ganham posição e escala por nível, com até três visíveis na prévia. | Avisos não críticos do painel. Um incidente que exige ação precisa de mensagem própria persistente e legível. |

### Receitas Pro

| Receita | O que faz e como se apresenta | Encaixe no Slopay |
| --- | --- | --- |
| [Confetti burst](https://transitions.dev/transitions/confetti-burst/) | Fragmentos saltam e caem com gravidade simulada sobre a área do botão. | Marco único de onboarding ou ambiente demo. Para Pix recorrente, o check com status dá o sinal necessário. |
| [Gooey plus menu](https://transitions.dev/transitions/gooey-plus-menu/) | O botão se divide em bolhas que parecem conectadas enquanto as ações se abrem em leque. | Inspiração para agrupar atalhos Pix. Um sheet com rótulos e alvos fixos é mais previsível em toque. |
| [Card stack hover](https://transitions.dev/transitions/card-stack-hover/) | Cartões se afastam em leque e retornam a uma pilha com movimento de mola. | Tour de tipos de comprovante ou modelos de cobrança. Para navegar entre contas operacionais, exponha nomes e status na lista. |
| [Organic shimmer](https://transitions.dev/transitions/organic-shimmer/) | Uma ondulação luminosa percorre o texto e sincroniza a borda brilhante. | Peça promocional isolada. Um pulso de baixa amplitude resolve o skeleton funcional. |
| [Drag & drop with physics](https://transitions.dev/transitions/drag-drop-with-physics/) | A região de drop deforma e se transforma na prévia do arquivo quando recebe a imagem. | Upload de documentos ou arquivo de lote. Aproveite a confirmação visual do drop com seletor de arquivo e validação explícita. |
| [Image open tilt](https://transitions.dev/transitions/image-open-tilt/) | A miniatura amplia até o foco, inclinando e curvando no percurso. | Prévia de anexo em fluxo administrativo, com alternativa em página. Para comprovante, prefira zoom plano e texto selecionável. |
| [Spinner to check morph](https://transitions.dev/transitions/spinner-to-check-morph/) | O anel de espera cede a uma marca desenhada, com um pequeno salto entre as formas. | Envio confirmado ou exportação terminada. Uma resposta ainda pendente mantém indicador e texto de espera. |
| [Pro gradient text](https://transitions.dev/transitions/pro-gradient-text/) | Campos de cor circulam continuamente dentro da máscara do texto. | Título institucional isolado, onde contraste e pausa possam ser avaliados. |
| [Delete with smoky dissolve](https://transitions.dev/transitions/delete-with-smoky-dissolve/) | A superfície se fragmenta em pedaços que caem e se dissipam como fumaça. | Demonstração de remoção de mídia. Na lista de rascunhos, uma saída curta e feedback textual preservam a rastreabilidade. |
| [Image generation placeholder](https://transitions.dev/transitions/image-generation-placeholder/) | Pontos fixos na grade variam de luminosidade e desaparecem quando a imagem ganha opacidade e nitidez. | Padrão de carregamento para imagens, QR Codes e prévias de boletos. A animação dos pontos para ao resolver a espera ou quando a prévia sai da área visível. |
| [Get Pro button](https://transitions.dev/transitions/get-pro-button/) | Luz percorre a borda arredondada de um CTA e se espalha para dentro. | CTA em campanha pública. Botões operacionais seguem os tokens de ação e foco do Slopay. |

### Comunidade do Transitions.dev

O feed abaixo é um retrato da data da pesquisa. Os exemplos combinam transições e simulam estados em HTML ou React. Ao avaliar um reaproveitamento, identifique qual parte da interação serve ao fluxo e preserve o comportamento da primitiva local. [Feed público](https://transitions.dev/community.html) · [Termos da comunidade](https://transitions.dev/terms.html)

| Exemplo | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| [Voice Assistant Card](https://transitions.dev/studio.html?id=c85AR0dBjUE) | Toca uma fala de demonstração, acende um halo e revela a transcrição palavra por palavra. | Tour de suporte com mídia escolhida pelo usuário e transcrição estática disponível. |
| [Weather Day Switcher](https://transitions.dev/studio.html?id=cWqA5gXWQV9) | Alterna fundo, ícone e leitura de temperatura conforme o dia escolhido. | Referência para trocar período no resumo, preservando a cor semântica e a posição das métricas. |
| [Menu with nested items](https://transitions.dev/studio.html?id=cpue1TSUPYk) | Abre um submenu a partir de uma pílula. As ações respondem com redução curta de escala ao pressionar. | Menu de exportação por formato ou ações de auditoria, usando o submenu Radix por teclado. |
| [Snapshot Toolbar](https://transitions.dev/studio.html?id=clE2LSYT73E) | Move a seleção entre modos e troca o ícone do botão de captura ao terminar. | Filtros de exportação e confirmação de relatório pronto. |
| [Heart Rate Monitor](https://transitions.dev/studio.html?id=cVTc0tzBZFA) | Um traço percorre a grade enquanto a leitura numérica muda, com seletor de janela. | Inspiração para série temporal de monitoramento, limitada a dados recebidos e com pausa para inspeção. |
| [Modal open/close remix · controle de minutos](https://transitions.dev/studio.html?id=cgvh8MT21xC) | Um slider encaixa em marcas inteiras e atualiza o valor e a legenda durante o arraste. | Intervalo de preferências, com entrada por teclado. Valores em dinheiro exigem precisão de campo numérico. |
| [Modal open/close remix · barra de abas](https://transitions.dev/studio.html?id=cGUSHARGII1) | A seleção se desloca entre abas compactas com ícone e badge. | Filtros de status em poucos grupos, usando texto para todos os estados. |
| [Event Card With Attendees](https://transitions.dev/studio.html?id=cmLi4qErLAI) | O card expande a seção de participantes e troca o botão pela indicação de recusa. | Detalhe de aprovação com lista de aprovadores e resultado textual da decisão. |
| [Manage Subscription](https://transitions.dev/studio.html?id=cQRk44W3xEC) | Abas e slides alternam planos, com preço e botão sincronizados. | Comparação de configurações ou tarifas com troca local e valor final estável. |
| [Chart card](https://transitions.dev/studio.html?id=cCzBMDEJl4z) | Segmentos empilhados mudam de tamanho com o período, e cada segmento expõe tooltip. | Indicadores de Pix com séries de entradas e saídas diferenciadas e legenda acessível. |
| [Music Player Likes](https://transitions.dev/studio.html?id=cVCedgYdNu4) | Faz a intensidade do gradiente variar conforme o contraste da capa. | Inspiração para mídia em ajuda. No painel, use tokens semânticos com contraste previsível. |
| [Calendar Day Card](https://transitions.dev/studio.html?id=cBgEMqiasX7) | Uma pílula marca o dia, a agenda desliza e os dados do cabeçalho se cruzam em opacidade. | Filtro diário em relatórios, com datas e resultados mantidos no mesmo contexto. |
| [Wallet Card Stack](https://transitions.dev/studio.html?id=cq1oWxLHR7D) | Eleva a conta escolhida dentro da pilha e revela detalhes quando o cartão é acionado. | Referência para hierarquia de contas. Adote seleção explícita e valores fixos no painel. |
| [Spinning counter remix](https://transitions.dev/studio.html?id=cP51cxEo6qO) | A ação de copiar envia o código do exemplo à área de transferência com fallback. | “Copiar Pix” ou referência de operação, com status de sucesso somente após a cópia. |
| [Voice Assistant Card remix](https://transitions.dev/studio.html?id=cNA2R8qhCZT) | Troca a ação de voz por envio, recebe anexo e desliza para uma lista de conversas. | Referência para eventual suporte conversacional. Voz e upload dependem do fluxo e das permissões existentes. |
| [Fieldnotes notification settings](https://transitions.dev/studio.html?id=cvPZ7FLNt56) | Move a pílula entre opções rotuladas de frequência em um diálogo. | Preferências de notificação ou relatórios, com salvamento e erro visíveis. |
| [iMessage Style Chat](https://transitions.dev/studio.html?id=cXZrcpjb3t3) | Encadeia entrada da mensagem, mudança de entrega, espera e resposta simulada. | Referência para feedback em etapas numa central de suporte. Cada rótulo acompanha o evento correspondente. |
| [Crypto Candle Chart](https://transitions.dev/studio.html?id=cZuiBEY7Ogh) | Interpola velas entre períodos, atualiza legenda e mostra o ponto inspecionado ao mover sobre o gráfico. | Compare a coordenação de gráfico e legenda para relatórios. O tipo de gráfico deve corresponder às métricas Pix. |
| [Liquid Glass Sheet](https://transitions.dev/studio.html?id=cj30wWb1EZY) | Prepara refração antes da primeira pintura e desloca uma seta de link no hover. | Aproveite a entrada sem lampejo e o deslocamento curto da seta. O Sheet operacional usa superfície opaca. |
| [Balance Bar Chart Card](https://transitions.dev/studio.html?id=cQVTcEB6aYs) | O seletor desliza e as barras redimensionam com a troca de período. A variação textual muda no mesmo quadro. | Inspiração para gráfico de fluxo de caixa, com saldo textual exato e eixos estáveis. |
| [Payment confetti](https://transitions.dev/studio.html?id=cC2JYkA5hFj) | Mostra spinner, troca o rótulo do envio e celebra com partículas no botão. | Aproveite a sequência de rótulos para um envio real. Reserve partículas para uma demonstração. |
| [Boarding Pass Check-in](https://transitions.dev/studio.html?id=cDdoG5wy3Y5) | Muda horário e status e transforma um botão de check-in de espera em confirmação. | Status e ação de um lote em linha, com o estágio real do processamento. |
| [Day Trading Order Ticket](https://transitions.dev/studio.html?id=crvsO6crvRu) | A opção de tipo controla rótulo, presença de campo e cálculo do resumo. | Campo condicional de cobrança ou chave Pix, mantendo dados válidos e foco no controle que mudou. |
| [Notification badge bell ring](https://transitions.dev/studio.html?id=c255dRhbki0) | O sino balança com som e exibe a bolha numérica, que desaparece ao limpar. | Aproveite só a entrada breve do badge para novas pendências. Um som exigiria preferência deliberada. |
| [Asset Review Panel](https://transitions.dev/studio.html?id=c30DaHEBqYH) | Sincroniza etapa, barra e rótulo e expande áreas de comentário, versão e informação. | Revisão de lote ou abertura de conta no admin, com estados, histórico e justificativas. |
| [Prediction card](https://transitions.dev/studio.html?id=cdZIYUiRdD7) | Combina gráfico, controle binário e duas páginas alternadas por abas. | Referência estrutural para resumo e detalhe de indicadores, usando séries do domínio financeiro do gateway. |
| [Upload modal](https://transitions.dev/studio.html?id=cJ4qF6fWxm1) | Abre o diálogo em escala e troca barra, ícone e texto na conclusão simulada. | Upload de documentação e lotes, separando transferência do arquivo e validação concluída. |
| [Authorize Access Card](https://transitions.dev/studio.html?id=cPEIgvgTOB6) | Mostra um pedido compacto de autorização com identificação do aplicativo e lista de permissões. | Revisão de permissões de usuário ou integração. Os escopos visíveis vêm da configuração real. |
| [Profile Card With Details](https://transitions.dev/studio.html?id=c0vbPYWvDUa) | Alterna botão e contador, com um acordeão para revelar dados secundários. | Perfil de operador ou equipe, com o acordeão restrito a detalhes adicionais. |
| [Midnight Glass Player](https://transitions.dev/studio.html?id=c9yQBRhc5g1) | Troca ícones e metadados mantendo tamanho do controle e oferece busca na linha de tempo. | Referência de ícone em espaço fixo para botões. O player serve a uma eventual página de tutoriais. |
| [Tilt photo gallery](https://transitions.dev/studio.html?id=cPxJM9trGHP) | Fecha a imagem já na rotação da miniatura, evitando um salto ao terminar. | Prévia de documento ou anexo com retorno alinhado à miniatura, preferindo uma versão plana no painel. |
| [Glass dock](https://transitions.dev/studio.html?id=cKeAhJBpqsl) | Um dock varia refração, transparência e saturação por sliders e eleva o ícone sob hover. | Experimento de apresentação. No painel, adote só a ideia de indicador local da navegação. |
| [Modal open/close remix · Emoji Skeleton Reveal](https://transitions.dev/studio.html?id=cWdOretSXnf) | Usa esqueletos no lugar de uma grade de símbolos e revela cada item dentro da célula reservada. | Referência para revelar uma lista curta mantendo sua geometria. Para o extrato, prefira um fade do conjunto. |
| [Metrix.Bar 指标插件](https://transitions.dev/studio.html?id=cwBXsRGCbR2) | Mantém a leitura principal junto do identificador enquanto as abas mudam, com um indicador de atualização ao lado. | Preservar referência e status do resumo ao trocar abas de detalhe. Modo privacidade se aplica a toda leitura monetária. |
| [Shimmer placeholder text](https://transitions.dev/studio.html?id=c1OfPxMYi66) | Move uma faixa cinza suave por uma linha curta de espera. | Inspiração para placeholder de uma linha, interrompido assim que a resposta chega. |

O **Builder** compõe ou remixa demos a partir de um prompt ou imagem. A **Motion Skill** orienta o uso dos tokens e das receitas. O **Motion Agent** inspeciona padrões de movimento no código e apresenta propostas de correção. O **MCP** oferece acesso às receitas no fluxo do agente. Todos servem como referência para propostas específicas do repositório. [Builder](https://transitions.dev/builder.html) · [Motion Skill](https://transitions.dev/skill.html) · [Motion Agent](https://transitions.dev/agent.html) · [MCP](https://transitions.dev/mcp.html)

## React Bits

### Microinterações gratuitas

O catálogo gratuito entrega código-fonte em JavaScript ou TypeScript, com CSS ou Tailwind. O registro permite conferir a variante e suas dependências por item. Algumas versões usam Motion, GSAP, WebGL ou bibliotecas de ícones. Confira a implementação e a licença antes de incorporar código. As demonstrações servem como referência mesmo quando a primitiva do Slopay já oferece o comportamento necessário. [Instalação](https://reactbits.dev/get-started/installation) · [Registro](https://reactbits.dev/r/registry.json) · [Licença MIT + Commons Clause](https://github.com/DavidHDev/react-bits/blob/9d9c687dc4f55b23539aa5417b703078047efa74/LICENSE.md)

| Componente | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| [Shredder](https://reactbits.dev/micro/shredder) | Transforma a exclusão em um gesto de arrastar. A linha cai na abertura e sai em tiras animadas. | Demo de remoção de rascunho descartável. Movimentações e auditoria precisam de ações explícitas e histórico preservado. |
| [Paper Crumple](https://reactbits.dev/micro/paper-crumple) | Deforma uma imagem em malha 3D durante o arraste, formando vincos de papel. Usa Three.js. | Interação editorial com mídia ilustrativa. Mantenha anexos e comprovantes legíveis em um visualizador convencional. |
| [Tear Ticket](https://reactbits.dev/micro/tear-ticket) | O arraste separa a parte destacável do tíquete, que cai após cruzar a perfuração. A resposta usa Motion. | Tour de comprovante fictício. Em fluxo real, use um botão rotulado para baixar, imprimir ou cancelar conforme a operação. |
| [Flip Card](https://reactbits.dev/micro/flip-card) | Alterna frente e verso com perspectiva e mola depois de clique, arraste ou impulso. | Demo de credencial ou cartão explicativo. Exponha informações essenciais de operação sem depender de virar o card. |
| [Branched Menu](https://reactbits.dev/micro/branched-menu) | Abre seções recolhíveis e estende um traço pelo ramo ativo da hierarquia. | Menu lateral de conta ou administração. Preserve a navegação atual e use o traço só como reforço da seleção. |
| [Folder Float](https://reactbits.dev/micro/folder-float) | Abre uma pasta e solta pequenos cartões que se acomodam por simulação física. | Apresentação de organização de documentos. Para anexos de cadastro, prefira lista e detalhe com navegação direta. |
| [Refine Frame](https://reactbits.dev/micro/refine-frame) | Troca etapas visuais de uma mídia dentro de um quadro com proporção constante. | Prévia de anexo de cadastro ou comprovante. Exiba os estados vindos do processamento real e trate indisponibilidade. |
| [Thought Line](https://reactbits.dev/micro/thought-line) | Mostra passos e tempo decorrido e recolhe a sequência em uma linha quando termina. | Resumo de validação ou reconciliação de lote, com histórico expandível e tempo real em vez de progresso inventado. |
| [Voice Pill](https://reactbits.dev/micro/voice-pill) | O botão de microfone se expande numa cápsula com barras de áudio e cronômetro durante a gravação. | Suporte por voz se esse recurso existir. Mantenha permissão deliberada, estado de gravação e alternativa em texto. |
| [Slosh Gauge](https://reactbits.dev/micro/slosh-gauge) | Uma superfície líquida persegue a leitura, inclina quando varia e reage ao chegar cheia. | Demo de utilização de capacidade. Para limite Pix, use barra estável e mostre usado, total e unidade. |
| [Prompt Bar](https://reactbits.dev/micro/prompt-bar) | Combina compositor, referências por @, comandos por /, menu de modelo e anexos, com transições entre controles. | Referência para busca avançada ou futuro suporte. No comando global atual, preserve consulta por texto e navegação por teclado. |
| [Swipe Toast](https://reactbits.dev/micro/swipe-toast) | Aceita arraste vertical para dispensar e representa o tempo restante com uma linha que encurta. | Feedback descartável de cópia ou salvamento no Sonner. Inclua fechar por botão e mantenha alertas críticos persistentes. |
| [Sling Button](https://reactbits.dev/micro/sling-button) | O usuário puxa o botão e a mola o lança ao soltar, como um estilingue. | Demo lúdica de envio de mensagem. Uma transferência Pix usa confirmação legível por clique, toque ou teclado. |
| [Bell Toggle](https://reactbits.dev/micro/bell-toggle) | Ao alternar, a cápsula redimensiona, o sino balança e o rótulo troca em fade. | Preferência de alertas. Use o estado salvo como fonte do rótulo e limite o balanço a uma passagem. |
| [Call Chip](https://reactbits.dev/micro/call-chip) | O preenchimento atravessa o chip enquanto um cronômetro avança, terminando com cor de sucesso ou shake de falha. | Teste de webhook ou consulta ao provedor. Mostre tempo decorrido e texto de resultado mesmo sem animação. |
| [Status Mark](https://reactbits.dev/micro/status-mark) | Um SVG muda de anel ocioso para arco e depois check, com caminhos interpolados e transição de estados. | Badge de cobrança, saque, exportação ou lote. Mapeie cada ícone ao status de negócio e acompanhe com texto. |
| [Glide Select](https://reactbits.dev/micro/glide-select) | O menu cresce da quina do chip e um destaque se move entre opções na abertura ou navegação. | Padrão aprovado para todos os campos de seleção. Use o [GlideSelect compartilhado](../src/components/ui/glide-select.tsx), com o JS-CSS oficial, mantendo cores, ícones, foco, setas e seleção. O [adaptador Select](../src/components/ui/select.tsx) já encaminha os usos existentes ao mesmo componente. [Origem e integração](GLIDE_SELECT.md). |
| [Swipe Row](https://reactbits.dev/micro/swipe-row) | Um gesto lateral abre ações atrás da linha. Na demo, um arraste completo pode apagar a entrada. | Ação secundária e reversível em notificações, com botão equivalente. Em transações, revele ações sem disparar operação no fim do gesto. |
| [Jelly Radio](https://reactbits.dev/micro/jelly-radio) | A opção ativa se expande e empurra as vizinhas com uma mola. | Grupo de densidade ou frequência. Mantenha largura das opções fixa e use só uma transição suave na seleção. |
| [Comet Dial](https://reactbits.dev/micro/comet-dial) | Converte posição angular em valor e deixa um rastro que acompanha o arco percorrido. | Experimento com parâmetro visual. Para valores, tempo e limites do painel, um input rotulado facilita ajustes precisos. |
| [Wake Slider](https://reactbits.dev/micro/wake-slider) | A sequência de barras representa o intervalo. A velocidade do gesto cria uma onda que decai atrás da posição selecionada. | Ajuste visual de preferência não financeira, com campo ou setas para precisão. |
| [Code Slots](https://reactbits.dev/micro/code-slots) | Um campo recebe o código e espelha a entrada em células com mola. Na rejeição, as células esvaziam da última para a primeira. Na confirmação, elas se unem e exibem o check. | Use o [componente do Slopay](../src/features/auth/components/code-slots.tsx) nos campos de verificação de e-mail, autenticador e recuperação. Valide ao completar o código e preserve teclado, colagem, foco e movimento reduzido. |
| [Dodge Field](https://reactbits.dev/micro/dodge-field) | Desloca elementos para longe do cursor e os traz de volta quando a atração para. | Demo de interação. Em formulários do gateway, o alvo precisa permanecer ao alcance. |
| [Lattice Loader](https://reactbits.dev/micro/lattice-loader) | Uma grade de células acende em sequência junto a um relógio. | Consulta ou validação indeterminada, com texto acessível e opção estática sob movimento reduzido. |
| [Scrub Field](https://reactbits.dev/micro/scrub-field) | Converte arraste horizontal em ajuste numérico e permite digitar com clique. Usa resistência ao chegar ao limite. | Ajuste opcional de uma faixa em filtros. Campos financeiros mantêm entrada direta como método principal. |
| [Fuse Button](https://reactbits.dev/micro/fuse-button) | Depois da ação, oferece desfazer dentro de uma janela ilustrada por um traço que diminui. | Descartar filtro salvo, se o produto suportar reversão real. O estado de Pix vem do gateway. |
| [Warm Tooltip](https://reactbits.dev/micro/warm-tooltip) | A primeira dica espera. As próximas dentro do grupo compartilham um intervalo de ativação e abrem sem novo atraso. | Barra de ações do extrato ou sidebar recolhida. Use o provider de Tooltip compartilhado e permita abrir por foco. |
| [Slide Commit](https://reactbits.dev/micro/slide-commit) | Arrastar até o limiar dispara a ação, mostra espera e transforma a trilha em cápsula de resultado. | Demonstração de ação reversível. Para confirmar saque, use o botão atual e aproveite apenas a troca de status. |
| [Rubber Segment](https://reactbits.dev/micro/rubber-segment) | O indicador alonga entre segmentos e se acomoda na opção ativa. Usa Motion para a interpolação. | Filtros Entradas/Saídas/Todas ou período. Reduza a deformação e preserve o texto e o tamanho dos alvos. |
| [Pulse Heart](https://reactbits.dev/micro/pulse-heart) | O coração encolhe, muda cor e retorna com pulso enquanto o contador é atualizado. | Favoritos de ajuda ou modelos. Use feedback mais discreto em listas operacionais de uso contínuo. |
| [Spring Check](https://reactbits.dev/micro/spring-check) | Uma mola coordena preenchimento, desenho do check e risco no rótulo. | Checklist de documentos ou seleção em lote. Em linhas selecionadas, mantenha o rótulo sem risco e preserve seleção parcial. |
| [Peek Rating](https://reactbits.dev/micro/peek-rating) | As estrelas próximas do ponteiro sobem em onda e a escolhida responde ao clique com escala. | Pesquisa opcional após atendimento. Ofereça escolha por teclado e valores rotulados. |
| [Hold Button](https://reactbits.dev/micro/hold-button) | A área de preenchimento cresce enquanto há pressão. Soltar antes do limiar reinicia. | Demo de confirmação deliberada. Em ação administrativa reversível, use apenas com uma alternativa simples de teclado e texto. |
| [Squish Switch](https://reactbits.dev/micro/squish-switch) | A velocidade do movimento estica o polegar durante a troca e o comprime na chegada. | Referência de feedback tátil para o Switch de preferências. Um deslocamento leve com extremos fixos costuma ser suficiente. |

### Componentes gratuitos de interface

| Componente | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| [Holo Card](https://reactbits.dev/components/holo-card) | Simula um cartão colecionável com foil, relevo e brilho que muda conforme o ângulo. | Mockup público de produto. Para saldo e extrato, textura e glitter tiram contraste dos números. |
| [Circular Carousel](https://reactbits.dev/components/circular-carousel) | Organiza imagens em um anel 3D, dobra os cartões e encaixa a seleção após o arraste com inércia. | Vitrine de casos ou tour público com navegação alternativa. Em operações, lista e filtros permitem comparação direta. |
| [Flex Carousel](https://reactbits.dev/components/flex-carousel) | Mantém uma fileira infinita de imagens e aplica refração nas bordas com OGL. | Galeria de marca ou parceiros em página pública. O quadro de transações requer ordem estável e acesso direto. |
| [Infinite Spiral](https://reactbits.dev/components/infinite-spiral) | Distribui imagens numa hélice 3D que se repete, com espaçamento e perspectiva configuráveis. | Apresentação de mídia em campanha. A sequência exige esforço para localizar um registro específico. |
| [Depth Carousel](https://reactbits.dev/components/depth-carousel) | Move cartões num trilho que recua em perspectiva e oferece arraste, setas e avanço automático. | Tour de funcionalidades em ajuda, com pausa e controle manual. Reserve o fluxo de cadastro para etapas explícitas. |
| [Morph Slider](https://reactbits.dev/components/morph-slider) | Interpola imagens por um mapa de deslocamento em WebGL com OGL e GSAP. | Comparação visual de campanhas ou screenshots fictícios. Comprovantes precisam permanecer nítidos durante a troca. |
| [Drift Wall](https://reactbits.dev/components/drift-wall) | Uma parede de peças se desloca continuamente em perspectiva e a peça sob o ponteiro levanta. | Vitrine institucional de casos, com fotos e fallback estático. Evite em relatórios operacionais. |
| [Accordion Gallery](https://reactbits.dev/components/accordion-gallery) | Abre a área do item por hover ou foco e revela foto, legenda e parallax. | Seleção de tutoriais. Em dados cadastrais, adapte a expansão por clique e mantenha títulos sempre visíveis. |
| [Specular Button](https://reactbits.dev/components/specular-button) | Um reflexo se desloca até o cursor na borda de um botão com aparência vítrea. | CTA público isolado. Use a resposta de pressão sem vidro ou reflexo nas ações Pix. |
| [Option Wheel](https://reactbits.dev/components/option-wheel) | Distribui opções num arco. Rolagem, arraste e setas fazem a seleção girar. | Seletor experimental de poucas opções em tour. Para período ou conta no gateway, o Select facilita busca e leitura. |
| [Curved Input](https://reactbits.dev/components/curved-input) | Curva o trilho do campo, o texto, o cursor e o botão para seguir o arco. | Peça editorial de busca. Na busca por referência, mantenha texto reto, cursor nativo e seleção previsível. |
| [Line Sidebar](https://reactbits.dev/components/line-sidebar) | Mede a distância do ponteiro a cada link e aproxima ou realça os vizinhos, com linha do ativo. | Sidebar do painel. Aproveite a linha da rota atual e deixe rótulos e alvos estáveis no hover. |
| [Animated List](https://reactbits.dev/components/animated-list) | Linhas entram com mola e um indicador percorre opções. O exemplo usa listbox com seleção e setas. | Busca global e seletores de conta, com animação curta dos itens novos. O extrato mantém semântica de tabela e identidade por registro. |
| [Scroll Stack](https://reactbits.dev/components/scroll-stack) | Usa a rolagem para prender, sobrepor e reduzir a ênfase de cartões antigos numa pilha. | Tutorial público de etapas. Para fila de aprovação, mantenha todos os registros acessíveis na ordem definida. |
| [Bubble Menu](https://reactbits.dev/components/bubble-menu) | Abre um menu flutuante com itens arredondados que entram em sequência. | Inspiração para atalhos da área de ajuda. Para Pix mobile, preserve o Sheet com ações rotuladas. |
| [Magic Bento](https://reactbits.dev/components/magic-bento) | Conjunto de cards com iluminação que segue cursor, efeitos internos e onda de clique. | Página de recursos do produto. No painel, aproveite a hierarquia e mantenha superfícies estáticas com foco claro. |
| [Circular Gallery](https://reactbits.dev/components/circular-gallery) | Desenha imagens em trilho curvo com arraste, rolagem e navegação por teclado, abrindo o item selecionado. | Galeria de screenshots de guia. Em documentos de cadastro, miniaturas em grade evitam esconder anexos. |
| [Reflective Card](https://reactbits.dev/components/reflective-card) | Projeta vídeo ou câmera num cartão metálico e atualiza reflexo conforme sua inclinação. | Demo de identidade visual com mídia escolhida. Evite solicitar câmera por um efeito cosmético no gateway. |
| [Card Nav](https://reactbits.dev/components/card-nav) | Expande a barra superior em grupos de links apresentados como cartões. | Menu público de produtos e documentação. No painel autenticado, use os grupos e o padrão de navegação já existentes. |
| [Stack](https://reactbits.dev/components/stack) | Cartões respondem ao arraste com mola. O cartão dispensado volta ao fim da pilha. | Tour opcional com sequência curta. A ordem financeira precisa permanecer explícita no extrato. |
| [Fluid Glass](https://reactbits.dev/components/fluid-glass) | Uma forma 3D refrata o conteúdo de fundo, segue o cursor e muda entre geometrias. | Demonstração visual separada. A refração compromete leitura de controles e valores na área operacional. |
| [Pill Nav](https://reactbits.dev/components/pill-nav) | A cápsula destaca o item escolhido, o preenchimento cresce no hover e o texto se desloca. | Seletor de seções com o indicador da rota como referência. Use Next Link, `aria-current` e estado por URL. |
| [Tilted Card](https://reactbits.dev/components/tilted-card) | Calcula a inclinação com ponteiro e perspectiva, com brilho e camadas que flutuam. | Cartão de campanha com imagem. Em transações, mantenha números e alvos alinhados. |
| [Masonry](https://reactbits.dev/components/masonry) | Posiciona imagens de alturas variadas, anima o reflow e abre itens em lightbox. | Galeria de anexos com prévias. Para dados tabulares, colunas alinhadas ajudam comparação e navegação. |
| [Glass Surface](https://reactbits.dev/components/glass-surface) | Usa filtro de fundo e deslocamento para simular refração em uma superfície translúcida. | Aplicação visual em mockup. No painel, superfícies opacas mantêm o contraste definido no design. |
| [Dome Gallery](https://reactbits.dev/components/dome-gallery) | Coloca imagens sobre um hemisfério e usa gestos para girar a superfície e abrir itens. | Apresentação imersiva de imagens fora do gateway. Exige alternativa plana para toque e movimento reduzido. |
| [Chroma Grid](https://reactbits.dev/components/chroma-grid) | Fotos em escala de cinza recuperam cor na área iluminada pelo cursor. | Página institucional de equipe. Perfis e estados de operador no admin usam cor semântica e texto. |
| [Folder](https://reactbits.dev/components/folder) | Abre uma aba por transformação ou gira uma capa e libera folhas selecionáveis. | Ilustração de organização de arquivos. Em auditoria, lista com nome, data e tipo é mais direta. |
| [Staggered Menu](https://reactbits.dev/components/staggered-menu) | O painel entra e os itens de navegação aparecem em sequência usando GSAP. | Navegação pública ou inspiração para a entrada curta de um menu mobile. Disponibilize os links assim que o menu abrir. |
| [Model Viewer](https://reactbits.dev/components/model-viewer) | Enquadra um modelo 3D, renderiza luz, sombra e movimento em Three.js com React Three Fiber. | Apresentação pública de dispositivo ou produto físico. O fluxo Pix não depende de visualizador 3D. |
| [Lanyard](https://reactbits.dev/components/lanyard) | Simula um crachá tridimensional preso a uma fita, que balança, vira e pode ser arrastado. | Evento ou demo de identidade visual. Use uma ficha estática para permissões e perfil reais. |
| [Profile Card](https://reactbits.dev/components/profile-card) | Inclina um cartão de perfil e desloca padrões e brilho holográfico com o ponteiro. | Página de equipe, se houver um contexto editorial. No admin, dados de papel e acesso precisam de leitura direta. |
| [Dock](https://reactbits.dev/components/dock) | Amplia ícones conforme proximidade, aplica rebote ao acionar e comporta badge e menu contextual. | Referência para atalhos frequentes. Adapte feedback de pressão sem mover a barra inferior. |
| [Gooey Nav](https://reactbits.dev/components/gooey-nav) | Desloca o destaque por partículas que se fundem em uma cápsula líquida. | Experimento público de navegação. No painel, o indicador de `Tabs sliding` explica a seleção com menos movimento. |
| [Pixel Card](https://reactbits.dev/components/pixel-card) | Preenche uma grade de pixels animados a partir do centro ou do cursor. | Card de recurso em campanha visual. Destaque sem pixels na operação mantém foco na informação. |
| [Carousel](https://reactbits.dev/components/carousel) | Alterna cards por swipe e apresenta transições e temporizador de avanço automático. | Ajuda ou tour voluntário, com setas, pausa e controle do usuário. Status, valores e ações centrais ficam acessíveis diretamente. |
| [Spotlight Card](https://reactbits.dev/components/spotlight-card) | O foco de luz acompanha o cursor e pode alcançar a borda ou cartões vizinhos. | Página pública de recursos. No painel, reaproveite só realce local de foco em áreas clicáveis. |
| [Border Glow](https://reactbits.dev/components/border-glow) | A borda mesh reage à direção do ponteiro e intensifica a luminosidade perto das extremidades. | Destaque promocional de uma peça. Alertas financeiros usam ícone, texto e cor estável. |
| [Flying Posters](https://reactbits.dev/components/flying-posters) | Torce e vira imagens em perspectiva enquanto a coluna avança por scroll ou arraste. | Galeria editorial fora do painel. Uma grade comum facilita chegar rapidamente à imagem buscada. |
| [Card Swap](https://reactbits.dev/components/card-swap) | Move o cartão da frente para trás em resposta a temporizador ou gesto, com trajetória 3D. | Tour de casos em página pública. Alteração automática de ordem atrapalha a consulta da fila de operações. |
| [Glass Icons](https://reactbits.dev/components/glass-icons) | Aplica forma e refração de vidro a ícones de uma grade ou dock. | Ícones ilustrativos públicos. Use Lucide e tokens do projeto para ações reais. |
| [Decay Card](https://reactbits.dev/components/decay-card) | Distorce e desmancha a imagem conforme o ponteiro, reconstruindo-a depois. | Peça de galeria experimental. Uma imagem de documento ou QR permanece intacta. |
| [Flowing Menu](https://reactbits.dev/components/flowing-menu) | Uma faixa que muda de posição revela um texto em movimento na linha sob o cursor. | Menu editorial de categorias. Na sidebar, use seleção por rota e texto legível em hover ou foco. |
| [Elastic Slider](https://reactbits.dev/components/elastic-slider) | Cresce sob o ponteiro, estica nos extremos e retorna ao soltar. | Ajuste visual de preferência. Para valores ou limites, ofereça entrada precisa por teclado e unidade. |
| [Counter](https://reactbits.dev/components/counter) | Cada dígito viaja numa tira vertical até a posição correspondente, com formatação de moeda e locale. | Totais ilustrativos fora do painel ou números não financeiros. O saldo usa troca de opacidade sem rolagem por números intermediários. |
| [Infinite Menu](https://reactbits.dev/components/infinite-menu) | Distribui itens numa esfera arrastável e encaixa o mais próximo com título em destaque. | Vitrine de imagens com poucos destinos. Não se ajusta à navegação operacional de acesso direto. |
| [Stepper](https://reactbits.dev/components/stepper) | Move o indicador e troca o conteúdo por transições de mola em fluxo horizontal ou vertical. | Revisão de saque, cadastro ou importação. Adapte o stepper existente e avance somente quando a etapa de negócio estiver válida. |
| [Bounce Cards](https://reactbits.dev/components/bounce-cards) | Faz cartões fotográficos entrarem em leque, com abertura e endireitamento no hover. | Apresentação de guias ou casos públicos. Em anexos, use uma lista com posição e acesso previsíveis. |

### Animações de texto gratuitas

Em dados operacionais, mantenha rótulos, valores, códigos e referências legíveis a cada instante. Entradas únicas e transições de rótulo inteiro são as opções mais fáceis de adaptar.

| Componente | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| [Tech Text](https://reactbits.dev/text-animations/tech-text) | Converte o desenho das letras em caminhos vetoriais tracejados que reagem à proximidade do cursor. | Assinatura visual institucional. Evite modificar a forma de referências, códigos ou títulos de operação. |
| [Text Loop](https://reactbits.dev/text-animations/text-loop) | Distribui texto repetido em caminhos SVG curvos e o desloca em ciclo com GSAP. | Marquee em campanha ou seção de parceiros, com pausa. Rótulos do painel permanecem estáveis. |
| [Masked Heading](https://reactbits.dev/text-animations/masked-heading) | Revela palavras por etapas e deixa imagem ou malha cromática à mostra apenas dentro das letras. | Título de lançamento público. Em telas autenticadas, aproveite entrada curta em opacidade. |
| [Particle Text](https://reactbits.dev/text-animations/particle-text) | Monta um texto a partir de partículas e as dispersa ou reúne quando acionado. | Vinheta de marca ou demo. O custo e a demora de leitura são inadequados para rótulos Pix. |
| [Split Flap Text](https://reactbits.dev/text-animations/split-flap-text) | Sobrepõe abas que viram por letra e percorrem caracteres como um painel mecânico. | Título temático de um tour. Em números financeiros, use troca direta sem simular valores intermediários. |
| [Warp Text](https://reactbits.dev/text-animations/warp-text) | Aplica deslocamento WebGL com OGL, refratando as letras perto do ponteiro. | Campanha experimental de marca. A deformação compromete leitura durante o uso de um formulário. |
| [Stroke Text](https://reactbits.dev/text-animations/stroke-text) | Desenha o contorno ao longo de caminhos e faz aparecer o preenchimento no final. | Logo ou frase de abertura pública. O check SVG é a adaptação funcional mais próxima. |
| [Depth Text](https://reactbits.dev/text-animations/depth-text) | Sobrepõe cópias do texto para criar extrusão e varia o deslocamento por distância do cursor. | Título editorial isolado. Cabeçalhos de página do painel devem ficar fixos. |
| [Fold Text](https://reactbits.dev/text-animations/fold-text) | Divide as linhas em superfícies e as gira em perspectiva até se abrirem como papel. | Anúncio de recurso em página pública. Para revisão de saque, aplique somente um fade de painel. |
| [Echo Text](https://reactbits.dev/text-animations/echo-text) | Cópias com opacidade decrescente seguem o texto e convergem até uma leitura única. | Vinheta para material de lançamento. Em status, a duplicação visual pode confundir a leitura. |
| [Split Text](https://reactbits.dev/text-animations/split-text) | Segmenta texto em letras, palavras ou linhas e aplica atrasos graduais via GSAP. | Breve introdução de onboarding ou vazio de boas-vindas. Preserve a frase inteira para leitura assistiva. |
| [Blur Text](https://reactbits.dev/text-animations/blur-text) | Faz trechos começarem suaves e recuperarem foco e opacidade com Motion. | Entrada única de texto de ajuda ou confirmação textual. Limite o blur a trecho secundário. |
| [Circular Text](https://reactbits.dev/text-animations/circular-text) | Posiciona caracteres ao redor de um centro e gira o conjunto em velocidade configurável. | Selo ilustrativo público. Rótulos de status em badges permanecem horizontais. |
| [Text Type](https://reactbits.dev/text-animations/text-type) | Escreve e apaga caracteres com cadência e cursor piscante, incluindo sequências de frases. | Tutorial ou demonstração optativa. Mensagens de transação precisam aparecer completas. |
| [Shuffle](https://reactbits.dev/text-animations/shuffle) | Embaralha e reassenta os caracteres na posição final, com GSAP para sequenciar o efeito. | Revelação de slogan em campanha. Códigos de autenticação e Pix devem surgir legíveis. |
| [Shiny Text](https://reactbits.dev/text-animations/shiny-text) | Uma faixa brilhante se desloca através da máscara das letras. | CTA institucional ou prévia de espera em demo. Use indicador de carregamento com rótulo fixo no painel. |
| [Text Pressure](https://reactbits.dev/text-animations/text-pressure) | Altera os eixos da fonte ou proporções dos caracteres conforme a distância do ponteiro. | Tipografia expressiva de uma página pública. Evite alterações de largura em menu e tabela. |
| [Curved Loop](https://reactbits.dev/text-animations/curved-loop) | Desloca texto continuamente numa curva, com direção ajustável pelo arraste. | Faixa de slogans em campanha com opção estática. Sem encaixe funcional em operações. |
| [Fuzzy Text](https://reactbits.dev/text-animations/fuzzy-text) | Renderiza o texto com deslocamentos e ruído, intensificados ao passar o cursor. | Ilustração retrô em experiência separada. Erros reais precisam de mensagem nítida. |
| [Gradient Text](https://reactbits.dev/text-animations/gradient-text) | Desloca faixas, malhas ou uma varredura cônica dentro das letras. | Frase pública de impacto com contraste controlado. O design do painel reserva cor semântica a estados e ações. |
| [Falling Text](https://reactbits.dev/text-animations/falling-text) | Converte trechos em objetos físicos que caem, colidem, podem ser arrastados e depois se recompõem com Matter.js. | Página lúdica de campanha. As instruções do gateway precisam continuar na ordem de leitura. |
| [Text Cursor](https://reactbits.dev/text-animations/text-cursor) | Cria cópias tipográficas em cadeia, carimbos ou fita ao longo do movimento do ponteiro. | Demo criativa separada. Evite cobrir controles e dados do gateway com rastros. |
| [Decrypted Text](https://reactbits.dev/text-animations/decrypted-text) | Mostra glifos transitórios e fixa a leitura real posição por posição. | Comunicação visual de um tour de integração. O código final e o estado de autorização ficam diretamente visíveis. |
| [True Focus](https://reactbits.dev/text-animations/true-focus) | Alterna a nitidez de palavras e pode mover um contorno sobre o termo em destaque. | Frase guiada num tutorial curto. No painel, destaque com cor ou peso sem alterar legibilidade dos demais termos. |
| [Scroll Float](https://reactbits.dev/text-animations/scroll-float) | Translada partes do texto durante a rolagem, acompanhando o progresso de entrada. | Capítulo de tour público. No extrato, o texto deve entrar naturalmente no viewport. |
| [Scroll Reveal](https://reactbits.dev/text-animations/scroll-reveal) | Faz opacidade e nitidez variarem com a rolagem, podendo destacar trechos. | Introdução editorial. Textos que o operador precisa para agir devem estar visíveis imediatamente. |
| [ASCII Text](https://reactbits.dev/text-animations/ascii-text) | Desenha glifos em malha animada, reage a inclinação, embaralha e forma ondas ao clicar. | Visual público para material de desenvolvedores. Conteúdo de API permanece selecionável. |
| [Scrambled Text](https://reactbits.dev/text-animations/scrambled-text) | A área próxima ao ponteiro embaralha caracteres e recupera o texto original em seguida. | Cartaz interativo de evento. Evite em instruções, valores e rótulos. |
| [Rotating Text](https://reactbits.dev/text-animations/rotating-text) | Alterna frases com entrada e saída em deslocamento ou rotação, sincronizando o contêiner. | Headline pública que alterna exemplos. No painel, uma troca acionada por estado pode usar a versão plana. |
| [Glitch Text](https://reactbits.dev/text-animations/glitch-text) | Separa canais de cor e desloca recortes de letras em pulsos. | Campanha de estética digital. Em tela de erro, prefira mensagem estável e ação clara. |
| [Scroll Velocity](https://reactbits.dev/text-animations/scroll-velocity) | Usa a velocidade da rolagem para acelerar e distorcer uma faixa repetitiva de texto. | Marquee de landing com controle de movimento. O painel exige rolagem previsível e conteúdo fixo por linha. |
| [Variable Proximity](https://reactbits.dev/text-animations/variable-proximity) | Interpola eixos de uma fonte variável por distância de cada letra ao cursor. | Efeito tipográfico de título público. Em dados densos, preserve largura, peso e alinhamento tabular. |
| [Count Up](https://reactbits.dev/text-animations/count-up) | Interpola uma contagem até o alvo, formata separadores e casas decimais e pode repetir em interação. | Indicador ilustrativo fora da operação. Para saldo e totais Pix, mostre o valor recebido e use Number subtle change. |

### Efeitos gratuitos de animação

Os efeitos com ponteiro, canvas e shaders tendem a servir a uma vitrine ou demonstração. O painel pode aproveitar o gesto ou a indicação de foco sem manter simulações em execução durante o trabalho.

| Componente | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| [Crystalized Ball](https://reactbits.dev/animations/crystalized-ball) | Renderiza uma esfera translúcida com arcos elétricos na borda e poeira luminosa que reage ao ponteiro. | Visual para lançamento técnico. Mantenha a atenção de uma operação real no estado da transação. |
| [Electric Logo](https://reactbits.dev/animations/electric-logo) | Usa o contorno do logotipo como origem de relâmpagos desenhados com OGL. | Vinheta curta de marca. Evite flashes atrás de fluxos de entrada e confirmação. |
| [Dither Veil](https://reactbits.dev/animations/dither-veil) | Aplica limiar de cor à foto e revela cor localmente ao redor do cursor, com retorno por células. | Seção de marca com foto original. Em anexos, a imagem inteira deve permanecer fiel ao arquivo. |
| [Glow Cursor](https://reactbits.dev/animations/glow-cursor) | Emite luz onde o ponteiro passa e dissipa os pontos com tempo e deslocamento. | Interação de campanha em área isolada. A navegação do painel usa cursor nativo e foco visível. |
| [Scroll Expand](https://reactbits.dev/animations/scroll-expand) | O quadro de mídia aumenta com scroll até ocupar a largura, alterando raio e escala. | Tour público com screenshot ilustrativo. Para expandir comprovante, abra um painel com ação explícita. |
| [Ripple Distortion](https://reactbits.dev/animations/ripple-distortion) | Uma perturbação em mapa de deslocamento WebGL deforma o conteúdo e desaparece gradualmente. | Foto ou vídeo promocional. Evite distorcer um QR Code ou uma instrução Pix. |
| [Elastic Mesh](https://reactbits.dev/animations/elastic-mesh) | Infla o contorno de texto ou logo e deforma a malha localmente sob pressão ou arraste. | Interação de marca lúdica. Sem função em controles de precisão ou alvos pequenos. |
| [Swarm Cursor](https://reactbits.dev/animations/swarm-cursor) | Partículas seguem o cursor com inércia, giram em redemoinhos e respondem a áreas clicáveis. | Demo gráfica separada. No painel, custo de movimento contínuo sem informação operacional. |
| [Halftone Reveal](https://reactbits.dev/animations/halftone-reveal) | Uma impressão pontilhada aumenta os pontos e expõe a foto sob o cursor. | Ilustração de guia ou campanha. Para um anexo, permita zoom do original. |
| [Pixel Swap](https://reactbits.dev/animations/pixel-swap) | A troca de estado avança numa grade de células a partir do ponto de entrada do cursor. | Comparação visual de cards em demo. No extrato, faça troca local por opacidade. |
| [Cursor Grid](https://reactbits.dev/animations/cursor-grid) | A posição e os cliques do ponteiro acendem células que se apagam em sequência. | Playground de interface. O foco operacional fica restrito ao controle acionado. |
| [Animated Content](https://reactbits.dev/animations/animated-content) | Observa a entrada no viewport e aplica uma combinação configurável de slide, máscara, blur ou escalonamento de filhos. | Entrada curta de bloco secundário em onboarding. No painel, adapte o fade e dispare pelo estado, sem esconder ações no scroll. |
| [Fade Content](https://reactbits.dev/animations/fade-content) | Revela o conteúdo com opacidade e, nas variantes, filtros, grão ou recortes de pixels. | Inspiração para o fade de conteúdo após skeleton. Use o estado de carregamento existente como disparo. |
| [Electric Border](https://reactbits.dev/animations/electric-border) | Desenha correntes irregulares que percorrem a borda e produzem faíscas em interação. | Enfeite de CTA em lançamento público. Indicadores de erro e foco do Slopay precisam permanecer simples e consistentes. |
| [Orbit Images](https://reactbits.dev/animations/orbit-images) | Coloca imagens em um percurso vetorial configurável e desloca as posições ao longo dele. | Página de ecossistema ou marcas parceiras. Uma lista estática facilita consulta de integrações. |
| [Pixel Transition](https://reactbits.dev/animations/pixel-transition) | Cobre o card com células, troca seu conteúdo sob a grade e depois remove as células. | Troca de exemplos visuais em demo. Para texto de status, uma troca direta conserva contexto. |
| [Glare Hover](https://reactbits.dev/animations/glare-hover) | Translada uma faixa especular de acordo com direção de entrada e movimento do ponteiro. | Card ilustrativo de apresentação. No dashboard, preservar contraste sobre cifras vale mais que o reflexo. |
| [Logo Loop](https://reactbits.dev/animations/logo-loop) | Repete as marcas numa faixa móvel, calcula a continuidade da repetição e oferece pausa no hover. | Parceiros reais na página pública, com pausa também acessível. Integrações operacionais ganham lista pesquisável. |
| [Target Cursor](https://reactbits.dev/animations/target-cursor) | Uma mira troca de tamanho e encaixa os cantos em torno dos alvos definidos. | Tour interativo com imagem de exemplo. A operação real preserva cursor e anel de foco nativos. |
| [Laser Flow](https://reactbits.dev/animations/laser-flow) | Um feixe com luz volumétrica atravessa o plano e espalha luminosidade na área de conteúdo. | Capa de lançamento. Em formulários, iluminação variável dificulta a leitura de controles. |
| [Ghost Cursor](https://reactbits.dev/animations/ghost-cursor) | Cria uma trilha translúcida semelhante a fumaça que sobe, curva e desaparece atrás do cursor. | Efeito artístico em demo. Sem ganho funcional para tarefas do painel. |
| [Gradual Blur](https://reactbits.dev/animations/gradual-blur) | Empilha camadas de blur e máscaras com intensidades graduais nas bordas da área rolável. | Indício de conteúdo além da dobra em mídia ou lista auxiliar. Prefira fade simples quando houver texto ou tabela sob o efeito. |
| [Click Spark](https://reactbits.dev/animations/click-spark) | Cada clique gera pequenos segmentos ou pontos que se afastam e perdem opacidade. | Interação comemorativa em tour. Para ação financeira, feedback deve representar o estado da requisição. |
| [Magnet](https://reactbits.dev/animations/magnet) | O elemento desloca a posição visual na direção do ponteiro e volta com easing ou mola. | CTA de campanha com alvo estável. Em botões de operação, simule pressão sem deslocar o alvo. |
| [Strands](https://reactbits.dev/animations/strands) | Fios luminosos se torcem e formam um volume dentro de uma esfera fosca. | Apresentação de voz ou demo visual. Use ícone e rótulo estáticos para processamento no gateway. |
| [Sticker Peel](https://reactbits.dev/animations/sticker-peel) | Aplica dobra por perspectiva e deixa arrastar a etiqueta, com efeitos de acabamento. | Peça de identidade ou tutorial ilustrativo. Uma etiqueta de status mantém forma e leitura. |
| [Pixel Trail](https://reactbits.dev/animations/pixel-trail) | Coloca pixels ao longo do percurso e os une visualmente em um rastro que escorre e se desfaz. | Arte interativa em página separada. Evite sobrepor sinais de seleção ou foco. |
| [Cubes](https://reactbits.dev/animations/cubes) | Uma grade de cubos ajusta a orientação conforme o ponteiro e propaga ondas em resposta a cliques. | Visual de infraestrutura em landing. Use uma grade de informações estática no admin. |
| [Metallic Paint](https://reactbits.dev/animations/metallic-paint) | Usa shader para mover reflexos cromados sobre a silhueta de uma marca ou texto. | Mockup de marca para material de campanha. O painel preserva tokens de cor e superfícies opacas. |
| [Noise](https://reactbits.dev/animations/noise) | Sobrepõe grão procedural configurável, com padrões de papel, filme ou estática. | Textura estática discreta em peça pública. Evite grão animado sob texto, gráfico ou extrato. |
| [Shape Blur](https://reactbits.dev/animations/shape-blur) | Varia desfoque sobre o contorno de uma forma de acordo com a posição do cursor. | Marca ilustrativa em área separada. Ações e estados de interface precisam estar nítidos. |
| [Crosshair](https://reactbits.dev/animations/crosshair) | Posiciona eixos de mira, mostra coordenadas e se alinha a alvos. | Ferramenta interna de inspeção de layout, se houver. Usuários do gateway conservam cursor padrão. |
| [Image Trail](https://reactbits.dev/animations/image-trail) | Adiciona quadros ao longo do percurso do ponteiro e os anima com variantes de saída via GSAP. | Vitrine editorial com mídia licenciada e separada dos arquivos de clientes. |
| [Ribbons](https://reactbits.dev/animations/ribbons) | Simula fitas em mola que seguem a posição anterior do cursor e ondulam ao retornar. | Animação promocional de fundo com pausa. Sem papel em fluxos de consulta. |
| [Splash Cursor](https://reactbits.dev/animations/splash-cursor) | Uma simulação de fluido injeta cor e velocidade no campo ao mover ou clicar. | Experimento visual público. Evite canvas contínuo no painel. |
| [Meta Balls](https://reactbits.dev/animations/meta-balls) | Esferas formam uma superfície aparente que se funde e se separa, reagindo a uma esfera ligada ao ponteiro. | Ilustração interativa abstrata. Para atalhos Pix, um menu com alvos independentes é mais claro. |
| [Blob Cursor](https://reactbits.dev/animations/blob-cursor) | Renderiza uma massa tridimensional que se alonga, oscila e se separa em gotas durante o gesto. | Demonstração artística de materiais. O cursor de formulários e tabelas permanece nativo. |
| [Star Border](https://reactbits.dev/animations/star-border) | Um ponto brilhante segue o contorno do componente, com rastro animado. | Realce de peça pública esporádica. Use foco CSS sem brilho recorrente para ações financeiras. |

### Fundos gratuitos

Um fundo de mídia é uma peça de apresentação. Para o painel autenticado, o design do Slopay usa fundos sólidos. Em superfície pública, o custo depende de tamanho, taxa de quadros, número de camadas e resposta ao ponteiro. Considere a versão estática quando o efeito cumprir o mesmo papel.

| Componente | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| [Gradient ASCII](https://reactbits.dev/backgrounds/gradient-ascii) | Brilhos de gradiente são quantizados numa grade de caracteres que muda ao redor do cursor. | Fundo de uma peça para desenvolvedores, atrás de uma área de texto sólida. |
| [Flux Lines](https://reactbits.dev/backgrounds/flux-lines) | Linhas de campo seguem a velocidade de um fluido magnético e se curvam ao se aproximar do ponteiro. | Ilustração de fluxo numa campanha sobre integrações, fora da operação. |
| [Pattern Waves](https://reactbits.dev/backgrounds/pattern-waves) | Um shader desloca a superfície pontilhada ou hachurada como tecido sob iluminação. | Fundo de vitrine para um recurso, com imagem estática em mobile. |
| [Micro Slats](https://reactbits.dev/backgrounds/micro-slats) | Pequenas aletas mudam ângulo e altura como uma superfície ondulada em perspectiva. | Peça de marca geométrica que funciona isolada de informações de leitura frequente. |
| [Shape Waves](https://reactbits.dev/backgrounds/shape-waves) | Ondas de fase animam tamanho e brilho de círculos, quadrados e triângulos numa grade. | Fundo de campanha com formas da marca, sem usar como indicador de progresso. |
| [Aero Shards](https://reactbits.dev/backgrounds/aero-shards) | Fragmentos de vidro se organizam em fitas e atravessam planos de profundidade com luz nas quinas. | Cenário de filme ou tour institucional, com custo de GPU a medir. |
| [Ghost Fibers](https://reactbits.dev/backgrounds/ghost-fibers) | Filamentos em fitas ondulam em planos de foco e luminosidade diferentes. | Fundo editorial de tema infraestrutura, exportável como imagem estática. |
| [CRT Warp](https://reactbits.dev/backgrounds/crt-warp) | Plasma em blocos é projetado sobre uma tela curva com linhas, máscara de fósforo e efeito de ligar. | Campanha de estética retrô. A área de operações demanda legibilidade estável. |
| [Molten Metal](https://reactbits.dev/backgrounds/molten-metal) | Filamentos luminosos de um material fundido aumentam de intensidade conforme interação. | Imagem de lançamento de alto impacto, afastada de textos e controles. |
| [Gradient Waves](https://reactbits.dev/backgrounds/gradient-waves) | Ondas acetinadas avançam do horizonte e reagem com variação de luz ao ponteiro. | Hero público com uma zona livre para texto e uma versão parada. |
| [Web Threads](https://reactbits.dev/backgrounds/web-threads) | Fios conectam nós luminosos. Passagem do cursor ou clique propaga luz pelas ligações. | Ilustração abstrata de integrações numa página institucional. |
| [Topography](https://reactbits.dev/backgrounds/topography) | Uma malha de curvas de nível muda elevação e emite ondas de luz ao redor da interação. | Peça sobre alcance geográfico, com mapa e números reais apresentados à parte. |
| [Light Tunnel](https://reactbits.dev/backgrounds/light-tunnel) | Traços luminosos percorrem um túnel em profundidade e mudam direção com o ponteiro. | Vinheta de lançamento. A sensação de voo torna o efeito inadequado ao uso diário. |
| [Sliced Waves](https://reactbits.dev/backgrounds/sliced-waves) | Uma onda de cor é amostrada em barras que variam de brilho, com foco seguindo o cursor. | Arte para capa de guia, sem função de gráfico de dados. |
| [Acid Squares](https://reactbits.dev/backgrounds/acid-squares) | Quadrados brilhantes se inclinam numa onda conforme duas luzes coloridas derivam. | Fundo experimental em um playground. Preserve a estabilidade visual no painel. |
| [Scanner](https://reactbits.dev/backgrounds/scanner) | Linhas de interferência, brilho e granulação recebem uma varredura móvel e pulsos de interação. | Material sobre diagnóstico técnico. O estado real de verificação é exibido em texto. |
| [Ferrofluid](https://reactbits.dev/backgrounds/ferrofluid) | Uma superfície reflexiva simula picos de líquido magnético e se eleva perto do cursor. | Ilustração de material em campanha. Sem utilidade para filas, valores ou formulários. |
| [Lightfall](https://reactbits.dev/backgrounds/lightfall) | Riscos luminosos caem num percurso curvo e se alongam quando o usuário mantém a pressão. | Cenário de transição de vídeo ou campanha. Use uma imagem estática se servir apenas de fundo. |
| [Liquid Ether](https://reactbits.dev/backgrounds/liquid-ether) | Injeta movimento e cor num campo de fluido e colore regiões pela intensidade do escoamento. | Fundo artístico de página pública, com orçamento de GPU e alternativa estática. |
| [Prism](https://reactbits.dev/backgrounds/prism) | Uma forma prismática gira e decompõe a luz em cores configuráveis. | Capa de lançamento com alto contraste no texto adjacente. |
| [Dark Veil](https://reactbits.dev/backgrounds/dark-veil) | Um campo luminoso escuro ondula e muda de forma quando o ponteiro se aproxima. | Hero escuro de marca. Superfícies opacas são mais previsíveis no painel. |
| [Light Pillar](https://reactbits.dev/backgrounds/light-pillar) | Uma coluna luminosa gira, inclina e responde a clique com pulso de intensidade. | Visual isolado em anúncio de produto. Evite como confirmação de operação. |
| [Antigravity](https://reactbits.dev/backgrounds/antigravity) | Partículas circulam em torno do ponteiro e são arremessadas ao clique. | Playground de marca. Não representa o processamento de um evento real. |
| [Silk](https://reactbits.dev/backgrounds/silk) | Ondas suaves criam dobras com brilho que acompanha cursor e pulso de clique. | Textura de página institucional, com quadros parados no mobile. |
| [Floating Lines](https://reactbits.dev/backgrounds/floating-lines) | Conjuntos de linhas derivam e se abrem ao redor do cursor, com curvatura extra ao clicar. | Faixa visual de documentação pública, separada do corpo do texto. |
| [Side Rays](https://reactbits.dev/backgrounds/side-rays) | Raios se abrem a partir de um canto, cintilam e inclinam em resposta ao ponteiro. | Acento de um hero público. Preserve área de leitura sem luminosidade variável. |
| [Light Rays](https://reactbits.dev/backgrounds/light-rays) | Feixes volumétricos saem de uma borda e reagem ao cursor com sombra e névoa. | Vitrine de produto. Mantenha rótulos fora da região de maior brilho. |
| [Pixel Blast](https://reactbits.dev/backgrounds/pixel-blast) | Nuvens em pixels se movem numa malha com dither, ripples e opção de chão em perspectiva. | Campanha retrô ou demo técnica, com fallback estático. |
| [Color Bends](https://reactbits.dev/backgrounds/color-bends) | Um shader em Three.js deforma campos de cor para produzir faixas curvas em fluxo. | Fundo artístico de campanha. No gateway, as cores têm significado de estado. |
| [Line Waves](https://reactbits.dev/backgrounds/line-waves) | Ondulações pequenas deslocam linhas paralelas enquanto uma faixa de luz passa pelo conjunto. | Moldura discreta de vídeo ou banner público. Sem loop junto a tabela. |
| [Radar](https://reactbits.dev/backgrounds/radar) | Um feixe rotativo deixa pós-brilho e revela pontos em movimento no mostrador. | Ilustração de uma página de monitoramento. Métricas reais usam escala e legenda. |
| [Soft Aurora](https://reactbits.dev/backgrounds/soft-aurora) | Ruído Perlin 3D e paleta cossenoidal criam luz difusa em ondas. | Arte atmosférica pública com contraste isolado da tipografia. |
| [Magic Rings](https://reactbits.dev/backgrounds/magic-rings) | Anéis se propagam com atraso de fase e ganham intensidade ao aproximar ou clicar. | Ilustração de conectividade em campanha. Evite disparar como celebração de transação. |
| [Aurora](https://reactbits.dev/backgrounds/aurora) | Uma faixa no topo se desloca como aurora e curva levemente com o cursor. | Fundo de capa pública, com área sólida para texto e versão imóvel. |
| [Plasma](https://reactbits.dev/backgrounds/plasma) | Dobras luminosas mudam de ângulo e parecem girar no espaço conforme o ponteiro. | Experimento de marca em área isolada, sem valores operacionais sobre o efeito. |
| [Plasma Wave](https://reactbits.dev/backgrounds/plasma-wave) | Duas faixas curvas atravessam uma à outra e acendem núcleos de alta intensidade. | Peça visual curta de lançamento, com pausa e redução de movimento. |
| [Particles](https://reactbits.dev/backgrounds/particles) | Pontos em planos 3D cintilam, podem ser ligados por linhas e respondem ao cursor. | Ilustração de ecossistema ou rede em campanha. Uma lista estática comunica integrações reais. |
| [Gradient Blinds](https://reactbits.dev/backgrounds/gradient-blinds) | Lâminas de gradiente mudam inclinação e recebem um brilho que segue o cursor. | Visual de superfície em landing. Textos de operação precisam de contraste constante. |
| [Grainient](https://reactbits.dev/backgrounds/grainient) | Campos de cor com grão são deformados continuamente e podem ser perturbados pelo cursor. | Textura pública, preferencialmente exportada como imagem. |
| [Grid Scan](https://reactbits.dev/backgrounds/grid-scan) | A perspectiva cria uma sala de linhas percorrida por uma faixa de varredura. | Cenário de tutorial técnico. Evite que a faixa pareça progresso de processamento. |
| [Beams](https://reactbits.dev/backgrounds/beams) | Fitas onduladas refletem luz em um fundo escuro com foco ajustado pelo ponteiro. | Vitrine de recurso institucional. Sem benefício para leitura de saldo ou revisão de saque. |
| [Pixel Snow](https://reactbits.dev/backgrounds/pixel-snow) | Camadas de pixels descem em velocidades diferentes e desviam ao passar pelo cursor. | Campanha sazonal optativa. Em operações, preserve fundo imóvel. |
| [Lightning](https://reactbits.dev/backgrounds/lightning) | Ramificações elétricas mudam direção e lançam um raio na interação. | Vinheta curta fora do painel, com opção estática. Flashes atrapalham ações recorrentes. |
| [Prismatic Burst](https://reactbits.dev/backgrounds/prismatic-burst) | Raios coloridos se abrem em leque e propagam uma onda após clique. | Cena de lançamento. Para status de Pix, o destaque local é mais inteligível. |
| [Galaxy](https://reactbits.dev/backgrounds/galaxy) | Campo de estrelas se desloca em perspectiva, com aceleração, brilho e repulsão sob o ponteiro. | Landing com tema espacial ou protótipo visual. Evite voo contínuo em telas de trabalho. |
| [Dither](https://reactbits.dev/backgrounds/dither) | Converte ondas de tonalidade em padrões ordenados ou ruidosos, com paleta e rastro ajustáveis. | Arte editorial em baixa intensidade. Preserve texto e valores em plano sólido. |
| [Faulty Terminal](https://reactbits.dev/backgrounds/faulty-terminal) | Uma grade de glifos com brilho de fósforo reage ao cursor e dá pulsos de glitch. | Campanha de API com estética retrô. Exemplos de código reais devem ser legíveis e copiáveis. |
| [Ripple Grid](https://reactbits.dev/backgrounds/ripple-grid) | Distorce uma grade por ondas que também alteram luminosidade nas linhas. | Ilustração de fluxo em site público. No gateway, use linhas estáveis para orientar tabelas. |
| [Dot Field](https://reactbits.dev/backgrounds/dot-field) | Uma lente móvel amplia, comprime ou gira um campo de pontos com gradiente. | Fundo interativo para demo isolada. Sem função no extrato. |
| [Dot Grid](https://reactbits.dev/backgrounds/dot-grid) | Pontos se deslocam com mola e recebem ondas quando acionados pelo cursor. | Ilustração de uma página de recursos. Para foco local, prefira mudança leve de cor. |
| [Threads](https://reactbits.dev/backgrounds/threads) | Fios ondulados se separam e se recompõem em torno do cursor. | Arte de apoio para tema de conexão. As ligações reais entre sistemas devem ter legenda própria. |
| [Hyperspeed](https://reactbits.dev/backgrounds/hyperspeed) | Linhas de luz percorrem pista em perspectiva e aceleram enquanto há pressão. Usa Three.js. | Vinheta de campanha sobre desempenho, com alternativa sem deslocamento. |
| [Iridescence](https://reactbits.dev/backgrounds/iridescence) | Um campo de cor iridescente muda dobras e reflexos quando o cursor o perturba. | Fundo decorativo público com recorte que preserve leitura. |
| [Waves](https://reactbits.dev/backgrounds/waves) | Linhas oscilam como tecido, cedem ao ponteiro e retornam por interpolação. | Faixa institucional ou pôster. No painel, linhas servem à separação estática de informações. |
| [Magnet Lines](https://reactbits.dev/backgrounds/magnet-lines) | Pequenas linhas giram para apontar ao cursor e respondem ao clique em sequência. | Arte de campanha ligada a magnetismo ou direção. Evite cobrir controles interativos. |
| [Grid Distortion](https://reactbits.dev/backgrounds/grid-distortion) | Divide uma imagem em blocos e aplica deslocamento à região próxima do ponteiro. | Transição visual numa galeria de marketing. Documentos precisam manter fidelidade. |
| [Ballpit](https://reactbits.dev/backgrounds/ballpit) | Esferas sombreadas colidem e podem ser empurradas, agarradas ou lançadas. | Playground lúdico separado. Simulação contínua sem aplicação à operação financeira. |
| [Orb](https://reactbits.dev/backgrounds/orb) | Uma borda colorida oscila e gira em torno de um centro, reagindo à aproximação. | Ilustração de produto ou demo de voz. Para espera no Pix, use spinner pequeno com texto. |
| [Letter Glitch](https://reactbits.dev/backgrounds/letter-glitch) | Glifos numa grade trocam forma e cor, com perturbação perto de movimento ou clique. | Capa pública de documentação técnica, com códigos e referências em plano sólido. |
| [Grid Motion](https://reactbits.dev/backgrounds/grid-motion) | Uma grade inclinada desloca tiles e aumenta brilho onde o cursor repousa. | Vitrine com imagens de casos. O painel operacional mantém ordem e posição fixas. |
| [Shape Grid](https://reactbits.dev/backgrounds/shape-grid) | Formas em grade derivam em perspectiva e deixam rastros de cor ao interagir. | Fundo de peça de lançamento, com fallback estático. |
| [Liquid Chrome](https://reactbits.dev/backgrounds/liquid-chrome) | Um shader de metal líquido ondula e reflete luz em resposta ao cursor. | Efeito de marca em mockup. Contraste móvel e custo de renderização tornam o painel um mau encaixe. |
| [Balatro](https://reactbits.dev/backgrounds/balatro) | Padrão pintado em pixels gira, responde ao ponteiro e forma vórtices no clique. | Experimento público com estética de jogo. Preserve sobriedade na experiência de pagamento. |

## React Bits Pro

### UI & Cards Pro

Os componentes criativos Pro têm demos e propriedades públicas e distribuição por registro autenticado. O encaixe abaixo avalia o comportamento demonstrado. A implementação interna do código pago requer acesso à variante licenciada. [Componentes](https://pro.reactbits.dev/docs/components) · [Licença Pro](https://pro.reactbits.dev/license)

| Componente | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| [Animated List](https://pro.reactbits.dev/docs/components/animated-list) | Um feed recebe itens identificados e anima a entrada de cada novo registro no fluxo. | Inspiração para novas ocorrências, mantendo posição do operador, chaves estáveis e semântica de tabela no extrato. |
| [Card Spread](https://pro.reactbits.dev/docs/components/card-spread) | Um conjunto de cartões gira e abre em leque sob hover. | Vitrine pública de comprovantes fictícios ou casos. No painel, informações de cada item ficam acessíveis sem hover. |
| [Center Flow](https://pro.reactbits.dev/docs/components/center-flow) | Pulsos partem de um nó central e percorrem ligações até ícones ou conteúdo configurável. | Diagrama de integrações para documentação, usando pulsos apenas quando ajudarem a explicar fluxo. |
| [Chroma Card](https://pro.reactbits.dev/docs/components/chroma-card) | Inclina a imagem e separa canais RGB quando o ponteiro entra. | Vitrine editorial com screenshot fictício. Deixe a mídia de auditoria sem distorção. |
| [Circle Gallery](https://pro.reactbits.dev/docs/components/circle-gallery) | Uma sequência circular reage ao arraste e continua girando com inércia. | Galeria institucional de mídia. Navegação direta por lista facilita pesquisa de anexos. |
| [Circles](https://pro.reactbits.dev/docs/components/circles) | Imagens são posicionadas em várias órbitas concêntricas em movimento. | Ilustração de ecossistema ou parceiros reais. No painel, use o estado de cada integração em texto. |
| [Click Stack](https://pro.reactbits.dev/docs/components/click-stack) | Cada clique avança a pilha e traz outro cartão com conteúdo React. | Tour de recursos com botões Anterior e Próximo. No extrato, evite esconder registros em pilha. |
| [Comparison Slider](https://pro.reactbits.dev/docs/components/comparison-slider) | Duas imagens ocupam o mesmo espaço, e o controle desloca a divisão que revela cada lado. | Comparativo em documentação ou em revisão de layout, com controles acessíveis. |
| [Credit Card](https://pro.reactbits.dev/docs/components/credit-card) | Formata dados de cartão e aplica inclinação 3D conforme o hover. | Mockup público usando dados fictícios. Nenhum papel na apresentação de saldos Pix. |
| [Draggable Grid](https://pro.reactbits.dev/docs/components/draggable-grid) | A malha de imagens se desloca sob arraste e desacelera quando solta. | Vitrine de tutoriais ilustrados. Em anexos, use grade navegável sem arrastar. |
| [Frame Scrub](https://pro.reactbits.dev/docs/components/frame-scrub) | Relaciona posição do scroll a uma sequência de imagens ou a quadros amostrados de vídeo. | Tutorial público do produto com frames fictícios. Evite carregar sequências extensas em páginas operacionais. |
| [Gradient Carousel](https://pro.reactbits.dev/docs/components/gradient-carousel) | Cartões entram em perspectiva e a cor dominante da imagem ativa recolore o fundo. | Página de casos. Em alertas financeiros, preserve o significado de cada cor. |
| [Hover Preview](https://pro.reactbits.dev/docs/components/hover-preview) | Trechos configurados exibem imagens de prévia quando o cursor entra no texto. | Documentação de integrações com alternativa acessível. Para comprovante, prefira ação explícita com título. |
| [Liquid Swap](https://pro.reactbits.dev/docs/components/liquid-swap) | Uma lente esférica deforma imagens durante a troca, com duração configurável. | Transição de vitrine artística. Em dados operacionais, a troca deve ser breve e legível. |
| [Loupe Image](https://pro.reactbits.dev/docs/components/loupe-image) | Uma lupa móvel amplia região de uma imagem, trocando para uma cópia de maior resolução quando carrega. | Inspiração para inspeção de anexos. Ofereça zoom por botões e teclado e mantenha controles de privacidade. |
| [Magic Transform](https://pro.reactbits.dev/docs/components/magic-transform) | Documentos atravessam um quadro e saem como chips ilustrativos de campos extraídos. | Demo pública de uma futura importação. Na operação, mostre validações e resultados reais linha por linha. |
| [Modal Cards](https://pro.reactbits.dev/docs/components/modal-cards) | O cartão escolhido cresce até a superfície de modal em continuidade com sua origem. | Detalhe de movimentação. Transplante a relação de origem visual ao Dialog ou Sheet existente com foco e rota preservados. |
| [Orbit Reel](https://pro.reactbits.dev/docs/components/orbit-reel) | Vários cartões formam uma roda que atravessa o quadro em arco, com legenda no item em foco. | Galeria pública com navegação direta aos mesmos destinos. A fila do gateway mantém ordem estável. |
| [Parallax Cards](https://pro.reactbits.dev/docs/components/parallax-cards) | Camadas de imagens respondem ao cursor em velocidades diferentes para sugerir profundidade. | Mockup de marketing. Em cards de saldo, superfície plana mantém comparação. |
| [Preloader](https://pro.reactbits.dev/docs/components/preloader) | Exibe uma tela de espera com escada, porcentagem, círculo, slide ou cortina conforme a variante. | Demo pública ou mídia pesada escolhida. No painel, use skeleton local e porcentagem somente com progresso conhecido. |
| [Reel Gallery](https://pro.reactbits.dev/docs/components/reel-gallery) | Fileiras inclinadas de imagens deslizam com scroll em cadências diferentes. | Galeria de casos de uso em página pública. Sem função em tabelas operacionais. |
| [Scroll Mask](https://pro.reactbits.dev/docs/components/scroll-mask) | A rolagem revela mídia com geometria selecionável, como íris, cortina, grade ou recorte tipográfico. | Abertura de caso editorial com alternativa estática. Em comprovantes, mantenha a leitura imediata. |
| [Scroll Stack](https://pro.reactbits.dev/docs/components/scroll-stack) | Cartões se sobrepõem e desaparecem gradualmente de acordo com a rolagem. | Sequência visual de tutorial, mantendo conteúdo também acessível em fluxo simples. |
| [Simple Graph](https://pro.reactbits.dev/docs/components/simple-graph) | Gera uma linha a partir de pontos com valor e rótulo e anima seu desenho. | Referência para indicadores do gateway. Use Recharts, dados reais, eixos e alternativa textual. |
| [Skewed Carousel](https://pro.reactbits.dev/docs/components/skewed-carousel) | Inclina cartões e varia o ângulo durante o deslocamento até o item central. | Carrossel público de recursos. Registros operacionais ganham seleção plana e leitura integral. |
| [Tile Reveal](https://pro.reactbits.dev/docs/components/tile-reveal) | Imagens fragmentadas entram no scroll e compõem o cenário em torno de um título fixo. | Campanha de produto. O painel já carrega blocos com skeleton local. |
| [Tilted Tiles](https://pro.reactbits.dev/docs/components/tilted-tiles) | Uma parede inclinada de colunas de imagens corre em profundidade. | Vitrine pública de mídia com pôster estático. Sem encaixe em consulta ou envio. |
| [Tumble Wall](https://pro.reactbits.dev/docs/components/tumble-wall) | Peças com fotos ou rótulos caem e colidem, podendo ser lançadas por gesto. | Playground de apresentação. A ordenação de operações deve ter critério visível. |

### Texto Pro

| Componente | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| [3D Letter Swap](https://pro.reactbits.dev/docs/components/3d-letter-swap) | Sobrepõe versões de caracteres e gira cada face durante o hover. | Título público interativo. Em botões Pix, mantenha o rótulo completo durante a troca de estado. |
| [3D Text Reveal](https://pro.reactbits.dev/docs/components/3d-text-reveal) | Linhas percorrem uma superfície cilíndrica e giram para aparecer com o scroll. | Capítulo de apresentação. Texto de instrução no gateway fica no fluxo normal. |
| [ASCII Ripple](https://pro.reactbits.dev/docs/components/ascii-ripple) | Uma grade representa o texto com glifos de intensidades diferentes e recebe ondas do ponteiro. | Arte para uma página de API. Exemplos e referências ficam em texto copiável. |
| [Bending Marquee](https://pro.reactbits.dev/docs/components/bending-marquee) | Repete frases e separadores numa faixa que se curva enquanto avança. | Faixa de campanha com pausa. Mantenha status operacionais vinculados a eventos do gateway. |
| [Blur Highlight](https://pro.reactbits.dev/docs/components/blur-highlight) | Revela parágrafo de modo gradual e realça ocorrências de frases configuradas. | Instrução breve no onboarding, com a frase inteira disponível desde o início. |
| [Cipher Reveal](https://pro.reactbits.dev/docs/components/cipher-reveal) | Troca caracteres transitórios até revelar a palavra real no mesmo espaço. | Efeito editorial de segurança. Evite em OTP, referências e estados financeiros. |
| [Domino Lettering](https://pro.reactbits.dev/docs/components/domino-lettering) | Letras tombam em sequência e retornam à linha com atraso por posição. | Título lúdico isolado. Movimentação de texto dificulta leitura contínua. |
| [Elastic Lettering](https://pro.reactbits.dev/docs/components/elastic-lettering) | Cada linha se comporta como faixa elástica arrastável, que retorna por mola. | Experimento tipográfico público com texto estático alternativo. |
| [Ghost Type](https://pro.reactbits.dev/docs/components/ghost-type) | Um trecho é digitado e permanece, enquanto sugestões fantasma alternam no fim. | Demonstração de suporte ou busca. No input operacional, placeholder permanece estável e separado do valor. |
| [Glitch Text](https://pro.reactbits.dev/docs/components/glitch-text) | O hover separa cores e desloca fragmentos temporários do texto. | Estética de campanha digital. Mensagens de falha usam texto nítido. |
| [Glyph Lottery](https://pro.reactbits.dev/docs/components/glyph-lottery) | Cada caractere percorre uma tira como um rolo e trava no glifo final. | Slogan de campanha. O painel financeiro evita números transitórios. |
| [Gravity Letters](https://pro.reactbits.dev/docs/components/gravity-letters) | Texto composto de grãos se separa no corte, cai e volta a formar as letras. | Playground visual. Sem função em títulos de formulários ou recibos. |
| [Label Orbit](https://pro.reactbits.dev/docs/components/label-orbit) | Um rótulo substitui o cursor, alterna frases por rolagem e deixa cópias em profundidade. | Vitrine editorial. Os controles do gateway mantêm cursor, rótulo e foco nativos. |
| [Luminous Type](https://pro.reactbits.dev/docs/components/luminous-type) | Um foco móvel eleva o brilho de trechos de um texto que permanece presente na base. | Leitura guiada em tutorial, com contraste adequado mesmo fora do foco. |
| [Mesh Lettering](https://pro.reactbits.dev/docs/components/mesh-lettering) | A silhueta das letras se comporta como tecido ondulante, com dobra adicional no ponteiro. | Hero de marca. A deformação torna a leitura operacional instável. |
| [Orbital Type](https://pro.reactbits.dev/docs/components/orbital-type) | Faixas ou letras se distribuem num globo giratório que aceita impulso. | Elemento de identidade em página pública. Sem papel em consulta de dados. |
| [Particle Text](https://pro.reactbits.dev/docs/components/particle-text) | Pontos formam o texto e se afastam do cursor antes de se reagrupar. | Vinheta de lançamento. Mantenha rótulos e códigos reais como texto. |
| [Ribbon Type](https://pro.reactbits.dev/docs/components/ribbon-type) | A frase se repete sobre fitas que ondulam e torcem em 3D. | Peça de movimento de marca, isolada de ações. |
| [Rising Ink](https://pro.reactbits.dev/docs/components/rising-ink) | Letras levantam da superfície em perspectiva quando o ponteiro se aproxima. | Slogan interativo. Evite mover rótulos de controle. |
| [Shatter Type](https://pro.reactbits.dev/docs/components/shatter-type) | Fragmentos em forma de vidro compõem a palavra, trincam no hover e se soltam ao clique. | Arte de campanha. Flashes e fragmentação são inadequados a feedback recorrente. |
| [Signal Type](https://pro.reactbits.dev/docs/components/signal-type) | As letras simulam ignição irregular de um letreiro antes de estabilizar. | Letreiro institucional pontual. No painel, evitar cintilação atrás de informação. |
| [Smoke Type](https://pro.reactbits.dev/docs/components/smoke-type) | Fumaça ao fundo se acumula enquanto letras aparecem em sequência. | Vinheta de texto de apresentação. Instruções de saque devem aparecer completas. |
| [Speeding Text](https://pro.reactbits.dev/docs/components/speeding-text) | Um valor sai do inicial e viaja ao destino, com borrão de velocidade na passagem. | Métrica de uma apresentação fictícia. Em dinheiro, use o número oficial e ênfase ao redor. |
| [Spring Lettering](https://pro.reactbits.dev/docs/components/spring-lettering) | Letras próximas se inclinam e seguem o movimento com resposta elástica. | Headline lúdica pública. A tipografia de dados permanece imóvel. |
| [Staggered Text](https://pro.reactbits.dev/docs/components/staggered-text) | Encadeia a entrada de letras, palavras ou linhas, com espaçamento de tempo configurável. | Mensagem curta de boas-vindas, se a apresentação estiver completa para leitura assistiva. |
| [Stipple Type](https://pro.reactbits.dev/docs/components/stipple-type) | As letras contêm tinta marmorizada que se agita e forma pontos conforme interação. | Frase de marca em peça isolada. Use cor sólida para textos funcionais. |
| [Tessera Trail](https://pro.reactbits.dev/docs/components/tessera-trail) | Carimba azulejos de letras ao longo do cursor, com cores interpoladas e mola. | Playground de tipografia. Rastro de texto prejudica concentração no painel. |
| [Text Cube](https://pro.reactbits.dev/docs/components/text-cube) | Glifos compõem uma estrutura cúbica 3D que acompanha o cursor. | Vitrine de desenvolvimento criativo, longe de campos de dados. |
| [Text Morph](https://pro.reactbits.dev/docs/components/text-morph) | Desloca letras em comum entre palavras e faz as demais aparecerem por blur ou transformação líquida. | Headline de campanha. Para status, anime rótulos completos preservando seu significado. |
| [Text Path](https://pro.reactbits.dev/docs/components/text-path) | Desloca o texto seguindo o caminho SVG informado. | Faixa editorial em uma página pública. Evite para ajuda e ações rotuladas. |
| [Text Scatter](https://pro.reactbits.dev/docs/components/text-scatter) | Aplica deslocamentos às letras no hover e as deixa voltar à composição original. | Experimento editorial, com texto acessível fixo. Pouco adequado a UI operacional. |
| [Typographic Wall](https://pro.reactbits.dev/docs/components/typographic-wall) | Uma parede de glifos revela palavras ou links linha por linha à passagem de uma faixa. | Navegação de campanha, com links também visíveis sem efeito. |
| [Vapor Type](https://pro.reactbits.dev/docs/components/vapor-type) | Palavras alternam ao condensar e dissipar, reservando espaço para a maior. | Frase pública rotativa. Preserve rótulos estáticos e espaço fixo em botões do gateway. |
| [Wave Lettering](https://pro.reactbits.dev/docs/components/wave-lettering) | Linhas de texto repetido se movem em ondas, variando foco e cor com a profundidade. | Fundo tipográfico de campanha, com cópia principal em outra camada. |

### Cursores Pro

Os cursores abaixo funcionam como elementos de apresentação ou ferramentas de manipulação especializadas. No Slopay, controles e tabelas dependem da posição exata do ponteiro e de foco equivalente por teclado.

| Componente | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| [Arc Cursor](https://pro.reactbits.dev/docs/components/arc-cursor) | Um arco elétrico se desenha sobre o caminho recente do cursor, com ramificações. | Vitrine de um tema elétrico. Evite flashes junto de ações financeiras. |
| [Ascii Cursor](https://pro.reactbits.dev/docs/components/ascii-cursor) | Células de glifos aparecem por onde o cursor passa e desaparecem depois. | Playground visual em docs. Sem benefício para navegação de produção. |
| [Celebration Cursor](https://pro.reactbits.dev/docs/components/celebration-cursor) | Emite partículas de papel e cria uma explosão maior ao clique. | Marco de demonstração optativa. O resultado de Pix usa status explícito. |
| [Chroma Halo](https://pro.reactbits.dev/docs/components/chroma-halo) | Injeta cor difusa que se expande como tinta ou fumaça atrás do ponteiro. | Capa interativa de campanha com versão estática. |
| [Cursor Wave](https://pro.reactbits.dev/docs/components/cursor-wave) | A proximidade do ponteiro distorce uma malha de formas e propaga a onda. | Visual de demonstração fora do painel. |
| [Custom Cursor](https://pro.reactbits.dev/docs/components/custom-cursor) | Um ponto e um anel adaptam posição e forma aos alvos sob hover. | Tour de protótipo. Mantenha o cursor do sistema em inputs, tabelas e menus. |
| [Dither Cursor](https://pro.reactbits.dev/docs/components/dither-cursor) | Um rastro com limiar por célula forma uma textura pixelada ao redor do ponteiro. | Peça retro para material público, sem sobrepor controles. |
| [Drafting Cursor](https://pro.reactbits.dev/docs/components/drafting-cursor) | Exibe réguas e eixos e mede distância por arraste, com coordenadas rotuladas. | Ferramenta de design interna, fora da rotina financeira. |
| [Glass Cursor](https://pro.reactbits.dev/docs/components/glass-cursor) | Uma lente acompanha o cursor e refrata a imagem que passa sob ela. | Demonstração de material. Para anexos, use zoom explícito e legível. |
| [Glyph Stream](https://pro.reactbits.dev/docs/components/glyph-stream) | Uma corrente de células com caracteres segue o ponteiro e se espalha com o clique. | Arte de marca separada, sem efeito sobre a área de leitura. |
| [Grid Rise](https://pro.reactbits.dev/docs/components/grid-rise) | Peças em grade se elevam em sequência abaixo do ponteiro. | Vitrine interativa de produto. Evite alterar a aparência dos alvos operacionais. |
| [Gyroscope Cursor](https://pro.reactbits.dev/docs/components/gyroscope-cursor) | Uma seta gira para acompanhar a direção e pode mostrar etiqueta e pulso de clique. | Visual de colaboração numa demo. Use cursor convencional em controles reais. |
| [Liquid Ascii](https://pro.reactbits.dev/docs/components/liquid-ascii) | Uma simulação líquida é amostrada em caracteres que mudam conforme a perturbação. | Playground técnico. O custo de atualização contínua não melhora operações. |
| [Parallax Pills](https://pro.reactbits.dev/docs/components/parallax-pills) | Cápsulas decorativas se deslocam em planos diferentes e retornam com elasticidade. | Mosaico de recursos de uma campanha. Filtros ativos ficam parados no painel. |
| [Pigment Trail](https://pro.reactbits.dev/docs/components/pigment-trail) | Um pincel virtual deposita e mistura duas cores no trajeto do cursor. | Ferramenta artística de campanha, sem aplicação em formulários. |
| [Pixel Magnet](https://pro.reactbits.dev/docs/components/pixel-magnet) | Pixels formam um enxame que segue o ponteiro com atraso e dispersão. | Vitrine de shaders. O painel preserva foco e fundo imóveis. |
| [Ribbon Trail](https://pro.reactbits.dev/docs/components/ribbon-trail) | Uma fita de duas faces ondula e se torce ao seguir o ponteiro. | Demo de arte em movimento com alternativa estática. |
| [Smooth Cursor](https://pro.reactbits.dev/docs/components/smooth-cursor) | Uma sequência de pontos com resposta de mola suaviza a trajetória do cursor. | Visualização interativa pública. O cursor operacional precisa responder sem atraso aparente. |
| [Snapshot Trail](https://pro.reactbits.dev/docs/components/snapshot-trail) | Fotos são carimbadas, inclinadas e lançadas ao longo do movimento. | Galeria de imagens licenciadas em campanha. Evite usar anexos ou dados de clientes. |
| [Stardust Cursor](https://pro.reactbits.dev/docs/components/stardust-cursor) | Poeira luminosa acompanha uma esteira fluida e cresce numa nuvem ao clique. | Efeito de vinheta isolado. Sem papel em feedback de estado financeiro. |
| [User Cursor](https://pro.reactbits.dev/docs/components/user-cursor) | Um ponteiro renderizado carrega etiqueta com nome e cor configurável. | Referência para presença se houver edição colaborativa real. Identidade e posição viriam do estado compartilhado. |

### 3D e shaders Pro

As cenas 3D usam perspectiva, filtros ou desenho procedural para tratar mídia. Avalie fontes, interação e custo antes de usá-las em material público. Para detalhes transacionais e comprovantes, o valor principal está em preservar o contexto e a leitura.

| Componente | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| [Agentic Ball](https://pro.reactbits.dev/docs/components/agentic-ball) | Uma esfera reflexiva abriga um movimento lento de material e luz. | Ilustração de agente em campanha. Um status real pede rótulo e indicador simples. |
| [AI Blob](https://pro.reactbits.dev/docs/components/ai-blob) | Um orbe vítreo altera sua resposta visual entre ouvir, processar e falar. | Referência para eventual suporte por voz, com rótulos de estado independentes do efeito. |
| [Album Rail](https://pro.reactbits.dev/docs/components/album-rail) | Capas em leque exibem um disco parcialmente inserido e mudam foco ao navegar. | Galeria editorial de mídia. Sem papel na consulta de anexos financeiros. |
| [Bend Gallery](https://pro.reactbits.dev/docs/components/bend-gallery) | Uma coluna de imagens muda a curvatura conforme avança na rolagem. | Portfólio público de casos, com lista plana equivalente. |
| [Chrome Orbit](https://pro.reactbits.dev/docs/components/chrome-orbit) | Anéis cromados giram em diferentes eixos e se alinham em halo após clique. | Vinheta institucional. Evite sinal de espera sempre em movimento. |
| [Circle Stack](https://pro.reactbits.dev/docs/components/circle-stack) | Discos sobrepostos em perspectiva mudam de ordem para mostrar a próxima imagem. | Vitrine de material ilustrativo. A ordem do extrato segue a consulta selecionada. |
| [Concave Carousel](https://pro.reactbits.dev/docs/components/concave-carousel) | Imagens formam uma parede côncava e a imagem central ganha legenda e ação. | Vitrine de guias com acesso por lista. Use cards planos em seleção operacional. |
| [Constellation Gallery](https://pro.reactbits.dev/docs/components/constellation-gallery) | Reposiciona fotos ao interpolar entre anel, espiral e globo, com abertura individual. | Galeria de marca com coleção pequena e fallback estático. |
| [Contact Sheet](https://pro.reactbits.dev/docs/components/contact-sheet) | Imagens surgem do centro e ganham definição como impressões que se revelam. | Mosaico de casos públicos. Para anexos, use miniaturas com skeleton e nomes sempre legíveis. |
| [Depth Card](https://pro.reactbits.dev/docs/components/depth-card) | As camadas têm diferentes deslocamentos e inclinações para criar profundidade conforme o cursor. | Cartão de apresentação. Números, botões e links do painel permanecem alinhados. |
| [Depth Image](https://pro.reactbits.dev/docs/components/depth-image) | Varia a iluminação de uma foto seguindo o ponteiro e o relevo usado na composição. | Vitrine fotográfica de produto, com comprovantes exibidos na forma original. |
| [Depth Ribbon](https://pro.reactbits.dev/docs/components/depth-ribbon) | Fotos se repetem numa trilha que curva em três dimensões e se aproxima do observador. | Galeria artística de campanha. Sem encaixe em operações frequentes. |
| [Device](https://pro.reactbits.dev/docs/components/device) | Um telefone 3D com iluminação de estúdio recebe uma imagem ou conteúdo na tela. | Mostrar o painel mobile com dados fictícios numa apresentação pública. |
| [Dolly Gallery](https://pro.reactbits.dev/docs/components/dolly-gallery) | Imagens são dispostas a diferentes distâncias, e o scroll muda a câmera entre elas. | Tour visual externo, com alternativa linear para movimento reduzido. |
| [Elastic Reel](https://pro.reactbits.dev/docs/components/elastic-reel) | Fatias verticais de fotos se alargam com resposta elástica até revelar um quadro inteiro. | Catálogo de material público. A expansão útil no admin é uma prévia plana. |
| [Elastic Sticker](https://pro.reactbits.dev/docs/components/elastic-sticker) | Uma imagem recortada dobra ao descolar por gesto e pode voltar à posição. | Interação ilustrativa de marca. Em botões, preserve área de toque previsível. |
| [Ember Reveal](https://pro.reactbits.dev/docs/components/ember-reveal) | Uma abertura crescente com borda incandescente revela a próxima textura. | Troca dramática em mídia de campanha. Use fade local para dados. |
| [Expanding Grid](https://pro.reactbits.dev/docs/components/expanding-grid) | Aproxima o retrato sob o cursor e reorganiza o foco na grade de imagens. | Página institucional de equipe. No admin, nomes e permissões ficam disponíveis em linhas. |
| [Frame Border](https://pro.reactbits.dev/docs/components/frame-border) | Um gradiente de luz percorre o perímetro de uma moldura. | Destaque de mockup público. O foco operacional usa contorno fixo e sem brilho. |
| [Glass Reveal](https://pro.reactbits.dev/docs/components/glass-reveal) | Uma lente translúcida revela partes de uma imagem colorida através de outra camada. | Comparativo artístico em página pública. Em documentos, zoom legível é mais apropriado. |
| [Globe](https://pro.reactbits.dev/docs/components/globe) | Exibe um globo de pontos com arcos que marcam ligações em movimento. | Diagrama público de cobertura verificada. O efeito sozinho não indica disponibilidade do provedor. |
| [Gradient Blob](https://pro.reactbits.dev/docs/components/gradient-blob) | A posição do cursor deforma uma mancha de gradiente e modifica sua silhueta. | Cenário abstrato de uma página pública. |
| [Helix Gallery](https://pro.reactbits.dev/docs/components/helix-gallery) | As imagens percorrem uma espiral que sai de um núcleo e oferece foco individual. | Vitrine de cases. Consulte comprovantes por filtro e referência. |
| [Infinite Gallery](https://pro.reactbits.dev/docs/components/infinite-gallery) | Um campo 3D repete imagens em profundidade enquanto a câmera se move. | Tour de mídia separado, com fallback estático e acesso direto. |
| [Inverted Dome](https://pro.reactbits.dev/docs/components/inverted-dome) | Uma superfície curvada para dentro recebe uma grade que gira sob arraste. | Galeria de ativos visuais pública. Layout plano facilita examinar documentos. |
| [Iris Gallery](https://pro.reactbits.dev/docs/components/iris-gallery) | Cartões em oval convergem como lâminas de uma íris antes de abrir um item. | Exposição fotográfica. No Slopay, aproveite só a ideia de destacar uma seleção. |
| [Lenticular Carousel](https://pro.reactbits.dev/docs/components/lenticular-carousel) | As faces dos cartões mudam conforme giram, simulando uma impressão lenticular. | Tour de antes e depois com exemplos fictícios. Evite esconder status atrás de giros. |
| [Momentum Ring](https://pro.reactbits.dev/docs/components/vertical-reel) | Um anel gira com desfoque de movimento e encaixa uma foto no foco, com ação por clique ou Enter. | Galeria pública com seleção explícita. Evite inércia no seletor de contas. |
| [Page Flip](https://pro.reactbits.dev/docs/components/page-flip) | Folhas com frente e verso curvam durante o arraste e passam como páginas. | Manual ilustrativo ou publicação. A ajuda do gateway ganha busca e navegação linear. |
| [Parallax Carousel](https://pro.reactbits.dev/docs/components/parallax-carousel) | O arraste muda slides e a imagem interna se desloca em outra proporção. | Tour opcional de recursos. Uma versão plana facilita acesso em toque e teclado. |
| [Particle Image](https://pro.reactbits.dev/docs/components/particle-image) | Amostra cor da imagem e distribui partículas que se afastam e recompõem o retrato. | Vinheta de marca. Para anexos, mantenha visualização fiel ao original. |
| [Particle Morph](https://pro.reactbits.dev/docs/components/particle-morph) | Uma matriz pontilhada interpola as formas e posições entre imagens. | Animação de caso público. A alteração de dados exige leitura imediata. |
| [Passage Gallery](https://pro.reactbits.dev/docs/components/passage-gallery) | Fotos ficam nas paredes de um túnel e a câmera se desloca entre elas. | Galeria editorial separada. Sem função para extrato ou cadastro. |
| [Pixel Reveal](https://pro.reactbits.dev/docs/components/pixel-reveal) | Uma varredura por células substitui partes de um quadro pela imagem final. | Reveal de capa pública. No carregamento de documentos, use quadro fixo e fade. |
| [Pixel Sculpt](https://pro.reactbits.dev/docs/components/pixel-sculpt) | Converte amostras da imagem em blocos com profundidade e deforma a grade perto do cursor. | Experimento de visualização de marca. A imagem operacional precisa ficar intacta. |
| [Pixelate Hover](https://pro.reactbits.dev/docs/components/pixelate-hover) | Reduz ou restaura a resolução aparente da imagem conforme a interação. | Vitrine de foto pública. A máscara de privacidade remove a exposição do dado desde a origem. |
| [Pond Image](https://pro.reactbits.dev/docs/components/pond-image) | Deforma a textura fotográfica por ondulações que dissipam após a interação. | Capa artística com foto. Evite distorcer QR Codes e imagens de documentos. |
| [Portal](https://pro.reactbits.dev/docs/components/portal) | Um feixe em profundidade acelera com clique, simulando passagem por um portal. | Vinheta voluntária de campanha. No gateway, preserve navegação instantânea. |
| [Prism Carousel](https://pro.reactbits.dev/docs/components/prism-carousel) | Um efeito de passagem cromática acompanha a troca de capas em perspectiva. | Galeria de cases com contraste controlado. Em estados operacionais, cor comunica significado fixo. |
| [Rotating Cards](https://pro.reactbits.dev/docs/components/rotating-cards) | Cards com conteúdo configurável giram num anel 3D sob arraste. | Exposição de recursos em landing, com links também disponíveis fora do gesto. |
| [Scroll Bend](https://pro.reactbits.dev/docs/components/scroll-bend) | A velocidade da rolagem altera a curvatura e largura visual de uma faixa de imagens. | Portfólio visual. O extrato precisa manter geometria estável enquanto rola. |
| [Scroll Portal](https://pro.reactbits.dev/docs/components/scroll-portal) | Cenas aninhadas crescem conforme o scroll aproxima a próxima moldura. | Tour em capítulos com alternativa estática. Sem papel numa revisão Pix. |
| [Shader Card](https://pro.reactbits.dev/docs/components/shader-card) | Renderiza uma chama luminosa atrás da superfície de um card. | Destaque público de um recurso. No painel, priorize contraste e leitura contínua. |
| [Shader Reveal](https://pro.reactbits.dev/docs/components/shader-reveal) | O rastro do cursor distorce a camada frontal e mostra parte da imagem de trás. | Comparação visual de campanha. Use controle explícito para qualquer documento real. |
| [Spin Shutter](https://pro.reactbits.dev/docs/components/spin-shutter) | Fotos giram numa órbita e mudam abertura e foco conforme a posição do ponteiro. | Vitrine de fotos da marca, com seleção por controle alternativo. |
| [Star Burst](https://pro.reactbits.dev/docs/components/star-burst) | Pontos luminosos se projetam do centro em linhas de fuga. | Vinheta comemorativa pública. No painel, use confirmação breve e textual. |
| [Tumble Carousel](https://pro.reactbits.dev/docs/components/tumble-carousel) | Cada cartão gira por cima de outro durante o avanço. | Carrossel editorial com poucas peças. O estado financeiro não muda por giro ou gesto decorativo. |
| [Twisting Gallery](https://pro.reactbits.dev/docs/components/twisting-gallery) | A rolagem deforma e inclina as imagens durante a passagem pela coluna. | Galeria de material de marketing. Evite no visualizador de anexos. |
| [Warped Card](https://pro.reactbits.dev/docs/components/warped-card) | Deforma o plano da imagem localmente como uma saliência sob o ponteiro. | Peça interativa de campanha. Use feedback discreto de foco em cards clicáveis reais. |

### Fundos Pro

Estes efeitos servem a composição visual de página pública, arte de campanha ou demonstração isolada. A coluna de encaixe considera uma eventual superfície desse tipo no Slopay.

| Componente | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| [ASCII Tiles](https://pro.reactbits.dev/docs/components/ascii-tiles) | Forma ladrilhos luminosos a partir de células de caracteres e reflexos sobrepostos. | Capa técnica de documentação, atrás de um bloco de texto sólido. |
| [Ascii Waves](https://pro.reactbits.dev/docs/components/ascii-waves) | Amostra ondas de intensidade numa escala de caracteres ASCII, criando uma malha em fluxo. | Arte editorial sobre API, com exemplos reais separados e copiáveis. |
| [Astral Shell](https://pro.reactbits.dev/docs/components/astral-shell) | Une estrelas numa esfera que gira, com nós iluminados e pulsos quando acionados. | Representação abstrata de integrações em um hero público. |
| [Aura Blob](https://pro.reactbits.dev/docs/components/aura-blob) | Uma massa central ganha camadas de aura com rotações e fases diferentes. | Fundo de peça institucional com texto em zona de contraste fixo. |
| [Aurora Beam](https://pro.reactbits.dev/docs/components/aurora-beam) | Faixas de aurora atravessam o quadro em velocidade ajustável. | Banner amplo de campanha com pôster estático. |
| [Aurora Blur](https://pro.reactbits.dev/docs/components/aurora-blur) | Difunde bandas de luz em manchas suaves que mudam de posição. | Apoio visual de uma capa pública. Mantenha ações em superfície sólida. |
| [Axial Beam](https://pro.reactbits.dev/docs/components/axial-beam) | Raios de várias intensidades surgem de uma origem fora do quadro e se espalham. | Iluminação de mockup em um hero, longe de labels. |
| [Binary Orbits](https://pro.reactbits.dev/docs/components/binary-orbits) | Estrelas se deslocam por braços de uma galáxia inclinada, com cores distintas no núcleo e na borda. | Visual de rede em lançamento, com conexões reais explicadas por texto. |
| [Black Hole](https://pro.reactbits.dev/docs/components/black-hole) | Luz e fumaça se curvam ao redor de um centro escuro, desenhando um anel luminoso. | Arte conceitual de campanha. A direção do movimento pode ser congelada. |
| [Blinking Dots](https://pro.reactbits.dev/docs/components/blinking-dots) | Um campo de pontos liga e desliga em cadências locais. | Textura pública de baixa intensidade. Evite pulsos recorrentes perto de avisos. |
| [Blinking Squares](https://pro.reactbits.dev/docs/components/blinking-squares) | Quadrados cintilam numa grade cuja densidade decai a partir da borda escolhida. | Vinheta lateral de documentação, com versão estática. |
| [Blurred Rays](https://pro.reactbits.dev/docs/components/blurred-rays) | Colunas difusas de luz variam em intensidade e transição de cor. | Fundo de um mockup de produto. Limite a área de maior brilho. |
| [Chroma Blinds](https://pro.reactbits.dev/docs/components/chroma-blinds) | Listras diagonais coloridas se curvam em resposta ao cursor. | Peça de marca geométrica em landing, fora do fluxo Pix. |
| [Chroma Current](https://pro.reactbits.dev/docs/components/chroma-current) | Correntes coloridas cruzam a matriz e acendem pontos por onde passam. | Ilustração de troca de eventos entre integrações, sem sinalizar tráfego real. |
| [Chroma Waves](https://pro.reactbits.dev/docs/components/chroma-waves) | Ondas macias se sobrepõem com deslocamento cromático nas bordas. | Fundo público de apresentação, com leitura em plano independente. |
| [Cloud Atlas](https://pro.reactbits.dev/docs/components/cloud-atlas) | Nuvens ganham volume e cor entre regiões iluminadas e densas e cedem à interação. | Fundo atmosférico de um tour institucional, com imagem estática. |
| [Color Loops](https://pro.reactbits.dev/docs/components/color-loops) | Anéis concêntricos avançam do centro e interpolam cores ao longo do ciclo. | Peça abstrata de identidade para lançamento, afastada de cifras. |
| [Concentric Tides](https://pro.reactbits.dev/docs/components/concentric-tides) | Arcos finos convergem numa região iluminada, formando uma ampulheta visual. | Ilustração de tempo em campanha, sem representar uma espera medida. |
| [Contour Tide](https://pro.reactbits.dev/docs/components/contour-tide) | Pontos ondulam em conjunto e ganham cor de espuma nas cristas. | Fundo amplo de landing com um recorte de mídia. |
| [Dappled Light](https://pro.reactbits.dev/docs/components/dappled-light) | Silhuetas de folhas se movem e projetam sombras e luz como sol filtrado. | Fundo acolhedor em página institucional de equipe ou contato. |
| [Dither Wave](https://pro.reactbits.dev/docs/components/dither-wave) | Ondas são quantizadas numa trama de pixels para simular impressão retro. | Arte de guia técnico ou evento, com versão parada. |
| [Dot Shift](https://pro.reactbits.dev/docs/components/dot-shift) | Pontos de uma malha mudam posição e intensidade com andamento ajustável. | Textura de apresentação de infraestrutura, sem fundo pulsante no painel. |
| [Eclipse](https://pro.reactbits.dev/docs/components/eclipse) | Uma forma encobre parte de uma coroa de luz que troca de cor ao redor do contorno. | Hero institucional sobre fundo escuro. Separe efeito do texto. |
| [Fading Stars](https://pro.reactbits.dev/docs/components/fading-stars) | Cada estrela sobe com uma cauda cuja cor e opacidade diminuem. | Vinheta pública de fundo, com baixa densidade. |
| [Falling Rays](https://pro.reactbits.dev/docs/components/falling-rays) | Pulsos viajam por raios em leque e atravessam o plano para baixo. | Capa de apresentação técnica, sem usar como andamento. |
| [Flame Paths](https://pro.reactbits.dev/docs/components/flame-paths) | Línguas coloridas crescem, inclinam e se dissipam com rajadas. | Efeito de campanha pontual. Não usar como alerta ou sucesso operacional. |
| [Fog Sphere](https://pro.reactbits.dev/docs/components/fog-sphere) | Uma esfera de densidade variável contém um campo de névoa que gira e se mistura. | Apoio visual de uma página pública de produto. |
| [Glass Flow](https://pro.reactbits.dev/docs/components/glass-flow) | Um padrão de aletas refrata e arrasta a leitura de uma imagem ou vídeo. | Tratamento de mídia de campanha. Mantenha screenshots informativos sem refração. |
| [Glass Tiles](https://pro.reactbits.dev/docs/components/glass-tiles) | Ladrilhos translúcidos variam brilho e cor como peças de vidro. | Vitrine de material gráfico. O painel usa superfícies opacas. |
| [Glimmer Wrap](https://pro.reactbits.dev/docs/components/glimmer-wrap) | Pequenos reflexos passam pela superfície e acendem ao cruzar ângulos de luz. | Textura pública para peça de marca, com luminância controlada. |
| [Glitter Warp](https://pro.reactbits.dev/docs/components/glitter-warp) | Pontos luminosos avançam por um túnel e deixam a sensação de aceleração. | Transição de filme promocional optativo. Pouco adequado a um fundo de uso contínuo. |
| [Glowing Ridges](https://pro.reactbits.dev/docs/components/glowing-ridges) | Camadas coloridas formam saliências com reflexo iridescente em movimento. | Arte abstrata para anúncio, como pôster ou mídia isolada. |
| [Glowing Wave](https://pro.reactbits.dev/docs/components/glowing-wave) | Uma frente de luz percorre a superfície com velocidade ajustável. | Vinheta de transição para evento público. Use barra mensurável em importação. |
| [Glue Dots](https://pro.reactbits.dev/docs/components/glue-dots) | Pontos próximos formam pontes visuais que esticam até se desfazer. | Ilustração lúdica de conexão numa demo. |
| [Glyph Ember](https://pro.reactbits.dev/docs/components/glyph-ember) | Um campo ASCII varia densidade e cor para desenhar chamas sobre brasas. | Arte retro de evento técnico, fora da leitura operacional. |
| [Glyph Orb](https://pro.reactbits.dev/docs/components/glyph-orb) | Faixas de glifos mudam com rotação e luz para formar um planeta. | Mockup público de marca ou conteúdo espacial. |
| [Glyph Sonar](https://pro.reactbits.dev/docs/components/glyph-sonar) | Pulsos cruzam o campo e realçam aglomerados de glifos quando os alcançam. | Ilustração de monitoramento, acompanhada por indicadores reais em outro plano. |
| [Glyph Tide](https://pro.reactbits.dev/docs/components/glyph-tide) | Uma linha de glifos avança e recua como maré, distinguindo espuma e água. | Capa editorial com tema de fluxo, sem sugerir mudanças de saldo. |
| [Gradient Bars](https://pro.reactbits.dev/docs/components/gradient-bars) | Colunas recebem gradientes que mudam de fase e altura aparente. | Arte gráfica em material público. Gráficos reais usam alturas ligadas aos dados. |
| [Grain Wave](https://pro.reactbits.dev/docs/components/grain-wave) | Uma fita de cor com grão ondula sobre plano escuro. | Textura de capa de guia, que pode ser usada parada. |
| [Halftone Vortex](https://pro.reactbits.dev/docs/components/halftone-vortex) | Pontos de retícula variam tamanho e cor ao girar em torno de um centro. | Fundo impresso de campanha, com área de texto livre. |
| [Halftone Wave](https://pro.reactbits.dev/docs/components/halftone-wave) | Uma trama de pontos oscila com ruído suave e contraste variável. | Ilustração pública de baixa intensidade. Evite sob legendas de gráficos. |
| [Hexagonal Vault](https://pro.reactbits.dev/docs/components/hexagonal-vault) | Células hexagonais ganham luz perto do cursor e esfriam depois que ele passa. | Vitrine de infraestrutura. Use só como decoração em região isolada. |
| [Horizon Bloom](https://pro.reactbits.dev/docs/components/horizon-bloom) | Um halo se abre por trás de uma curva escura, combinando luz quente e atmosfera. | Hero público de lançamento com texto estável em primeiro plano. |
| [Interference Ribbons](https://pro.reactbits.dev/docs/components/interference-ribbons) | Fios muito finos torcem juntos e formam um padrão de cor e interferência. | Fundo técnico de marca, com fallback estático. |
| [Landscape](https://pro.reactbits.dev/docs/components/landscape) | O ponto de vista avança por uma paisagem que se repete no horizonte. | Tour visual público. O deslocamento contínuo torna inadequado ao painel. |
| [Light Droplets](https://pro.reactbits.dev/docs/components/light-droplets) | Filetes com brilho e comprimento variável caem como chuva. | Fundo de uma vinheta institucional curta. |
| [Lightspeed](https://pro.reactbits.dev/docs/components/lightspeed) | Estrelas se alongam em linhas à medida que o movimento aparente acelera. | Corte de vídeo de apresentação, com alternativa sem zoom. |
| [Liquid Bars](https://pro.reactbits.dev/docs/components/liquid-bars) | Barras brilhantes mudam curvas e reflexos em ondas encadeadas. | Arte abstrata de campanha. Reserve as séries do painel a dados medidos. |
| [Liquid Lines](https://pro.reactbits.dev/docs/components/liquid-lines) | Filetes de luz se deformam como correntes líquidas. | Ilustração de fluxo num hero público. |
| [Long Exposure](https://pro.reactbits.dev/docs/components/long-exposure) | Trilhas coloridas avançam em perspectiva como faróis numa fotografia noturna. | Vídeo curto sobre operação contínua, fora do produto. |
| [Luminous Filaments](https://pro.reactbits.dev/docs/components/luminous-filaments) | Fibras saem de uma origem comum e dispersam luminosidade em leque. | Elemento de fundo de integração na landing. |
| [Metallic Swirl](https://pro.reactbits.dev/docs/components/metallic-swirl) | Reflexos cromados seguem curvas de um redemoinho líquido. | Demo de material ou campanha, sem sobrepor dados. |
| [Minimal Ripple](https://pro.reactbits.dev/docs/components/minimal-ripple) | Ondas concêntricas surgem no centro e avançam a uma velocidade ajustável. | Sinal visual de conexão num mockup. Para evento do painel, use pulso único localizado. |
| [Mosaic](https://pro.reactbits.dev/docs/components/mosaic) | Aplica uma grade de ladrilhos sobre um campo em movimento ou vídeo. | Tratamento editorial de mídia pública, com material autorizado. |
| [Mosaic Waves](https://pro.reactbits.dev/docs/components/mosaic-waves) | Ondas atravessam um mosaico e alteram o deslocamento e o brilho das peças. | Fundo de campanha geométrica, sem deformar uma tabela ou QR. |
| [Neon Reveal](https://pro.reactbits.dev/docs/components/neon-reveal) | Uma linha neon acende e espalha luz para revelar o conteúdo seguinte. | Abertura pública de uma peça audiovisual. O gateway mantém foco sem neon. |
| [Neural Flash](https://pro.reactbits.dev/docs/components/neural-flash) | Vários filamentos luminosos disparam e se cruzam em uma sequência de pulsos. | Cenário de campanha de tecnologia, com variante sem pulsos. |
| [Neural Float](https://pro.reactbits.dev/docs/components/neural-float) | Fios difusos se deslocam lentamente e mudam de cor ao longo do comprimento. | Fundo de um mockup público, sem significado de atividade. |
| [Neural Tunnel](https://pro.reactbits.dev/docs/components/neural-tunnel) | Camadas de formas giroides desenham um túnel que pulsa em profundidade. | Experimento de shader. Sem ganho em telas de processamento. |
| [Nexus Rays](https://pro.reactbits.dev/docs/components/nexus-rays) | Raios de intensidades diferentes irradiam de um ponto central luminoso. | Fundo de anúncio de uma integração, com ilustração isolada. |
| [Perspective Grid](https://pro.reactbits.dev/docs/components/perspective-grid) | Uma grade regular avança em perspectiva até o horizonte. | Capa retrô de material técnico, com imagem parada como opção. |
| [Photon Knot](https://pro.reactbits.dev/docs/components/photon-knot) | Uma faixa luminosa translúcida gira em torno de si mesma e forma um nó. | Vinheta de marca sobre conexão, em área dedicada. |
| [Pixel Rain](https://pro.reactbits.dev/docs/components/pixel-rain) | Traços pixelados caem de maneira assíncrona por colunas. | Fundo retro discreto de página pública, sem manter o painel em movimento. |
| [Prismatic Slats](https://pro.reactbits.dev/docs/components/prismatic-slats) | Líquido colorido se deforma atrás de lâminas que refratam a superfície. | Vitrine de material gráfico. As superfícies do painel seguem o tema opaco. |
| [Radial Liquid](https://pro.reactbits.dev/docs/components/radial-liquid) | Uma deformação líquida se propaga em anéis para fora do ponto central. | Capa visual de campanha. Evite ondulação em dado ou documento real. |
| [Ravine](https://pro.reactbits.dev/docs/components/ravine) | A câmera percorre o fundo de um cânion gerado, com velocidade ajustável. | Cena de apresentação, com alternativa imóvel por sensibilidade a movimento. |
| [Retro Lines](https://pro.reactbits.dev/docs/components/retro-lines) | Faixas onduladas se estreitam ao se aproximar do horizonte em perspectiva. | Arte retrô de lançamento. Em gráficos, reserve linhas para guias e séries. |
| [Ring Field](https://pro.reactbits.dev/docs/components/ring-field) | Partículas formam círculos deformados que se afastam do centro escuro. | Fundo público de um hero sobre conectividade. |
| [Rising Lines](https://pro.reactbits.dev/docs/components/rising-lines) | Linhas sobem com cabeça luminosa e cauda mais difusa, a partir do horizonte. | Vinheta de campanha com ritmo lento. Progresso de lote exige medida real. |
| [Rising Particles](https://pro.reactbits.dev/docs/components/rising-particles) | Motas luminosas flutuam para cima com velocidade configurável. | Efeito de abertura de vídeo público, sem uso diário. |
| [Rolling Blinds](https://pro.reactbits.dev/docs/components/rolling-blinds) | Aletas verticais de luz se deslocam, podendo se abrir em leque. | Moldura de lançamento, sem efeito em controles. |
| [Rotating Stars](https://pro.reactbits.dev/docs/components/rotating-stars) | Rastros de estrelas circulam em torno de um centro ajustável. | Pôster animado ou demonstração externa. Sem função em operações. |
| [Rubber Fluid](https://pro.reactbits.dev/docs/components/rubber-fluid) | Dobras com reflexo e sombra se movem como material elástico brilhante. | Arte de campanha temática, com fallback estático. |
| [Satin Ridges](https://pro.reactbits.dev/docs/components/satin-ridges) | Cristas de tecido mudam orientação e recebem um realce de luz suave. | Fundo discreto em uma página pública de marca. |
| [Shader Waves](https://pro.reactbits.dev/docs/components/shader-waves) | Campo de cor se desloca em ondas suaves e contínuas. | Hero público com gradiente controlado e área de leitura sólida. |
| [Shadow Bars](https://pro.reactbits.dev/docs/components/shadow-bars) | Uma sequência de colunas varia luz e sombra ao longo do tempo. | Acento em cenário institucional com contraste medido. |
| [Silk Waves](https://pro.reactbits.dev/docs/components/silk-waves) | Ondas fazem uma superfície parecer tecido drapeado em movimento. | Vídeo ou textura de apoio a campanha, com opção de pôster. |
| [Simple Swirl](https://pro.reactbits.dev/docs/components/simple-swirl) | Redemoinho luminoso gira e conserva parte da inércia do gesto. | Experimento público de interação, longe de alvos operacionais. |
| [Specter Orb](https://pro.reactbits.dev/docs/components/specter-orb) | Uma esfera ganha um envoltório de fumaça que se desloca e desvanece. | Vinheta de marca ou tema de voz. Status real permanece textual. |
| [Spectral Clouds](https://pro.reactbits.dev/docs/components/spectral-clouds) | Nuvens suaves mudam de forma e recebem gradações espectrais. | Fundo editorial público, com variante sem movimento. |
| [Spectral Drape](https://pro.reactbits.dev/docs/components/spectral-drape) | Pontos iluminados ocupam uma superfície que se dobra em profundidade. | Material visual de infraestrutura. Evite atrapalhar leitura de tabelas. |
| [Spiral Funnel](https://pro.reactbits.dev/docs/components/spiral-funnel) | Fios luminosos sobem num funil giratório e mudam de cor com a altura. | Cena de apresentação técnica, sem uso como loader. |
| [Square Matrix](https://pro.reactbits.dev/docs/components/square-matrix) | Luz se propaga em ondas numa matriz de LEDs que varia intensidade e cor. | Visual de campanha para conectividade. Para estado real, use um indicador simples. |
| [Squares Terminal](https://pro.reactbits.dev/docs/components/squares-terminal) | Células quadradas piscam numa malha com densidade configurável. | Fundo retrô de documentação pública, com alternativa estática. |
| [Squircle Shift](https://pro.reactbits.dev/docs/components/squircle-shift) | Formas entre círculo e quadrado mudam de contorno e brilho em grade. | Arte geométrica de landing. O painel usa formas de controles consistentes. |
| [Star Swipe](https://pro.reactbits.dev/docs/components/star-swipe) | Traços luminosos atravessam o quadro, alongando-se como entrada em velocidade. | Transição de uma peça de vídeo, sem animar a troca de rota operacional. |
| [Swirl Blend](https://pro.reactbits.dev/docs/components/swirl-blend) | Duas cores se mesclam em espirais com brilho e profundidade variáveis. | Textura de marca isolada em landing. |
| [Synaptic Shift](https://pro.reactbits.dev/docs/components/synaptic-shift) | Filamentos acendem em pulsos e mudam posição como sinapses ilustrativas. | Visualização conceitual para campanha. Não usar como sinal de telemetria. |
| [Tech Wall](https://pro.reactbits.dev/docs/components/tech-wall) | Uma luz móvel percorre uma parede de painéis e realça partes da grade. | Hero técnico de uma integração. Realces de estado permanecem locais no painel. |
| [Terminal Rain](https://pro.reactbits.dev/docs/components/terminal-rain) | Colunas de glifos caem em camadas com caracteres líderes mais brilhantes. | Demonstração retro para público técnico. O console real usa texto estático e pesquisável. |
| [Thinking Dots](https://pro.reactbits.dev/docs/components/thinking-dots) | Pontos aumentam temporariamente quando um campo difuso passa sobre eles. | Motivo decorativo em demo. Indicador de espera no painel usa estado e texto próprios. |
| [Twilight Lines](https://pro.reactbits.dev/docs/components/twilight-lines) | Linhas suaves pulsam conforme uma faixa de luz quente atravessa o quadro. | Fundo discreto de capa pública, sem pulso sob dados. |
| [Vortex](https://pro.reactbits.dev/docs/components/vortex) | Partículas giram e dão a sensação de entrar num túnel sem fim. | Vinheta promocional optativa. Sem benefício em tela de carregamento. |
| [Voxel Arc](https://pro.reactbits.dev/docs/components/voxel-arc) | Uma malha curva de blocos sobe e desce como água vista de longe. | Ilustração abstrata de volume em campanha, distinta de gráfico real. |
| [Warp Twister](https://pro.reactbits.dev/docs/components/warp-twister) | Névoa e poeira seguem a torção de um tubo em profundidade. | Cena de vídeo de marca. Evite movimento contínuo na área de trabalho. |
| [Watercolor](https://pro.reactbits.dev/docs/components/watercolor) | Duas cores se misturam em manchas com transições difusas de aquarela. | Fundo de uma página pública com tom editorial, inclusive em imagem parada. |
| [Wireframe Ball](https://pro.reactbits.dev/docs/components/wireframe-ball) | Um poliedro aramado gira e recebe impulso do arraste, com forma base configurável. | Playground visual de desenvolvimento. O painel usa ícones ou ilustrações estáticas. |

### Blocos e ferramentas do React Bits

Os blocos Pro são composições completas. Consulte sua estrutura e os estados que demonstra, especialmente quando a mudança envolver uma tela inteira. As famílias de Application UI ligadas ao painel estão abaixo. [Application UI](https://pro.reactbits.dev/docs/app-ui) · [Blocos de marketing](https://pro.reactbits.dev/docs/blocks) · [Templates](https://pro.reactbits.dev/docs/templates)

| Família | O que reúne | Encaixe no Slopay |
| --- | --- | --- |
| App Shell, App Sidebar, Navbar e Mobile | Esqueletos de navegação, trilhos laterais, barras e arranjos responsivos. | Estudar como a navegação permanece ancorada e onde o menu móvel emerge. |
| Command Menu | Busca em overlay, agrupamento e seleção por teclado. | Busca global por navegação e referências, conforme permissões existentes. |
| Cards, Dashboard e Analytics | Indicadores, séries, composição de visões gerais e detalhe por métrica. | Visão geral e fluxo de caixa com Recharts e dados do gateway. |
| Data Table, List e Filtering | Coleções, seleção, paginação e mudança do recorte. | Extrato, lotes, contas e auditoria. Aproveite a relação entre filtro ativo e resultado. |
| File Manager | Lista, grade e ações sobre arquivos. | Anexos de cadastro e importação de lotes, com estado e validação visíveis. |
| Monitoring e Empty State | Saúde, disponibilidade, avisos e composição de vazios. | Status de webhooks, disponibilidade de dados e contas sem movimentações. |
| Settings Form e Forms | Seções, rótulos, validações e botões de salvamento. | Preferências, regras de aprovação e integrações. |
| App Dialog e Notifications | Modais, drawers, sheets, menus e mensagens. | Principal família Pro para detalhe de movimentação e confirmação de operações. Reuse o Radix local. |
| Onboarding, Wizard e Authentication | Entrada, verificação e passos de configuração. | Cadastro, MFA, revisão de saque e lotes, com controle explícito de cada etapa. |
| Paywall e Billing | Estados de acesso, cobrança, uso e planos. | Referência estrutural para taxas, limites e permissões, com regras do gateway. |
| Kanban, Comments e Scheduling | Colunas de trabalho, conversas em contexto e agendas. | Fila interna de revisão, justificativas e agendamentos somente se o fluxo exigir. |
| Integrations e Editor | Estados de conexão e edição de conteúdo. | Configuração de webhooks e exemplos de payload, com campos sensíveis protegidos. |
| Feedback, Support e Chat | Interações de atendimento, comunicação de resultado e formulários de avaliação. | Central de ajuda ou suporte, com notificações e estados acessíveis. |
| AI Chat e Prompt Input | Conversas e composição com referências e anexos. | Referência para uma futura função de suporte assistido, se definida. |
| Agent Activity, Tool Calls, Agent Approval, Agent Plan e AI Usage | Execução em passos, chamadas, autorizações e consumo. | Estudar timeline e estados de tarefa para importação, fila de análise e diagnóstico de integração. Decisões financeiras seguem as regras do gateway. |

Os **Page Blocks** organizam seções de aquisição e conteúdo, como hero, features, bento, prova social, navegação, autenticação, CTA, FAQ, pricing, comparação, estatísticas, 404, perfil, sobre, espera, showcase, como funciona, download, blog, ecommerce, contato e rodapé. Os **Templates** combinam essas seções em sites Next.js. O **Agent Kit** fornece instruções e receitas para compor páginas. São referências para uma eventual superfície pública. Para a área autenticada, os blocos de Application UI têm relação mais direta com a tarefa. [Page Blocks](https://pro.reactbits.dev/docs/blocks) · [React Bits Pro](https://pro.reactbits.dev/)

| Ferramenta gratuita | O que faz e como | Aplicação |
| --- | --- | --- |
| [Background Studio](https://reactbits.dev/tools/background-studio) | Ajusta presets de fundos no navegador e exporta código, imagem ou loop de vídeo. | Explorar uma versão estática de um fundo para campanha. |
| [Center Stage](https://reactbits.dev/tools/center-stage) | Coloca uma captura em mockup de telefone, notebook ou navegador, com câmera e luz configuráveis. | Vídeo ou imagem de apresentação do Slopay com dados fictícios. |
| [Shape Magic](https://reactbits.dev/tools/shape-magic) | Compõe marcas a partir de formas, texto ou SVG e aplica materiais antes de exportar. | Experimentar uma vinheta ou asset de identidade fora da UI operacional. |
| [Texture Lab](https://reactbits.dev/tools/texture-lab) | Combina filtros visuais sobre foto, vídeo ou câmera e exporta o tratamento. | Criar material de campanha a partir de imagens autorizadas. |
| [Sound Lab](https://reactbits.dev/tools/sound-lab) | Permite ouvir e ajustar timbre, duração e efeitos, com exportação de áudio. | Trilha de demo ou feedback de som optativo, quando previsto pelo produto. |

## Taste Skill

A skill orienta composição e revisão visual e traz demonstrações em HTML, CSS e JavaScript. O site 2.1.5 descreve um fluxo de levantamento, direção, implementação e revisão no navegador. Na 2.5.1, o acervo traz fragmentos, efeitos, cenas e pequenos controles. Para o gateway, aproveite inspeção em desktop e mobile, contraste consistente, dados alinhados e tratamento dos estados. O design do Slopay determina os tokens, a densidade e as prioridades de uso. [Site](https://www.tasteskill.dev/) · [Guia de briefing](https://www.tasteskill.dev/guide) · [Skill 2.5.1](https://github.com/Leonxlnx/taste-skill/blob/v2.5.1/skills/taste-skill/SKILL.md)

### Microinterações do Taste Skill

O demonstrador ativa as regras de CSS sob `data-motion`, acrescenta JS nos controles que precisam dele e mantém estados estáticos em movimento reduzido. O princípio aplicável ao Slopay é tratar resposta ao toque, foco, mudança de estado e carregamento como partes do mesmo sistema. [Demonstração e metadados](https://github.com/Leonxlnx/taste-skill/tree/v2.5.1/skills/taste-skill/assets/motion) · [Guia de movimento](https://github.com/Leonxlnx/taste-skill/blob/v2.5.1/skills/taste-skill/references/motion.md)

| Padrão | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| Botão e link com aparência de botão | Pequeno deslocamento no hover e resposta de pressão no acionamento, por transformação. | Botões do painel, com feedback de toque e foco no elemento atual. |
| Seta de ação | A haste e a ponta de um SVG se deslocam quando o link é acionável. | “Ver movimentação” e “Abrir comprovante”, com alvo fixo. |
| Sublinhado de link | O traço se estende no hover ou foco, mantendo a palavra parada. | Links de documentação ou de retorno, com indicação de link sempre identificável. |
| Navegação, página atual e menu | A linha desenha a seleção e o menu muda estado com transição curta. | Usar `aria-current` na sidebar, manter a indicação ativa fixa e mover só o painel do menu. |
| Abas | Um trilho ou indicador acompanha a seleção com deslocamento. | Período e visão de entradas ou saídas, mantendo os controles visíveis na troca. |
| Foco | Um anel acompanha o elemento focado sem deslocar seu layout. | Teclado no modal, filtros e tabela. O contorno deve aparecer de imediato. |
| Card e painel aberto | Pequena elevação no card acionável e resposta local no painel interno. | Detalhe e ação clicável. Saldos, tabelas e cards de leitura permanecem imóveis. |
| Zoom de mídia | A imagem aumenta um pouco dentro de uma moldura recortada. | Miniatura de tutorial ou anexo, com ação explícita para abrir. |
| Campos | Hover, foco e validação são diferenciados por borda e preenchimento. | Formulários de Pix, busca, segurança e dados de conta, com descrição de erro vinculada. |
| Switch | O polegar se desloca com o estado e o trilho muda de tom. | Densidade, privacidade e movimento, usando a preferência real. |
| Checkbox | O estado marcado recebe preenchimento e desenho do check. | Seleção em lote ou checklist, incluindo seleção parcial e rótulo fixo. |
| Contagem única | O atributo `data-m-count` aciona uma interpolação do número ao entrar. | Métrica ilustrativa ou não financeira. Para montante, preserve o valor exato com realce ao redor. |
| Loop de painel | Um painel escolhido repete uma demonstração e os outros seguram o quadro concluído. | Demo guiada de fluxo, separada do painel real. Estados do gateway mudam com eventos. |

### Fragmentos de UI do Taste Skill

Cada fragmento tem HTML demonstrativo e, quando necessário, um roteiro local de estados. As simulações ilustram a apresentação. As ações correspondentes no Slopay usam dados, permissões e eventos do produto. [Manifesto dos 19 fragmentos](https://github.com/Leonxlnx/taste-skill/blob/v2.5.1/skills/taste-skill/assets/ui/index.json)

| Fragmento | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| `window` | Monta uma janela de fila com navegação, contadores e linhas que mudam de estágio. | Fila de aprovações, pendências e revisões administrativas. Use texto de status persistente. |
| `chat` | Revela resposta em partes, com fontes vinculadas e campo de continuação. | Atendimento assistido, se previsto, preservando fontes e histórico de mensagens. |
| `cursor` | Encena uma aprovação com ponteiro animado, botão em espera e resultado de envio. | Inspiração para demonstrar a operação. Na interface real, o operador aciona o controle e a resposta vem do gateway. |
| `notify` | Uma notificação nova entra na pilha e a mais antiga cede espaço. | Área de notificações da topbar, com prioridade e contagem. Incidentes ativos mantêm mensagem própria. |
| `toggles` | Um switch alterna por vez, realçando a linha e atualizando a contagem correspondente. | Regras de aprovação e preferências. Vincule destaque e texto ao estado salvo. |
| `stat` | Barras animam entre períodos enquanto o número que resume o período permanece fixo. | Boa referência para a visão geral. Exiba a cifra oficial e anime somente o gráfico ou o delta. |
| `search` | Uma barra mostra consulta, resultados com correspondência destacada e seleção por atalhos. | Busca global ou por referência, com foco e correspondências legíveis. |
| `integrations` | Uma lista exibe a marca, função e estado de cada app e simula uma conexão. | Status da integração Efí ou endpoints de webhook com rótulos vindos da configuração real. |
| `slider` | Painel de propriedades com sliders, leitura de valor e controle segmentado. | Preferência não financeira com controle preciso por teclado. Use input numérico para valores de cobrança. |
| `voice` | Combina status, timer, orbe, legenda e controles de chamada. | Eventual suporte por voz, com controles rotulados e indicação de gravação. |
| `files` | Miniaturas passam por leitura e recebem um check quando o passo termina. | Validação de anexos ou lotes. Mostre arquivo, erro ou aceite individual conforme os dados. |
| `calendar` | Um intervalo é selecionado no calendário e eventos relacionados aparecem em uma lista abaixo. | Períodos de relatório, vencimentos ou agenda de aprovações, com data explícita. |
| `code` | Duas abas alternam exemplos e uma linha de código recebe realce e nota. | Ajuda sobre webhooks com exemplos fictícios, cópia e sintaxe legível. |
| `diff-review` | Exibe antes e depois, uma sugestão em contexto e a mudança de status após aplicar. | Comparação de permissões, regras ou dados de conta em auditoria, com ação autorizada e mudança explícita. |
| `terminal-run` | Linhas aparecem conforme os passos de uma execução, com espera, duração e resultado. | Diagnóstico de webhook ou lote, com log real e sem rolagem automática se o usuário estiver lendo. |
| `doc` | Trechos marcados se relacionam a uma anotação lateral no ponto em análise. | Revisão de documentação de cadastro, com anotações focáveis e versão original disponível. |
| `checklist` | Cada passo ganha check e a barra avança conforme a lista conclui. | Cadastro ou importação com requisitos concluídos e pendentes explícitos. |
| `pipeline-board` | Ordena etapas finalizadas, corrente e em espera. O layout alterna de coluna para trilho conforme espaço. | Status de lote e conciliação, com erro parcial, reconsulta e timestamps quando existirem. |
| `apps` | Distribui marcas ao redor de um nó central e acende a ligação ativa em sequência. | Diagrama de ecossistema para documentação. Uma lista com estado é mais direta para operar integrações. |

### Componentes de efeitos do Taste Skill

Os componentes `fx-*` recortam um efeito num elemento, compartilham uma camada entre partes ou mantêm o efeito em uma região decorativa. É possível usar a composição com tokens sólidos no dashboard. [Exemplos de componentes](https://github.com/Leonxlnx/taste-skill/tree/v2.5.1/skills/taste-skill/assets/components) · [Guia de efeitos](https://github.com/Leonxlnx/taste-skill/blob/v2.5.1/skills/taste-skill/references/effects-creative.md)

| Componente | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| `fx-avatar` | Um anel aplicado ao avatar se desloca para o participante ativo. | Revisão com participantes identificados, usando anel sólido e texto para o papel atual. |
| `fx-band` | Uma faixa curta introduz uma seção com chamada e tratamento topográfico de um lado. | Quebra editorial em material institucional, mantendo a navegação do painel compacta. |
| `fx-bars` | Usa recortes das barras sobre uma camada de efeito compartilhada, preservando a altura dos dados. | Inspiração de gráfico de entradas e saídas. Use preenchimentos sólidos e escala exata. |
| `fx-button` | Faz uma camada interna de cor ou material aparecer no hover e foco da ação principal. | Adapte a resposta de hover no Button atual por cor semântica e opacidade. |
| `fx-chart` | Linha com área preenchida, grade e leitura por ponteiro ou setas. | Indicadores com Recharts. Preserve tooltip, unidade, rótulos e contraste. |
| `fx-dither-object` | Ilumina modelos e quantiza cor em uma trama dither, com inclinação sensível ao cursor. | Mockup de produto físico numa peça pública. Sem função em extrato ou cadastro. |
| `fx-feature-card` | Cards organizam título e explicação sobre uma área interna que contém um recorte do produto. | Vitrine pública de recursos ou ajuda. Use uma camada de agrupamento clara em telas operacionais. |
| `fx-globe` | Um globo pontilhado ocupa parte de um card e exibe arcos ao lado de dados regionais. | Documentação pública de alcance, com regiões comprovadas e alternativa textual. |
| `fx-headline` | Uma camada estática de efeito é recortada no texto de destaque. | Título de lançamento. Mantenha títulos de movimentação em cor sólida. |
| `fx-icon-tiles` | Uma camada compartilhada aparece pelos recortes de chips de ícones. | Seção pública de recursos. No painel, mantenha Lucide e os estados semânticos. |
| `fx-logos` | Uma faixa de luz percorre uma linha de marcas estacionárias. | Faixa de parceiros reais em landing, com logos também identificados em texto. |
| `fx-map` | Renderiza ruas e marcos a partir de dados de mapa e posiciona pin, escala e endereço. | Página institucional de contato, quando houver local relevante. |
| `fx-photo` | Insere texto num painel sólido sobre foto para manter contraste. | Ilustração para ajuda ou campanha. Pode ficar estático. |
| `fx-pricing` | Uma borda com efeito e fundo discreto distingue um plano em um conjunto de cards. | Referência de hierarquia para uma página pública de planos. Em taxas, compare custos com texto e tabela. |
| `fx-progress` | A camada preenchida avança com a fração do arquivo e uma linha marca a medida exata. | Importação de lotes ou documentos. Use barra sólida, porcentagem real e rótulo da etapa. |
| `fx-prompt` | Aplica luz circulante ao contorno do compositor de comandos. | Inspiração de foco para busca. No Slopay, o anel visível substitui o brilho animado. |
| `fx-search` | O foco revela luz ambiente ao redor do campo de busca. | Buscador da topbar. Aproveite a distinção de foco sem adicionar canvas ou blur. |
| `fx-spotlight` | Um feixe suave revela a textura de um canto e mantém a geometria dos cards. | Cards clicáveis de conta. Traduza a ideia em realce de borda ou fundo localizado e acessível por foco. |
| `fx-stat` | Recorta um efeito em números grandes e deixa as legendas sólidas. | Indicadores públicos ilustrativos. Saldo real permanece sólido e tabular. |
| `fx-tabs` | O destaque com textura estática se move sob a aba ativa e o painel associado troca. | Período e filtro de movimentações. Use o indicador sólido e preserve a relação entre aba e painel. |

### Moments do Taste Skill 2.5.1

Os momentos usam entrada, interação, rolagem ou uma sequência de mídia para guiar a atenção. A biblioteca preserva exemplos antigos, mesmo quando o sorteio da skill deixou de sugeri-los. [Manifesto dos 18 momentos](https://github.com/Leonxlnx/taste-skill/blob/v2.5.1/skills/taste-skill/assets/moments/index.json)

| Momento | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| `closing-lift` | Uma camada anterior sobe na rolagem e revela a imagem e a ação da última seção. | Fechamento de tour público. Ações de concluir ou voltar no painel ficam diretamente visíveis. |
| `counter-rolls` | Os dígitos rolam uma vez quando a seção entra. A composição repousa nas cifras reais. | Métrica institucional não monetária. Para saldo, use o padrão de dígitos estáveis do Slopay. |
| `cursor-spotlight` | Uma luz com atraso curto segue o cursor, revela uma trama local e retorna à origem. | Capa pública ou inspiração para realce local de foco em card, sem trama. |
| `giant-type-pass` | A foto se move por trás de uma máscara de letras grandes durante a rolagem. | Abertura editorial fora da operação. |
| `headline-arrives` | Palavras sobem de máscaras em sequência e os controles entram com opacidade. | Primeira tela de um tour. Mantenha as ações de login e Pix disponíveis de imediato. |
| `iris-opens` | Um recorte circular aumenta e cada elemento aparece inteiro quando a abertura o comporta. | Revelação de screenshot numa landing. Na operação, fade evita atrasar o conteúdo. |
| `letters-assemble` | Caracteres espalhados se alinham com transformações conforme a seção chega ao viewport. | Declaração curta de marca fora do painel. |
| `line-carries-colour` | Uma linha fina revela a nova cor e os elementos aparecem quando já cabem na região revelada. | Referência para confirmação de etapa visual, reduzida a um indicador local. |
| `lines-rise` | Linhas sobem dentro de máscaras na primeira entrada e a mídia acompanha. | Texto secundário no onboarding. Evite condicionar instruções críticas ao scroll. |
| `liquid-hover` | A posição do ponteiro distorce uma fotografia e o mapa de deslocamento decai depois. | Ilustração de campanha. Anexos, QR e comprovantes permanecem intactos. |
| `liquid-type` | Um filtro SVG desloca o contorno do texto em torno do cursor e retorna ao original. | Título de material criativo. Não é uma técnica de status ou foco. |
| `marquee-row` | Uma faixa contínua se repete horizontalmente, com fades de borda e mecanismo de pausa. | Parceiros reais em uma landing. Mantenha lista navegável no painel. |
| `photo-chapters` | A seção fica no viewport enquanto fotos e legendas mudam com a rolagem. | Tour público de etapas, com versão em fluxo normal no modo reduzido. |
| `picture-develops` | Uma foto surge a partir de baixo contraste e recebe contraste, cor e zoom final. | Capa de campanha. Para revelar anexos após carga, use opacidade sem alterar a imagem. |
| `pinned-chapters` | Uma coluna avança por etapas e um quadro fixo troca de imagem por crossfade. | Tutorial de integração ou onboarding demonstrativo. |
| `window-parallax` | A imagem se desloca mais devagar que seu recorte durante a rolagem. | Ilustração editorial com posição estática em movimento reduzido. |
| `word-highlight` | Palavras passam de uma cor base para tinta plena conforme a posição da seção. | Frase de campanha ou tutorial. O texto principal deve ser legível antes do realce. |
| `word-rotate` | Uma palavra sai por cima e a próxima entra dentro da mesma máscara até a sequência parar. | Slogan público. Para estado operacional, troque a frase somente quando houver mudança real. |

### Cenas do Taste Skill 2.5.1

Cenas ocupam área grande e respondem ao scroll, com camada fixa e formas, objetos ou texto em movimento. A aplicação mais próxima do Slopay é uma demonstração pública com dados fictícios. [Manifesto das 11 cenas](https://github.com/Leonxlnx/taste-skill/blob/v2.5.1/skills/taste-skill/assets/scenes/index.json)

| Cena | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| `descend-through-weather` | Fotos em planos fixos recebem camadas de nuvens em velocidades diferentes até revelar o lugar. | Abertura de campanha ligada a um lugar físico. |
| `dot-becomes-the-full-stop` | Um ponto cai, muda de posição e tamanho com a entrada das palavras e termina como pontuação. | Animação pontual de manifesto de marca. |
| `fixed-hero-object` | Um objeto permanece ancorado e gira enquanto capítulos passam ao redor. | Tour público de produto com mockup, com imagem fixa alternativa. |
| `fly-into-the-shape` | A marca funciona como recorte de foto, gira para a câmera e cresce até ocupar o quadro. | Abertura audiovisual de marca. Evite em navegação diária. |
| `letter-bar-floods-the-ground` | Uma haste tipográfica cresce e vira um plano de cor que conecta duas seções. | Transição entre capítulos de material institucional. |
| `letter-physics` | Letras de uma afirmação se separam com rotação, profundidade e gravidade simulada. Outra frase emerge. | Vinheta de lançamento, com alternativa sem movimento. |
| `object-through-giant-type` | Um objeto atravessa linhas de palavras que se afastam e retornam após sua passagem. | Apresentação de marca com objeto associado à narrativa. |
| `parts-lock-into-the-whole` | Uma cifra ou palavra recua e se alinha ao painel, enquanto outros blocos compõem a tela. | Vídeo ou landing que apresenta um dashboard fictício. |
| `powers-of-ten-pullback` | O zoom recua da interface até que ela se revele como a tela de um dispositivo. | Apresentação pública do fluxo mobile. |
| `product-assembles-into-its-action` | Blocos de uma interface surgem na ordem do roteiro e se recolhem até sobrar uma ação. | Tour de um Pix fictício com controles demonstrativos. O fluxo real preserva as etapas e o estado. |
| `shaped-window-over-fixed-world` | Peças de uma máscara se deslocam e abrem uma janela sobre fotografia fixa até liberar a vista. | Abertura editorial de página pública, sem interferir na navegação do gateway. |

### Receitas de movimento do site 2.1.5

A biblioteca que acompanha a versão documentada no site traz 18 assinaturas. Os nomes abaixo identificam o gesto para uso como referência, inclusive quando a 2.5.1 apresenta um efeito semelhante em Moments. [Biblioteca de movimentos 2.1.5](https://github.com/Leonxlnx/taste-skill/blob/v2.1.5/skills/taste-skill/library/motions.json)

| Receita | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| `masked-headline` | Revela linhas de um título sob recortes alinhados à linha de base. | Uma mensagem de abertura pública ou de boas-vindas, com entrada única. |
| `shutter-image` | A foto se abre de um lado por `clip-path` e assenta de uma escala maior. | Imagem principal de um tour. Evite ocultar detalhes de um anexo. |
| `scaling-wordmark` | A escala da marca responde à posição de scroll e retorna à leitura estática fora da sequência. | Capa de campanha. A marca da topbar fica ancorada. |
| `pinned-story` | Um quadro sticky permanece enquanto passos passam ou trocam dentro dele. | Guia de configuração em página de ajuda, com passos também acessíveis em texto. |
| `index-preview` | A seleção na lista aciona crossfade de imagem num quadro fixo, com versão inline em toque. | Referência para prévia de anexos. Faça a seleção explícita por toque ou foco. |
| `curtain-footer` | O conteúdo sobe sobre um rodapé preso por CSS e o revela no fim. | Fechamento de landing institucional. |
| `slow-crossfade` | Fotografias do mesmo enquadramento alternam lentamente por opacidade. | Material público com pausa. No painel, crossfade curto e acionado por dados. |
| `edge-marquee` | Uma faixa tipográfica duplicada percorre a largura em ciclo contínuo. | Frase de campanha com opção de pausar ou ler parada. |
| `drag-row` | Itens passam por rolagem horizontal nativa e encaixam com scroll snap. | Cards de ajuda em tela estreita, com acesso a todos os itens por teclado. |
| `colour-on-scroll` | Capítulos têm fundos próprios e um elemento fixo troca cor ao cruzar a fronteira. | Variação entre capítulos editoriais. Mantenha tokens de status estáveis no gateway. |
| `stillness` | Usa uma tela visível desde o início e reserva transições para pressão, cor e foco. | Referência direta para uso diário em tabelas, botões e filtros. |
| `opening-window` | Uma janela central cresce até a largura total e o enquadramento se acomoda com o scroll. | Hero público de uma apresentação com imagem dominante. |
| `ink-fill` | Linhas já legíveis ganham contraste ao atravessar a região de leitura. | Frase secundária em página de marca, com cor plena sob movimento reduzido. |
| `sheet-over` | A seção seguinte cobre uma imagem sticky como uma folha opaca subindo. | Capítulos de tutorial público. Modal operacional usa sua própria superfície sem prender scroll da página. |
| `sideways-gallery` | Scroll vertical movimenta uma galeria horizontal em uma região sticky, com alternativa de scroll nativo. | Galeria curta de imagens públicas, com foco acompanhando item selecionado. |
| `pushed-line` | Uma frase grande atravessa alguns pontos da largura de acordo com a posição no viewport. | Assinatura de marca em peça pública com instruções em plano fixo. |
| `rolling-figures` | Cada dígito de uma métrica estática entra por uma tira vertical uma vez. | Número ilustrativo de relatório público. Valores operacionais aparecem direto no destino. |
| `carried-picture` | Usa o mesmo nome de View Transition na imagem de origem e na de destino. | Referência para continuidade entre linha e detalhe quando a navegação exigir. Use fallback simples e avalie privacidade. |

### Efeitos visuais do Taste Skill

O kit fornece parâmetros e prévias por efeito. Eles servem principalmente a capas, mídia e trechos de demonstração. Use os efeitos de estado local descritos acima na área de operação. [Manifesto dos 25 efeitos](https://github.com/Leonxlnx/taste-skill/blob/v2.5.1/skills/taste-skill/assets/effects/index.json) · [Guia de uso](https://github.com/Leonxlnx/taste-skill/blob/v2.5.1/skills/taste-skill/references/effects-usage.md)

| Efeito | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| `ascii-shade` | Converte níveis de luminosidade em glifos que desenham um volume ou onda. | Capa de documentação técnica ou demo de API. |
| `aurora-curtains` | Faixas de luz curvam e oscilam com raios difusos acima da borda. | Fundo atmosférico de campanha. |
| `bayer-dither` | Usa uma matriz de limiar ordenada para quantizar luz em pixels da paleta. | Arte retro estática em página pública. |
| `caustics` | Curvas de luz se agrupam e se dispersam como reflexos projetados pela água. | Tratamento de fundo num mockup de marca. |
| `contour-lines` | Curvas de nível, tintas de elevação e sombreamento sugerem terreno. | Ilustração pública de cobertura, separada dos dados geográficos reais. |
| `dot-terrain` | Pontos em perspectiva se elevam em ondas, simulando uma varredura de terreno. | Peça institucional de infraestrutura. |
| `dotted-globe` | Um globo de pontos gira e arcos aparecem entre cidades. | Mapa ilustrativo público com regiões verificadas e rótulos claros. |
| `duotone-grade` | Remapeia os tons de uma fotografia para duas ou três cores com grão fixo. | Tratamento de foto de campanha. Documentos e recibos preservam sua cor original. |
| `edge-glow` | Um ponto brilhante percorre a borda e deixa um rastro que diminui. | Ênfase em CTA público. No painel, foco sólido. |
| `film-light-leak` | Luz difusa invade uma borda e traz grão, como uma exposição de filme. | Capa audiovisual de demonstração. |
| `fluted-glass` | Aletas refratam pequenas faixas da imagem atrás da superfície. | Mockup de material para marketing. Mantenha elementos operacionais opacos. |
| `god-rays` | Feixes heterogêneos atravessam névoa e pontos móveis. | Fundo de apresentação em região sem texto. |
| `gradient-mesh` | Regiões coloridas se misturam sobre uma superfície curva, com opção de grade. | Arte de marca de um hero público. |
| `grain-gradient` | Campos de cor suaves se movem sob um padrão de grão. | Textura de campanha, exportável em quadro estático. |
| `grid-pulse` | Pulsos percorrem linhas de uma grade e iluminam os nós por onde passam. | Diagrama demonstrativo de integração, sem confundir com telemetria real. |
| `halftone-screen` | Pontos crescem ou encolhem conforme a luminosidade da superfície. | Arte de impressão para material editorial público. |
| `line-engraving` | Hachuras paralelas variam largura e curvatura conforme a iluminação. | Ilustração de campanha com referência a gravura, longe das cifras. |
| `orb-sphere` | Nebulosa, luz de borda e pontos desenham uma esfera em rotação lenta. | Peça sobre suporte ou marca, com estado em texto independente. |
| `painterly-landscape` | Camadas de céu e colinas desfocadas formam cenário para uma janela de UI. | Mockup público com captura fictícia. |
| `prism-dispersion` | Um feixe branco se separa em um leque espectral ao atravessar a cena. | Ilustração de lançamento. |
| `ridgeline` | Curvas empilhadas com oclusão e uma linha de destaque formam picos. | Arte de capítulo pública. Não usar como gráfico sem escala e dados. |
| `ruled-grounds` | Uma grade de pontos e cruzes recebe luz difusa em movimento. | Quadro de documentação ou mockup, com conteúdo legível em plano próprio. |
| `silk-folds` | Ondas largas de uma mesma cor mudam brilho como dobras de tecido. | Fundo de vitrine pública, com alternativa estática. |
| `soft-light-bars` | Barras difusas verticais variam luz de forma lenta em uma lateral. | Composição pública com área fixa de leitura no lado oposto. |
| `spotlight-cone` | Um feixe oblíquo atravessa névoa e ilumina um plano de apoio. | Mockup de produto em uma página pública. |

### Superfícies CSS do Taste Skill

Os fundos abaixo são classes de composição. Apenas `liquid` tem movimento próprio no manifesto. [Manifesto das 16 superfícies](https://github.com/Leonxlnx/taste-skill/blob/v2.5.1/skills/taste-skill/assets/backgrounds/index.json)

| Fundo | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| `mist` | Dois campos suaves se misturam atrás de uma seção. | Faixa pública de recursos com contraste estável. |
| `halo` | Um foco radial fica atrás de um título ou ação central. | Chamada institucional de campanha. |
| `grain` | Um campo tonal recebe ruído fino e luz num canto. | Moldura estática de mockup, longe de texto operacional. |
| `paper` | Um grão leve colore o plano geral com pequenas variações nas bordas. | Página pública de caráter editorial. |
| `dusk` | Um tom entra e se dissolve nas bordas da seção. | Ligação visual entre blocos de uma landing. |
| `topglow` | Luz fixa no topo acompanha a barra e a área inicial. | Hero público, com texto em contraste suficiente. |
| `ruled` | Linhas da grade se alinham ao contêiner e diminuem nos extremos. | Moldura de ilustração técnica, separada de linhas de tabela. |
| `dots` | Pontos ocupam margens e preservam a área de leitura central. | Seção pública de integrações ou parceiros. |
| `arcs` | Anéis sobem a partir da borda inferior. | Rodapé ou chamada final de landing. |
| `band` | Uma faixa tonal marca uma seção com iluminação desigual fixa. | Destaque editorial de um único recurso. |
| `field` | Um campo granulado de uma família de cores ocupa a seção ou painel. | Fundo de um screenshot ilustrativo em material público. |
| `stage` | Uma moldura interna usa o acento como malha atrás de uma janela de produto. | Demo visual com captura fictícia. |
| `photo` | Foto de fundo com camada de contraste para o texto. | Página pública de contexto humano ou marca. |
| `horizon` | Uma curva iluminada aparece abaixo de um campo escuro. | Chamada pública de confiabilidade, com texto fora da curva. |
| `deep` | Plano escuro com luz fixa no topo e grão leve. | Cenário de mockups em campanha. |
| `liquid` | Duas manchas próximas de cor se movem lentamente por transformação. | Vitrine pública isolada, com opção estática em movimento reduzido. |

### Objetos e fotografias do Taste Skill

Os módulos abaixo fornecem tratamentos de imagem, formas 3D e exemplos de cena. O componente de renderização é compartilhado pelos modelos. [Objetos](https://github.com/Leonxlnx/taste-skill/tree/v2.5.1/skills/taste-skill/assets/objects) · [Guia de objetos](https://github.com/Leonxlnx/taste-skill/blob/v2.5.1/skills/taste-skill/references/effects-objects.md)

| Módulo | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| `dither-sequence` | Uma sequência de fotos é quantizada e alternada por varredura diagonal com indicação de quadro. | Material público sequencial, com pausa e navegação direta. |
| `dot-object` | A silhueta de uma foto é amostrada em pontos que preservam sua forma tonal. | Arte de marca em uma foto recortada. |
| `exploded-layers` | Separa uma foto em planos com imagem, retícula, dither e contorno. | Demonstração visual de camadas de um produto. |
| `photo-dither` | Quantiza uma foto para três tons e distribui células por padrão ou ruído. | Tratamento de imagem pública. |
| `photo-engraving` | Mapeia luz em espessura de linhas diagonais que acompanham os volumes. | Ilustração editorial de marca. |
| `photo-halftone` | Usa uma tela de pontos com ângulo fixo e tamanho ligado ao tom da imagem. | Material de campanha com estética de impressão. |
| `print-cards` | Modela cartas sobrepostas e abre o conjunto em leque por ação. | Demo de peças gráficas ou cartões fictícios. |
| `print-cup` | Renderiza uma xícara com pires e faz a superfície reagir ao clique. | Página de produto físico, sem encaixe direto no gateway. |
| `print-globe` | Renderiza globo de mesa em eixo inclinado e permite giro. | Ilustração de uma campanha geográfica. |
| `print-lamp` | Mostra luminária articulada e alterna sua luz ao acionar. | Experimento de demonstração de uma ação, fora do painel. |
| `print-wheel` | Uma roda 3D ganha velocidade ao acionar e desacelera. | Catálogo público de produto físico. |
| `product-render` | Renderiza formas de produto com luz e aparência de estúdio e pode manter um pôster estático como base. | Mockup de uma superfície pública. |
| `product-turntable` | Um objeto modelado em código gira sobre uma base com escala e tratamento dither. | Vitrine de produto físico em campanha. |
| `split-reveal` | Um divisor mostra a imagem original de um lado e a versão em retícula do outro. | Comparação visual pública. A inspeção financeira deve exibir a mídia original. |

### Padrões de tela de aplicativo do site 2.1.5

A biblioteca publicada para app screens separa estilo, estrutura persistente e composição de tela. Os estilos e shells abaixo são referências para ler a hierarquia da interface. O Slopay já tem tema grafite, tipografia Inter e uma navegação desktop e mobile. [Biblioteca de aplicativos 2.1.5](https://github.com/Leonxlnx/taste-skill/blob/v2.1.5/skills/taste-skill/library/app.json) · [Guia de app screens](https://github.com/Leonxlnx/taste-skill/blob/v2.1.5/skills/taste-skill/references/app-screens.md)

| Estilo | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| `achromatic-ledger` | Interface neutra com cifras escuras e cor concentrada na série principal. | Referência de sobriedade para extrato e indicadores, mapeando a paleta para os tokens atuais. |
| `framed-sheet` | Uma moldura tonal circunda a folha de trabalho e cria hierarquia por borda. | Relatório ou detalhe com fundo distinto do shell. |
| `accent-ladder` | Varia a intensidade de um mesmo acento em navegação, badges e barras. | Hierarquia em filtros e progressos, conservando cores semânticas de resultado. |
| `editorial-greeting` | Uma saudação central se destaca sobre painéis tonais discretos. | Entrada de onboarding com uma única ação. |
| `pastel-consumer` | Categorias recebem fundos claros e tinta do mesmo tom escurecido. | Referência de agrupamento de resumos. Adapte à paleta escura existente. |
| `true-black-flat` | Shell e tela compartilham o fundo, e a elevação é definida por diferença de tom. | Aproveite a baixa ornamentação e os níveis de superfície grafite do Slopay. |
| `data-terminal` | Dados tabulares, sinal explícito e marca fina de seleção concentram a atenção. | Painel de operação, limites ou auditoria de leitura prolongada. |

| Estrutura | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| `open-plane` | Navegação e área de trabalho dividem um plano com borda mínima. | Shell autenticado com hierarquia por alinhamento e foco. |
| `framed-sheet` | Barra e sidebar formam moldura tonal ao redor da área principal recuada. | Relatório com controle de escopo fixo e trabalho em superfície separada. |
| `ruled-t-frame` | Regras finas dividem cabeçalho, lateral e conteúdo em forma de T. | Painel administrativo com busca e seletor de conta ancorados. |
| `icon-rail` | Uma barra estreita reúne ícones e reserva espaço para o conteúdo. | Sidebar recolhida do Slopay, com nome acessível e tooltip. |
| `no-sidebar` | Cabeçalho leve e uma coluna central concentram o conteúdo. | Comprovante imprimível, relatório isolado ou verificação de conta. |

| Padrão | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| `kpi-strip-chart-rail` | Uma faixa de KPIs antecede o gráfico principal e uma coluna complementar. | Visão geral com saldo, atividade e operações recentes. |
| `kpi-tabs-chart` | As próprias métricas selecionam a série do gráfico abaixo. | Indicadores com seleção entre volume, quantidade e taxa, se houver métricas consistentes. |
| `chart-pairs` | Pareia série do período com total acumulado dentro do mesmo recorte. | Fluxo de caixa e comparações de entradas e saídas. |
| `insights-share-tables` | Um conjunto de KPIs e tabelas mostra participação por categoria com alinhamento forte. | Relatório de distribuição de operações por tipo, conta ou status. |
| `table-filter-bar` | Abas, filtros e ações se fixam acima de tabela com estados de linha. | Extrato, contas e lotes. Anime apenas a mudança de seleção e de resultado. |
| `count-cards-filter` | Cartões de contagem são filtros de categorias e realçam a opção escolhida. | Pendências ou aprovações por estado, com contagens e resultado sincronizados. |
| `settings-two-column` | Título e descrição ocupam uma coluna, controle e feedback ficam na outra. | Preferências, segurança e regras, empilhando no celular. |
| `settings-with-usage` | Métricas de uso aparecem em faixa compacta acima das configurações. | Limites e tarifas, com unidade, faixa e atualização explícitas. |
| `wallet-balance-actions-assets` | Saldo principal abre uma coluna, seguido por ações e lista de posições. | Resumo Pix no mobile com saldo visível, entradas e saídas de acesso direto. |
| `finance-home-pinned-rail` | A coluna de contas permanece à vista e os cards de detalhe mudam ao lado. | Operação de múltiplas contas, preservando contexto, seleção e responsividade. |
| `builder-canvas` | Uma barra curta mantém o objeto atual e painéis ao redor de uma área de edição. | Uma futura edição complexa de regra ou fluxo, quando os campos exigirem contexto paralelo. |
| `inbox-triage` | Navegação, fila e registro atual convivem em três regiões. | Triagem de aprovações e pendências. Em mobile, use detalhe ou sheet. |
| `workspace-home-greeting` | Abertura de contexto pessoal e uma grade central de resumos úteis. | Página inicial de operador, quando houver ações ou tarefas contextualizadas. |
| `object-detail-header-grid` | O cabeçalho representa o objeto e as informações se distribuem em uma grade. | Página de movimentação, conta ou lote, com status e ações na área inicial. |
| `generated-report` | Um visor central identifica fonte e atualização e oferece ação de recarga. | Relatório ou comprovante em URL própria, com opção de impressão. |
| `tabbed-object-detail` | Um sheet apresenta identificação, ações e abas no detalhe. | Referência direta para movimentação aberta a partir do extrato, com foco restaurado no fechamento. |
| `report-card-legend-table` | Número e legenda em formato de tabela ficam junto do gráfico no mesmo card. | Indicadores financeiros com séries e valores claros, inclusive sem hover. |
| `research-lists-table` | Listas de síntese precedem uma tabela ampla, com abas de escopo. | Auditoria ou reconciliação de várias operações. |
| `platform-overview-tray` | Seções de monitoramento mostram atualização e uso recente numa faixa lateral ou inferior. | Integrações, atividade da Efí e webhooks, com estados reais de disponibilidade. |
| `bar-list-ranking` | Barras horizontais apresentam proporção em ordem explícita, com filtros e legenda. | Distribuição por status, modalidade ou conta em relatórios. |
| `deploy-health-lead` | O estado atual vem primeiro, seguido por KPIs e histórico de saúde. | Visão de integração com provedor, última atualização e dados de incidentes. |
| `power-flow` | Nós e linhas dirigidas expõem quantidade e sentido num sistema que se equilibra. | Referência para diagrama de origem e destino dos fundos, usando cifras reais e legenda. |
| `leave-timeline` | Linhas por pessoa e colunas por dia codificam categorias por padrões. | Agenda ou janelas de processamento de lotes, com categorias rotuladas. |
| `cover-matrix` | Cada célula mostra margem assinada em relação a um mínimo, com alerta de insuficiência. | Referência para mapa de consumo ou capacidade por conta e dia. Mantenha unidade e regra do limite. |
| `sell-out-strip` | Uma trilha temporal compara o ponto atual e o histórico numa escala comum. | Comparar hora de liquidação ou duração de lotes com uma referência declarada. |

### Composições públicas do Taste Skill

O acervo 2.5.1 inclui 11 exemplos de abertura com HTML e variantes responsivas. A abertura do painel pode tomar emprestado o foco em uma ação e um dado, usando o shell e o tema atuais. [Exemplos de abertura](https://github.com/Leonxlnx/taste-skill/blob/v2.5.1/skills/taste-skill/assets/layout/heroes.json)

| Abertura | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| `place` | Posiciona a foto logo abaixo da navegação e as informações numa faixa própria. | Página pública com local físico relevante. |
| `split` | Alinha título e ação de um lado, com foto, objeto ou UI do outro. | Landing institucional ou guia de integração. |
| `photo` | Uma fotografia ocupa a largura e a cópia fica na região de contraste controlado. | Campanha apoiada por uma foto real. |
| `product` | Um objeto domina o quadro sobre um plano de estúdio. | Mockup público de dispositivo com o produto. |
| `editorial` | Imagens se encaixam dentro do ritmo de um título tipográfico. | Peça de marca. Evite inserir imagens em instruções operacionais. |
| `collage` | Uma composição de recortes de UI ocupa uma moldura de corte. | Apresentação pública de recursos com exemplos fictícios. |
| `word` | Um título de escala grande reserva um termo para o gesto visual. | Chamada de lançamento em material público. |
| `film` | Uma capa de vídeo recebe mensagem sobreposta e espaço dedicado à mídia. | Tour voluntário do produto, com pôster e transcrição. |
| `statement` | Uma frase concentrada e uma ação ficam sobre um plano calmo. | Página de ajuda, boas-vindas ou confirmação cadastral. |
| `triptych` | Empilha título, colagem e CTA como três registros visuais. | Vitrine de um conjunto de funcionalidades. |
| `centred` | Título central conduz a uma janela de produto em destaque. | Demo pública do dashboard ou onboarding ilustrado. |

As receitas de seção organizam navegação, prova, recursos, mídia e conteúdo. Em contexto autenticado, `app-frame`, `steps`, `timeline-rail` e `faq` têm aplicação direta como estruturas. [Biblioteca de seções](https://github.com/Leonxlnx/taste-skill/blob/v2.5.1/skills/taste-skill/references/sections-library.md)

| Receita | O que faz e como | Encaixe no Slopay |
| --- | --- | --- |
| `nav-mega` | Abre um painel com grupos e destinos ao acionar a navegação. | Docs públicas com muitas categorias. Use o menu do painel para a navegação autenticada. |
| `nav-cards` | Divide destinos em cartões com rótulo e contexto. | Atalhos de ajuda ou página pública de recursos. |
| `nav-centre` | Centraliza o grupo principal de links e reserva as bordas para marca e ação. | Navegação institucional com poucos destinos. |
| `nav-split` | Distribui marca, links e CTA por áreas separadas. | Site público com acesso claro ao login. |
| `logo-row` | Alinha marcas em uma faixa de tamanho e espaçamento comuns. | Parceiros reais de uma página pública. |
| `quote-stat` | Coloca um depoimento e uma cifra no mesmo campo visual. | Caso de uso público, usando citação e métrica verificadas. |
| `customer-proof-row` | Agrupa diferentes sinais de prova numa linha coerente. | Contexto institucional, se houver clientes ou dados autorizados. |
| `product-statement` | Uma frase sobre o produto é acompanhada por uma evidência visual. | Tour de funcionalidade com screenshot fictício e ação única. |
| `features-2x2` | Quatro painéis de mesma hierarquia organizam capacidades. | Índice público de Pix, lotes, aprovações e relatórios. |
| `bento` | Cartões de proporções diferentes estruturam recursos com hierarquia visual. | Vitrine de funcionalidades. Uma grade previsível é melhor para comparar métricas operacionais. |
| `split-text-left` | Uma coluna de texto é associada a uma única imagem ou janela à direita. | Guia de integração com trecho de UI de exemplo. |
| `tabs-tour` | Abas selecionam diferentes exemplos dentro de um quadro fixo. | Ajuda sobre fluxos Pix ou comparação de casos de uso. |
| `chapter` | Título, explicação e mídia compõem um bloco narrativo com margem comum. | Guia longo de onboarding ou integração. |
| `app-frame` | Uma janela em escala visível demonstra um trecho do produto e seu contexto. | Exemplo visual público ou ajuda. No painel real, mantenha o fluxo completo. |
| `steps` | Uma sequência organiza ações em ordem com indicação da etapa atual. | Cadastro, lote e revisão de saque, com estado do fluxo como fonte. |
| `photo-band` | Uma fotografia ocupa uma faixa ampla entre trechos de texto. | Material editorial de marca. |
| `photo-pair` | Duas fotos se complementam em composição lado a lado. | Antes e depois de um tutorial público. |
| `line-up` | Registros em sequência incluem nome, horário e contexto. | Agenda de processamento ou eventos da plataforma quando houver agenda real. |
| `rooms-list` | Uma lista de espaços associa detalhes e imagem a cada item. | Referência de lista e prévia para ajuda. |
| `services-list` | Entradas de serviço com informações comparáveis ficam em linhas alinhadas. | Página de recursos ou tarifas com descrição objetiva. |
| `peek-list` | Selecionar uma linha atualiza uma prévia contígua. | Visualizador de anexos ou modelos, com ação por teclado e toque. |
| `people-row` | Retratos e nomes apresentam pessoas com o mesmo tratamento visual. | Equipe ou aprovadores, usando dados autorizados. |
| `integrations-grid` | Agrupa integrações em peças pequenas com marca e função. | Docs de integrações. O admin ganha também estado e ação por endpoint. |
| `calendar-frame` | Calendário é acompanhado de intervalo ativo e informação vinculada. | Filtro de datas e agenda, com rótulos explícitos. |
| `timeline-rail` | Um trilho ordena eventos e mantém seus marcadores alinhados. | Histórico de uma cobrança, saque, conta ou lote, com timestamps da fonte. |
| `menu-in-type` | Organiza categorias e itens por peso e alinhamento tipográfico. | Referência para lista de tarifas ou recursos, sem enfeites nos valores. |
| `visit-map` | Um mapa e um painel de endereço se complementam. | Página pública de contato, se pertinente. |
| `booking-form` | Campos de reserva e ação principal ficam juntos e com ordem explícita. | Referência de estrutura para agendamento de suporte, se o produto oferecer. |
| `client-slots` | Exibe disponibilidade em uma seção curta com ação associada. | Contato comercial público, se houver disponibilidade real. |
| `pricing-three` | Três planos aparecem lado a lado, com um deles enfatizado. | Página pública de planos. Compare tarifas por condições declaradas. |
| `pricing-two` | Dois planos dividem espaço equivalente para comparação direta. | Comparação pública de ofertas quando existirem. |
| `comparison-table` | Colunas alinhadas comparam atributos por opção. | Tarifas, permissões ou formas de operação, com legenda textual. |
| `faq` | Perguntas expandem respostas em acordeão. | Ajuda sobre Pix, saques, prazos e limites, com conteúdo acessível por teclado. |
| `close-type` | Uma frase tipográfica encerra a página e dá lugar a uma ação. | Encerramento de campanha institucional. |
| `close-photo` | Foto e ação encerram a narrativa numa mesma área. | Fechamento de caso público. |
| `close-word` | Uma palavra em escala de display funciona como assinatura final. | Marca em landing pública. |
| `footer-columns` | Links e informações são agrupados em colunas com hierarquia. | Rodapé público de produto e documentação. |
| `footer-dark` | Um fundo mais escuro separa o rodapé da página. | Separação visual em landing institucional. |
| `footer-visit` | Endereço, horários e ações de visita ficam no fim da página. | Contato público de um local físico. |
| `footer-statement` | Uma afirmação visual precede ou integra a lista final de links. | Fechamento editorial de marca. |

### Diagramas e direções de composição do Taste Skill

Os 27 presets de diagrama usam nós, conexões e texto alternativo em especificações parametrizadas. O grupo indica a geometria, e o nome identifica a história pronta. Para o Slopay, o desenho deve refletir a sequência, as bifurcações e os atores da integração real. [Presets de diagramas](https://github.com/Leonxlnx/taste-skill/blob/v2.5.1/skills/taste-skill/assets/diagrams/presets.json)

| Geometria | Presets e funcionamento | Encaixe no Slopay |
| --- | --- | --- |
| Hub | `hub-tools`, `hub-branches`, `hub-web`, `hub-stack`, `hub-stores` ligam fontes ou destinos a um centro. | Gateway no centro e integrações ao redor, com ligações rotuladas. |
| Anel | `ring-apps`, `ring-regions`, `ring-edge`, `ring-servers` distribuem partes em torno do sistema central. | Mapa de integrações ou contas. A distância circular tem função visual. |
| Árvore | `tree-orders` e `tree-release` derivam tarefas a partir de uma origem. | Ramificar um lote em parcelas ou mostrar caminhos por status. |
| Raias | `lanes-agent`, `lanes-media`, `lanes-deploy`, `lanes-render` e `lanes-matchmaking` abrem ações paralelas a partir de um núcleo. | Exibir responsabilidades entre gateway, provedor, webhook e validação. |
| Convergência | `fanin-warehouse` e `fanin-telemetry` juntam fontes em um consumidor. | Consolidação de eventos em conciliação ou monitoramento. |
| Entrada e saída | `bowtie-events` e `bowtie-model` passam várias entradas por um núcleo e distribuem resultados. | Visão de recebimento de eventos e atualização das projeções autorizadas. |
| Sincronização | `sync-crm` e `sync-saves` colocam dois sistemas ligados por uma relação de sincronização. | Explicar consulta e atualização entre serviços com setas na direção correta. |
| Timeline | `timeline-onboarding` e `timeline-season` ordenam marcos do começo ao resultado. | Cadastro de conta, aprovação ou histórico de um Pix. |
| Grade | `grid-documents` e `grid-assets` relacionam fontes a etapas de tratamento em uma matriz visual. | Validação de arquivos de lote ou documentos de cadastro. |
| Fluxo livre | `free-approval` posiciona nós livremente e diferencia ramos por estado. | Explicar alçada de aprovação, com ramos reais e condições explícitas. |

Na biblioteca 2.1.5, 20 direções fornecem ideias de composição. A mais próxima do painel é **The quiet instrument**, que dá protagonismo à leitura e à resposta dos controles. **The product performs** orienta a mostrar a operação real ou uma demo rotulada. **The well-kept board**, **The specimen catalogue**, **The contact sheet** e **The printed annual** oferecem estruturas de grade, coleção e relatório. **The pinned poster**, **Colour chapters**, **The split stage** e **Uneven photographs** organizam narrativa por seções. **The name as a monument**, **Sentence is the layout**, **One motif**, **Loud and flat**, **The dark room** e **Type and nothing else** tratam a identidade visual da página. **The place carries it**, **The page is the object**, **The object, large** e **Dressed as something else** usam assunto, objeto ou outra linguagem editorial para compor uma superfície pública. [Direções](https://github.com/Leonxlnx/taste-skill/blob/v2.1.5/skills/taste-skill/library/directions.json)
