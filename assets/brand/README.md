# Kit de marca do SloPay

O logotipo principal usa o asterisco lima `#C6DD72` com o nome em `#E7EAED`. A versão para fundos claros usa grafite `#111417`. A geometria da logo principal é a referência para todos os tamanhos.

| Aplicação | Arquivos no repositório |
| --- | --- |
| Logo grande e pequena no produto | `public/brand/logo.svg`. O nome está convertido em curvas. |
| Símbolo na interface | `public/brand/symbol.svg`. |
| Fundo claro, impressão e monocromia | `public/brand/logo-graphite.svg`, `public/brand/logo-white.svg`, `symbol-graphite.svg` e `symbol-white.svg`. |
| PNGs transparentes | `logo-2400.png`, `logo-384.png`, `logo-graphite-2400.png`, `logo-white-2400.png` e `symbol-512.png`. |
| Aba, favoritos e atalhos Apple | `src/app/favicon.ico` (16, 32, 48 e 256 px), `src/app/icon.svg` e `src/app/apple-icon.png` (180 × 180 px). |
| Instalação pelo navegador | `src/app/manifest.ts` e `public/brand/app-{192,512,maskable-512}.png`. O PNG opaco de 512 px também serve como avatar e logo quadrada institucional. |
| Compartilhamento | `public/brand/share-slopay-v1.png` e `public/brand/share-comprovante-pix-v1.png`. As duas capas têm 1200 × 630 px. Os SVGs editáveis estão nesta pasta. |
| E-mails transacionais | `public/brand/email-logo-v1.png` (320 × 112 px). O backend exibe em 160 × 56 px, acima do texto. |
| iPhone e iPad | `ios/` contém PNGs de 1024 × 1024 px (padrão, escuro, tonalizado) e camadas SVG para levar ao Xcode ou ao Icon Composer. |
| Android | `android/res/` contém recursos do launcher adaptativo, ícones por densidade e ícone de notificação. Os arquivos para Google Play estão em `android/`. |

## Publicação

Use o endereço público HTTPS em `SLOPAY_APP_ORIGIN` no frontend e em `APP_URL` no backend. Publique o frontend antes do backend para disponibilizar a imagem que o e-mail carrega. Ao mudar uma capa, dê um novo nome ao PNG e atualize os metadados para que os serviços de compartilhamento possam buscar a nova versão.

Confira o favicon em uma aba clara e em uma escura. Abra as prévias de `/entrar`, `/criar-conta` e de um comprovante fictício no WhatsApp, LinkedIn e X após a publicação. A capa de comprovante é genérica e não contém dados da operação.

As capturas para App Store e Google Play serão feitas quando houver builds nativos, com dados fictícios. O manifesto web já usa os ícones. A captura da interface no diálogo de instalação é opcional.
