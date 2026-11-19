# GlideSelect do Slopay

Todos os campos de seleção visíveis usam o Glide Select JS-CSS do React Bits. O catálogo registra 29 usos existentes, incluindo painel, onboarding e administração. O adaptador compartilhado mantém seus dados e callbacks enquanto troca a implementação visual.

- [Documentação oficial](https://reactbits.dev/micro/glide-select)
- [Registry original](https://reactbits.dev/r/GlideSelect-JS-CSS.json)
- [Código JavaScript](../src/components/GlideSelect.jsx) e [CSS oficial](../src/components/GlideSelect.css)
- [Componente de integração tipado](../src/components/ui/glide-select.tsx)
- [Compatibilidade com a composição Select anterior](../src/components/ui/select.tsx)

Instalado com `npx shadcn@latest add @react-bits/GlideSelect-JS-CSS --yes`. O projeto usa Yarn 1; a CLI detecta o lockfile e instala as dependências com Yarn. O registry exige `@hugeicons/react@^1.1.10` e `@hugeicons/core-free-icons@^4.3.3`, já declaradas no projeto.

## Novos campos

```tsx
import { GlideSelect } from "@/components/ui/glide-select";

<GlideSelect
  options={[
    { value: "png", label: "PNG", tag: "Lossless" },
    { value: "jpg", label: "JPG", tag: "Smallest" },
    { value: "webp", label: "WebP", tag: "Modern" },
    { value: "svg", label: "SVG", tag: "Vector" },
    { value: "pdf", label: "PDF", tag: "Print" },
  ]}
  defaultValue="png"
  onChange={(value, option) => console.log(value, option)}
  ariaLabel="Formato de exportação"
  size="md"
/>
```

Os padrões preservam `showTags`, `radius={10}`, `menuWidth={176}`, `placement="bottom"`, `align="left"`, `popDuration={180}`, `glideDuration={220}` e `rememberPosition`. As cores seguem a preferência aprovada para o Slopay: `accentColor="var(--primary)"`, `surfaceColor="var(--popover)"`, `highlightColor="var(--secondary)"` e `textColor="var(--foreground)"`. Assim, o grafite dos controles e o check lima acompanham o tema da aplicação. Os valores fixos do exemplo original permanecem apenas no código do fornecedor; as telas usam os padrões do componente compartilhado.

Use `size="lg"` em formulários e no celular para o alvo de toque de 44px. Use `className` para largura e posição. Não sobrescreva as cores ou a animação. Associe um `<label htmlFor>` pelo `id`, ou forneça `ariaLabel`. Para opções com conteúdo React, passe também `textValue` para a busca por teclado. `disabled` na opção impede sua escolha pelo mouse, toque ou teclado. `name`, `required` e `form` mantêm a integração nativa invisível com formulários.

## Adaptações de integração

O CSS do registry é mantido sem alterações; a integração passa a paleta semântica pelas propriedades oficiais. O JavaScript conserva o desenho e os tokens de movimento originais, com extensões para rótulos, refs e eventos de formulário; opções desabilitadas; clique assistivo; toque com rolagem; e portal com posicionamento e camadas do Radix Popover já instalado. Isso permite usar o menu em Dialogs e superfícies que recortam o conteúdo. As extensões de CSS ficam em `glide-select-integration.css` e cuidam de espaço, rolagem, foco, inválido e da preferência local de movimento reduzido. O modo de movimento reduzido do sistema também continua coberto pelo CSS oficial e pelas regras globais do Slopay.

Ao atualizar pelo registry, revise as alterações locais do JavaScript antes de sobrescrever. Preserve os fluxos de validação, submissão e retorno de foco dos campos existentes.

Os menus permitem somente rolagem vertical. A largura respeita a do controle e o espaço disponível na tela, sem mínimo que ultrapasse o limite da viewport. A lista usa uma coluna `minmax(0, 1fr)` e as opções têm `min-width: 0`, evitando que textos longos alarguem o conteúdo quando a barra vertical ocupar espaço. Nomes e tags usam reticências quando necessário; o texto completo continua na árvore de acessibilidade e o check permanece visível. Não remova essas restrições ao ajustar a largura de um campo.
