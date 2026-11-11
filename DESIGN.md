# DESIGN SYSTEM & DIRETRIZES VISUAIS

Este documento estabelece o design system, tokens semânticos, tipografia, densidade e padrões de acessibilidade do frontend operacional de pagamentos Pix.

---

## 1. Família Visual e Filosofia de Conforto

* **Conceito:** Tema escuro grafite com destaque lima moderado.
* **Objetivo:** Uso operacional contínuo e prolongado sem fadiga visual.
* **Diretrizes Estéticas:**
  * Fundo grafite profundo (`#111417`), evitando pretos absolutos de alto contraste.
  * Superfícies opacas e limpas (`#191D22`), com hierarquia visual clara e sem cards desnecessários aninhados.
  * Destaque lima (`#C6DD72`) restrito à ação principal, foco e pequenos indicadores.
  * Proibição de efeitos neon, gradientes decorativos atrás de números, glow ou glassmorphism.
  * Valores monetários numéricos estáveis: **nunca animar de zero até o valor real**.

---

## 2. Tokens Semânticos (Tailwind CSS v4 & CSS Variables)

Configurados em `src/app/globals.css` e consumidos diretamente pelos utilitários semânticos do Tailwind (`bg-background`, `text-foreground`, `border-input`, etc.):

```css
:root {
  /* Superfícies e Fundo */
  --background: #111417;
  --foreground: #E7EAED;
  --card: #191D22;
  --card-foreground: #E7EAED;
  --popover: #20262C;
  --popover-foreground: #E7EAED;

  /* Cores de Ação */
  --primary: #C6DD72;
  --primary-foreground: #19200D;
  --secondary: #252C33;
  --secondary-foreground: #E0E5E9;
  --muted: #20262C;
  --muted-foreground: #A6AFB9;
  --accent: #2B3427;
  --accent-foreground: #D8E7AD;

  /* Controles e Bordas */
  --border: #333C45;
  --input: #626F7C;
  --ring: #C6DD72;

  /* Estados Semânticos */
  --destructive: #E39A9A;
  --destructive-foreground: #281313;
  --success: #8EC6A4;
  --success-surface: #1D3027;
  --warning: #D8BC7D;
  --warning-surface: #342D1D;
  --info: #9BBBD8;
  --info-surface: #202E3A;

  /* Sidebar */
  --sidebar: #15191D;
  --sidebar-foreground: #BDC5CD;
  --sidebar-primary: #C6DD72;
  --sidebar-primary-foreground: #19200D;
  --sidebar-accent: #252D25;
  --sidebar-accent-foreground: #D8E7AD;
  --sidebar-border: #30383F;
  --sidebar-ring: #C6DD72;

  /* Gráficos */
  --chart-1: #9CBF85; /* Entradas */
  --chart-2: #8DAEC4; /* Saídas */
  --chart-3: #C6B080; /* Complementar */
  --chart-4: #AB9ABD; /* Complementar */
  --chart-5: #91B7AD; /* Complementar */

  /* Raios e Formas */
  --radius: 0.625rem; /* 10px em controles, 12-14px em cards */
}
```

---

## 3. Tipografia e Escala

* **Família:** `Inter` (via `next/font/google`), com pesos 400 (regular), 500 (medium) e 600 (semi-bold).
* **Numerais Financeiros:**
  * Classe `tabular-nums` obrigatória para alinhamento uniforme de dígitos.
  * Alinhamento à direita em tabelas monetárias.
  * Tamanho dos valores de destaque: `28px` a `36px` com peso 600.
* **Escala Modular:**
  * Títulos de página: `24px` a `28px` (mobile) e `28px` a `32px` (desktop).
  * Subtítulos e títulos de seção: `18px` a `20px`.
  * Corpo de texto: `16px` (entrelinha ~1.5).
  * Textos auxiliares e tabelas: `14px`.
  * Metadados e badges: `12px` a `13px`.

---

## 4. Densidade de Interface

1. **Confortável (Padrão do Sistema):**
   * Altura de linhas de tabela: ~`56px`.
   * Altura de controles (inputs/botões): `40px` a `44px`.
   * Espaçamento interno de cards: `20px` a `24px`.
   * Alvos de toque no mobile: mínimo de `44 × 44px`.
2. **Compacta (Opcional para Desktop):**
   * Altura de linhas de tabela: ~`44px`.
   * Espaçamento interno reduzido sem sacrificar tamanho de fonte e contraste.

---

## 5. Modo de Privacidade

* **Controle Global:** Ícone no Topbar para alternar a visibilidade de montantes monetários.
* **Abrangência:**
  * Oculta saldos, métricas de dashboard, valores de tabelas e tooltips de gráficos substituindo por `••••••`.
  * Não apenas esconde o texto visualmente: aplica `aria-label="Valor oculto por motivo de privacidade"` para garantir acessibilidade.
  * Exige confirmação deliberada de revelação temporária antes de assinar saques ou exportar CSVs.

---

## 6. Acessibilidade (WCAG 2.2 Nível AA)

* **Contraste Mínimo:** 4.5:1 para texto normal e 3:1 para controles e elementos gráficos essenciais.
* **Foco Visível:** Todos os elementos interativos possuem anel de foco sólido (`outline: 2px solid #C6DD72`, com offset de 2px).
* **Navegação por Teclado:** Totalmente operável via `Tab`, `Shift+Tab`, `Enter`, `Space` e `Esc` (em modais/drawers com retorno de foco para o trigger de abertura).
* **Formulários Acessíveis:** Controles associados explicitamente aos seus rótulos via `<label>` e descrições de erro vinculadas via `aria-describedby` e `aria-invalid`.
* **Movimento Reduzido:** Suporte automático a `prefers-reduced-motion` com desativação de transições na preferência local do usuário.
