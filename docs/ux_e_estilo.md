# UX e Estilo — FastCook

Este documento define os princípios de design, paleta de cores e animações do FastCook (Anteriormente FlashCook). O objetivo é garantir um padrão sofisticado, limpo, tematicamente focado em culinária e com interações dinâmicas.

## 1. Princípios de Design

- **Dinâmico e Vivo:** A interface deve parecer viva, respondendo sutilmente às ações do utilizador (ex: pulse and glowing effects quando está a gravar voz).
- **Temática Orgânica:** Uso de cores que remetem à cozinha e natureza (terracota dos fornos, verde sálvia de ervas aromáticas).
- **Acessível e Limpo:** Alto contraste onde importa, e espaços em branco generosos para não sobrecarregar cognitivamente o utilizador.
- **Híbrido e Flexível:** Suporte ininterrupto entre o ditado por voz e o modo clássico de digitação por via de input.

## 2. Paleta de Cores (Tailwind CSS)

A paleta foi injetada nativamente via diretiva `@theme` no `index.css`:

### 🟠 Terracota (Primária)
A cor de ação principal. Remete a fornos de lenha e calor.
- `primary-50` a `primary-300`: Tons de fundo ou de destaques muito leves.
- `primary-400 (#e07a5f)`: Hover em botões secundários.
- `primary-500 (#c95c47)`: Botões de call-to-action (CTA), badges e aros de loading.
- `primary-600 (#a74938)`: Hover states do action primary e texto com forte contraste.

### 🟢 Verde Sálvia (Secundária)
Para o sucesso e elementos orgânicos (ex: modo WhatsApp).
- `sage-50` a `sage-100`: Fundos suaves para RecipeCards.
- `sage-500 (#81b29a)`: Ícones ou botões secundários aprovativos.

### 🟡 Dourado Escovado (Accent)
- `gold-500 (#dca246)`: Usado discretamente em indicadores de passos numéricos ou destaques de premium feel no design card.

### ⚪ Creme e Off-White (Surface & Background)
- Background principal `(#faf9f6)` para fugir do branco agressivo dos monitores, proporcionando descida da fadiga ocular. O `surface` é `white #ffffff` puro para os cards saltarem perante o fundo creme.

## 3. Micro-Animações Customizadas

Adicionadas via `@keyframes` para o uso fácil no Tailwind:

| Classe Tailwind | Efeito Visual | Uso Recomendado |
|---|---|---|
| `animate-glow` | Efeito "respiração luminosa" na sombra (`box-shadow`), alternando a intensidade. | Botão de microfone enquanto captura voz. |
| `animate-float` | Efeito "levitação" suave para cima e para baixo. `translateY`. | Container central da CTA, mantendo a App não-estática. |
| `animate-fade-in-up` | O elemento surge invisível vindo do fundo `24px` para a posição estática. | Cards de receitas e blocos de listas. |
| `animate-pulse-fast` | Opacidade alternada rápido (1.5s). | Textos temporários do LLM gerando `|"A pensar na receita..."|`. |

## 4. Efeitos Parallax e Sombras no RecipeCard

A interação com os resultados (`RecipeCard`) exibe um efeito parallax suave, utilizando Tailwind Utility Classes:
```jsx
// Quando em Hover, o Card flutua e ganha uma sombra vibrante da cor primária
className="hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary-100/60 transition-all duration-500"
```

O `FastCook` orgulha-se de entregar não só funcionalidade IA sofisticada como uma experiência de utilizador (UX) luxuosa correspondente.
