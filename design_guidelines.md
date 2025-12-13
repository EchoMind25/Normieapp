# Normie Companion App - Design Guidelines

## Design Approach: 4chan-Inspired Memecoin Aesthetic

**Selected Direction**: Custom aesthetic combining 4chan's terminal-style UI with modern crypto dashboard elements. Think: raw, chaotic energy meets real-time data visualization.

**Core Design Principles**:
- Embrace digital chaos with purposeful disorder
- Terminal/console aesthetic with modern polish
- High-contrast, high-energy visual hierarchy
- Dense information architecture that rewards exploration
- Community-first, meme-native interface

---

## Typography System

**Primary Font**: Monospace family (IBM Plex Mono, JetBrains Mono, or Space Mono via Google Fonts)
- Headers: 700 weight, uppercase for impact (text-2xl to text-5xl)
- Body: 400 weight, slightly loose tracking (tracking-wide)
- Data/Numbers: 500 weight, tabular figures for alignment

**Secondary Font**: Sans-serif (Inter or Work Sans) for readability in dense sections
- Use for longer content blocks, descriptions
- 400-600 weight range

**Typography Hierarchy**:
- Hero/Dashboard Title: text-4xl lg:text-6xl, monospace, uppercase
- Section Headers: text-2xl lg:text-3xl, monospace, uppercase
- Metric Labels: text-sm, monospace, uppercase, tracking-wider
- Data Values: text-3xl lg:text-5xl, monospace, tabular-nums
- Body Text: text-base, sans-serif
- Micro-copy/Timestamps: text-xs, monospace

---

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24 (focus on 4, 8, 16 for consistency)
- Component padding: p-4 to p-8
- Section spacing: py-12 to py-24
- Grid gaps: gap-4 to gap-8
- Container margins: mx-4 to mx-8

**Grid Structure**:
- Dashboard: 12-column grid with asymmetric layouts
- Stats cards: grid-cols-2 md:grid-cols-4 for key metrics
- Merch shop: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Mobile: Always single column, stack everything

**Container Widths**:
- Full dashboard: max-w-7xl mx-auto
- Content sections: max-w-6xl mx-auto
- Narrow text: max-w-2xl

---

## Page Structure & Sections

### 1. Hero/Header Section (NOT full viewport)
- Fixed header with logo, navigation, community stats ticker
- Height: auto, not forced 100vh
- Elements: Normie branding, live price ticker scrolling horizontally, quick stats (holders, burns), nav links
- No large hero image - lean into terminal aesthetic with ASCII-style logo or simple text

### 2. Real-Time Dashboard (Primary Section)
**Layout**: Grid-based metrics display
- 4-column stat cards (responsive to 2-col on tablet, 1-col mobile)
- Each card: metric label, large value, 24h change indicator, mini sparkline
- Prominent burn/lock progress bar visualization
- Live update timestamp in corner

**Chart Section Below Stats**:
- 2-column layout: main price chart (larger, left) + volume/liquidity chart (right)
- Charts full-bleed within containers, no excessive padding
- Use Chart.js with terminal-style rendering (monochrome lines, grid patterns)

### 3. Interactive Meme Generator Section
- Split layout: 60/40 (canvas left, controls right on desktop)
- Canvas area: Large drag-drop zone with preview
- Controls sidebar: Sticker library grid (3-4 cols), upload button, text tools, download/share buttons
- Template gallery above canvas (horizontal scroll)

### 4. Merch Shop Section
- Product grid: 3 columns desktop, 2 tablet, 1 mobile
- Each card: Product image, name, price (in USD + SOL), quick-view button
- Carousel for featured items at top (3-5 slides)
- Mock checkout modal: Tabbed interface (Solana Pay | Stripe), forms simulate real UI

### 5. Community Hub Section
- Multi-column layout: 
  - Left: Live polls (stacked vertically)
  - Center: Recent burns/activity feed (terminal-style log)
  - Right: Social links, Telegram embed simulation, X feed snippets
- Mobile: Stack in order - polls, feed, social

### 6. Mission/Manifesto Section
- Full-width text block with asymmetric layout
- Pull quotes from @NormieCEO in larger type
- Stats highlights in margin (burn milestones: "572M removed")
- CTA to join Telegram prominent

### 7. Footer
- Dense, information-rich
- 4-column layout: Brand/mission, Quick Links, Community, Contract Info
- Token address displayed prominently (monospace, copyable)
- Social icons row
- Disclaimer text small print

---

## Component Library

**Stat Cards**: 
- Bordered containers with subtle shadows
- Header: label + icon
- Body: Large numeric value, change indicator (+/- with arrow)
- Footer: Mini chart or timestamp
- Structure: p-6, border-2, rounded-lg

**Buttons**:
- Primary: Solid fill, uppercase text, px-6 py-3, rounded-md, font-bold
- Secondary: Outline variant, same padding
- Icon buttons: Square (w-10 h-10), centered icon
- Blur backgrounds when over images: backdrop-blur-md

**Charts**:
- Line charts: Sharp angles, no smoothing for terminal aesthetic
- Gauges: Circular progress for burn/lock percentages
- Ticker: Horizontal auto-scrolling text for live updates
- All charts: Minimal chrome, focus on data

**Modals/Overlays**:
- Full-screen on mobile, centered card on desktop (max-w-2xl)
- Header with close button, tabbed navigation if multiple flows
- Checkout modal: Two-tab (Solana | Stripe), simulate wallet connect and card forms

**Meme Generator Canvas**:
- Dark workspace with grid overlay
- Floating toolbar for tools (text, stickers, filters)
- Download button: Fixed bottom-right

**Product Cards**:
- Image: aspect-square or 3:4, object-cover
- Info below: Product name (text-lg), price (text-xl, bold)
- CTA button full-width at bottom
- Hover: Slight lift effect (translate-y-1)

**Navigation**:
- Fixed top bar, sticky during scroll
- Logo left, nav links center, connect/stats right
- Mobile: Hamburger menu

---

## Animation Guidelines

**Use Sparingly** - Terminal aesthetic doesn't need excessive motion:
- Live data: Gentle pulse on value change (scale-105 briefly)
- Chart updates: Smooth line drawing, not abrupt jumps
- Stat cards: Subtle hover lift (translate-y-0.5)
- Ticker: Continuous horizontal scroll (auto-scroll)
- Page transitions: None or instant, keep it snappy
- Loading states: Blinking cursor or minimal spinner

**NO smooth scroll effects, parallax, or elaborate entrance animations** - conflicts with raw aesthetic.

---

## Images

**Hero Section**: No large hero image. Use ASCII art or simple terminal text treatment for branding.

**Product Images** (Merch Shop):
- Required: Product photos for each merch item (coffee, hoodies, joggers, beanies, cologne, bags)
- Placement: Within product cards, aspect-square or 3:4 ratio
- Style: Clean product photography on simple backgrounds
- Count: 6-8 product images minimum

**Meme Generator**:
- Normie-themed sticker library (10-15 stickers/emojis as placeholder graphics)
- Template backgrounds (3-5 meme format templates)

**Community Section**:
- Avatar placeholders for testimonials/community members
- Social platform icons (X, Telegram)

**No decorative hero imagery** - lean into the terminal/4chan minimalism. Images serve functional purposes (products, memes, avatars) only.

---

## Accessibility

- High contrast maintained throughout (terminal green on dark meets WCAG AA)
- Form inputs: Visible labels, focus states with thick borders
- Buttons: Min 44x44px touch targets
- Charts: Include text alternatives for key data points
- Keyboard navigation: All interactive elements accessible via tab

---

## Responsive Behavior

- Mobile-first: Everything stacks to single column
- Tablet (md): 2-column grids where appropriate
- Desktop (lg+): Full multi-column layouts
- Charts: Maintain aspect ratios, simplify on mobile (hide secondary datasets)
- Navigation: Collapse to hamburger below 768px
- Stat cards: Reduce padding on mobile (p-4 instead of p-6)