# VANGLAM Website 1:1 Reconstruction Design Specification
**Date**: 2026-05-29
**Brand**: QiLi Paper | VANGLAM (齐力纸业 | 梵澜)
**Target**: 1:1 high-fidelity pixel-perfect reproduction of UI Wireframes & High-Fidelity Mockups (V2 PDF)

---

## 1. Architectural Strategy & Routes

The application is integrated as a premium brand showcase within the existing React + Tailwind CSS project workspace.

### Routes Configuration
- **Homepage (`/vanglam`)**: Full brand landing page representing PDF Page 2 (Homepage High-Fidelity).
- **Color Details (`/vanglam-42`)**: In-depth material catalog displaying the 42 custom color chips representing PDF Page 3 (VANGLAM 42 Page High-Fidelity).

### File Structure
All brand-specific code is neatly isolated inside `components/vanglam/` to prevent contamination of other subsystems:
```text
components/vanglam/
├── VanglamHome.tsx       # Homepage (PDF Page 2)
├── VanglamColorDeck.tsx  # Color Deck Details (PDF Page 3)
├── VanglamNavbar.tsx     # Blurred glass navigation bar
├── VanglamFooter.tsx     # Brand footer
├── vanglamData.ts        # Fully calibrated brand dataset
└── vanglam.css           # Premium brand styling tokens & textures
```

---

## 2. Visual Palette & Calibrated Design Tokens

All colors are strictly mapped to premium tactile paper variants to convey high-end physical texture.

### Layout Core Palette
- **Canvas Base Background**: `#FAF8F5` (Warm sand/stone textured cream grey)
- **Deep Forest Green (Brand Accent)**: `#0F241F` (Used for header blocks, CTA containers, and deep branding fills)
- **Golden Ochre (Secondary Accent)**: `#B0883E` (Used for active buttons and highlight elements)
- **Muted Tan**: `#E5DFD5` (Card backgrounds and secondary button hover states)

### Calibrated 42 Colors Database (`vanglamData.ts`)
Six color families containing exactly 42 colors with high-precision custom hex color mappings:

#### 1. CLOUD & INK (云墨 - 10 Chips)
- **A01 冰白 (Ice White)**: `#F4F5F6`
- **A02 云白 (Cloud White)**: `#EAECED`
- **A03 澄泥 (Sediment Clay)**: `#E1DCD6`
- **A04 黛粉 (Dusk Pink)**: `#DECED0`
- **A05 苍蓝 (Pale Slate)**: `#879FA5`
- **A06 黛灰 (Slate Charcoal)**: `#5F6F72`
- **A07 烟岚 (Mist Haze)**: `#838D8F`
- **A08 铂灰 (Platinum Grey)**: `#AEB3B5`
- **A09 玄墨 (Deep Obsidian)**: `#1C1E21`
- **A10 焦茶 (Smoked Tea)**: `#2D231E`

#### 2. GILDED EARTH (金壤 - 8 Chips)
- **B01 杏黄 (Apricot Gold)**: `#E8D4A2`
- **B02 姜黄 (Ginger Ochre)**: `#D1A153`
- **B03 秋香 (Aged Citron)**: `#9C8A3B`
- **B04 烤金 (Baked Gold)**: `#B0883E`
- **B05 赭石 (Ochre Stone)**: `#8C5835`
- **B06 陶土 (Terracotta)**: `#B8724D`
- **B07 赤铜 (Red Copper)**: `#9C4C38`
- **B08 可可 (Cacao)**: `#5C4033`

#### 3. CASK RESERVE (醇藏 - 5 Chips)
- **C01 茱萸 (Cornel Pink)**: `#DDA5B2`
- **C02 胭脂 (Rouge Carmine)**: `#8B2635`
- **C03 朱砂 (Vermilion)**: `#990011`
- **C04 晚吾 (Midnight Red)**: `#4A121A`
- **C05 沉香 (Aloeswood)**: `#2B0C10`

#### 4. CELADON & JADE (青玉 - 7 Chips)
- **D01 浅水碧 (Shallow Celadon)**: `#A2D2C8`
- **D02 渌青 (Pure Green)**: `#5F9E8F`
- **D03 葱绿 (Scallion Jade)**: `#4E8C6F`
- **D04 苔绿 (Moss Green)**: `#3C6B52`
- **D05 竹青 (Bamboo Jade)**: `#2F5A44`
- **D06 石绿 (Mineral Green)**: `#1E5A44`
- **D07 黛绿 (Deep Forest Jade)**: `#113626`

#### 5. MINERAL SEA (石海 - 5 Chips)
- **E01 矿蓝 (Mineral Blue)**: `#4A7C9D`
- **E02 碧青 (Jade Blue)**: `#2B5F8C`
- **E03 乳青蓝 (Cerulean Glaze)**: `#3F5D7D`
- **E04 钴蓝 (Cobalt Glaze)**: `#1E3F66`
- **E05 黛青 (Indigo Sea)**: `#0F1E36`

#### 6. LACQUER BLOOM (花漆 - 7 Chips)
- **F01 柳红 (Willow Red)**: `#D9534F`
- **F02 浅粉 (Peach Blossom)**: `#F0AD4E`
- **F03 玫瑰木 (Rosewood)**: `#A04455`
- **F04 胭脂 (Plum Rouge)**: `#B83B5E`
- **F05 朱砂 (Cinnabar Lacquer)**: `#E84545`
- **F06 朱漆 (Lacquer Red)**: `#903749`
- **F07 芍药紫 (Peony Violet)**: `#53354A`

---

## 3. UI Page 2: Homepage Detailed Visual Specifications

### 3.1 Navbar
- **Height**: 72px.
- **Glassmorphism**: `backdrop-blur-md bg-white/80 border-b border-[#0F241F]/5`.
- **Branding**: `QiLi Paper | VANGLAM` in Serif font with deep gray text.
- **Links**: Narrow uppercase serif styles (`tracking-widest text-xs`).

### 3.2 01 Hero Section
- **Flex Layout**: 2 columns (55% text/buttons, 45% interactive stacked cards).
- **Core Title**: `Color, Paper & Surface for Premium Packaging` in Serif.
- **Sub-headline**: `为高端包装、印刷与品牌视觉提供特种纸颜色与表面工艺系统`.
- **Highlights Grid**: 4 capsules using background `#E5DFD5/40` and borders:
  1. `3-Day Sample` | `3天打样`
  2. `MOQ 3,000 Sheets` | `起订量 3000张`
  3. `80-1300 gsm` | `克重覆盖`
  4. `Custom Color` | `颜色与表面定制`
- **Interactive Stacked Paper (Right Side)**:
  - 4 layers of absolute positioned stacked cards rotating at exact angles (`-4deg`, `2deg`, `5deg`, `8deg`).
  - Implements Framer Motion cursor parallax: cards move slightly relative to mouse hover, creating a 3D tactile card depth.

### 3.3 02 Color System Section
- **Grid Layout**: 3 columns x 2 rows cards.
- **Diagonal Cut Design**: Each card features a custom diagonal division with a 45-degree angle displaying the color family's representative gradient pattern (e.g. emerald greens for Celadon & Jade).
- **Navigation Action**: On click, redirects to `/vanglam-42?family=family-id`, carrying over target section IDs for scroll highlighting.

### 3.4 03 Seven Product Lines
- **Asymmetric Layout Grid**: Cards 1 to 4 on row 1, cards 5 to 7 on row 2.
- **Visuals**: Features sharp minimalist angles with card numbers (01-07) and distinct bilingual labeling (e.g., `01 Color Print` / `色彩与印刷纸`).

### 3.5 04 Applications
- **3x3 Matrix Grid**: Extremely clean typography with structured spacing. Fully responsive.
- **Content Blocks**: Dark cards (`#1E2221`) with clean light text for premium packaging and beauty scenarios.

### 3.6 05 Surface Lab
- **Dark Deep Green Base**: Background `#0B1714` (Hex Forest Night).
- **Interactive Finishes Grid**: 6 thin-bordered buttons representing finishes:
  - `TACTILE` (触感)
  - `PEARL` (珠光)
  - `EMBOSSING` (压纹)
  - `COATING` (涂布)
  - `FOIL` (烫金/烫银)
  - `UV` (局部UV)
- **Active Simulations**: Hovering or clicking on each finish triggers an interactive CSS glow effect simulating that material treatment (e.g., FOIL reflects light, PEARL radiates soft iridescent radial gradients).

---

## 4. UI Page 3: Color Deck Detailed Specifications

### 4.1 Header & Highlight Section
- Displays giant, high-contrast, side-by-side color cards showcasing:
  1. `D06 石绿 (Mineral Green)`
  2. `B03 秋香 (Aged Citron)`
  3. `E04 钴蓝 (Cobalt Glaze)`
- Sub-text explaining the system purpose: `一套为特种纸、高端包装与表面工艺建立的42色材料系统。`

### 4.2 Exact Multi-Row Family Grids
Colors are displayed in strict rows matching the PDF:
1. **CLOUD & INK**: 3 rows (Row 1: A01-A04; Row 2: A05-A08; Row 3: A09-A10)
2. **GILDED EARTH**: 2 rows (Row 1: B01-B04; Row 2: B05-B08)
3. **CASK RESERVE**: 1 row (Row 1: C01-C05)
4. **CELADON & JADE**: 2 rows (Row 1: D01-D04; Row 2: D05-D07)
5. **MINERAL SEA**: 1 row (Row 1: E01-E05)
6. **LACQUER BLOOM**: 2 rows (Row 1: F01-F04; Row 2: F05-F07)

### 4.3 Recommended Surface Directions
- 4-column elegant beige container grid detailing tactile surface applications per category (Light Neutrals, Earth Tones, Greens & Blues, Deep Colors).

---

## 5. Verification & Quality Plan

- **Layout Precision**: Verify using responsive screen sizing (Desktop, Tablet, Mobile) to guarantee 1:1 proportional layout.
- **Scroll Targeting**: Ensure clicking "Celadon & Jade" from `/vanglam` smoothly scrolls and flashes the corresponding section on `/vanglam-42`.
- **Contrast & Aesthetics**: Confirm that the dark-green accents and light-sand canvas colors match the exact editorial feel of premium specialty paper brands.
