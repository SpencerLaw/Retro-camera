export interface ColorChip {
  id: string;
  nameZh: string;
  nameEn: string;
  hex: string;
}

export interface ColorFamily {
  id: string;
  nameZh: string;
  nameEn: string;
  description: string;
  themeColor: string;
  chips: ColorChip[];
}

export interface ProductLine {
  id: string;
  num: string;
  nameEn: string;
  nameZh: string;
  subtitle: string;
}

export interface VanglamCollection {
  id: string;
  name: string;
  summary: string;
  icon: string;
}

export interface SignatureColor {
  id: string;
  name: string;
  phrase: string;
  asset: string;
  tone: string;
}

export interface ApplicationCategory {
  titleEn: string;
  titleZh: string;
  subEn: string;
  subZh: string;
  bgHex: string;
  textLight: boolean;
}

export interface VanglamApplication {
  id: string;
  label: string;
}

export interface AtelierFeature {
  id: string;
  title: string;
  body: string;
  icon: string;
}

export interface VanglamDetailCard {
  id: string;
  title: string;
  eyebrow: string;
  body: string;
  image?: string;
}

export interface RequestSampleField {
  id: string;
  label: string;
  type: "text" | "email" | "url" | "select" | "textarea";
  options?: string[];
}

export const COLOR_FAMILIES: ColorFamily[] = [
  {
    id: "cloud-ink",
    nameZh: "云墨",
    nameEn: "CLOUD & INK",
    description: "6 FAMILIES / 42 COLORS / 3 SIGNATURE COLORS",
    themeColor: "#5F6F72",
    chips: [
      { id: "A01", nameZh: "冰白", nameEn: "ICE WHITE", hex: "#F4F5F6" },
      { id: "A02", nameZh: "云白", nameEn: "CLOUD WHITE", hex: "#EAECED" },
      { id: "A03", nameZh: "澄泥", nameEn: "SEDIMENT CLAY", hex: "#E1DCD6" },
      { id: "A04", nameZh: "黛粉", nameEn: "DUSK PINK", hex: "#DECED0" },
      { id: "A05", nameZh: "苍蓝", nameEn: "PALE SLATE", hex: "#879FA5" },
      { id: "A06", nameZh: "黛灰", nameEn: "SLATE CHARCOAL", hex: "#5F6F72" },
      { id: "A07", nameZh: "烟岚", nameEn: "MIST HAZE", hex: "#838D8F" },
      { id: "A08", nameZh: "铂灰", nameEn: "PLATINUM GREY", hex: "#AEB3B5" },
      { id: "A09", nameZh: "玄墨", nameEn: "DEEP OBSIDIAN", hex: "#1C1E21" },
      { id: "A10", nameZh: "焦茶", nameEn: "SMOKED TEA", hex: "#2D231E" }
    ]
  },
  {
    id: "gilded-earth",
    nameZh: "金壤",
    nameEn: "GILDED EARTH",
    description: "RICH EARTH OXIDES AND BAKED MINERAL TONES",
    themeColor: "#9C8A3B",
    chips: [
      { id: "B01", nameZh: "杏黄", nameEn: "APRICOT GOLD", hex: "#E8D4A2" },
      { id: "B02", nameZh: "姜黄", nameEn: "GINGER OCHRE", hex: "#D1A153" },
      { id: "B03", nameZh: "秋香", nameEn: "AGED CITRON", hex: "#9C8A3B" },
      { id: "B04", nameZh: "烤金", nameEn: "BAKED GOLD", hex: "#B0883E" },
      { id: "B05", nameZh: "赭石", nameEn: "OCHRE STONE", hex: "#8C5835" },
      { id: "B06", nameZh: "陶土", nameEn: "TERRACOTTA", hex: "#B8724D" },
      { id: "B07", nameZh: "赤铜", nameEn: "RED COPPER", hex: "#9C4C38" },
      { id: "B08", nameZh: "可可", nameEn: "CACAO", hex: "#5C4033" }
    ]
  },
  {
    id: "cask-reserve",
    nameZh: "醇藏",
    nameEn: "CASK RESERVE",
    description: "DEEP BURGUNDY, CRIMSON, AND AGED WOOD AESTHETICS",
    themeColor: "#8B2635",
    chips: [
      { id: "C01", nameZh: "茱萸", nameEn: "CORNEL PINK", hex: "#DDA5B2" },
      { id: "C02", nameZh: "胭脂", nameEn: "ROUGE CARMINE", hex: "#8B2635" },
      { id: "C03", nameZh: "朱砂", nameEn: "VERMILION", hex: "#990011" },
      { id: "C04", nameZh: "晚吾", nameEn: "MIDNIGHT RED", hex: "#4A121A" },
      { id: "C05", nameZh: "沉香", nameEn: "ALOESWOOD", hex: "#2B0C10" }
    ]
  },
  {
    id: "celadon-jade",
    nameZh: "青玉",
    nameEn: "CELADON & JADE",
    description: "TRADITIONAL MINERAL JADES AND DEEP FOREST GREENS",
    themeColor: "#1E5A44",
    chips: [
      { id: "D01", nameZh: "浅水碧", nameEn: "SHALLOW CELADON", hex: "#A2D2C8" },
      { id: "D02", nameZh: "渌青", nameEn: "PURE GREEN", hex: "#5F9E8F" },
      { id: "D03", nameZh: "葱绿", nameEn: "SCALLION JADE", hex: "#4E8C6F" },
      { id: "D04", nameZh: "苔绿", nameEn: "MOSS GREEN", hex: "#3C6B52" },
      { id: "D05", nameZh: "竹青", nameEn: "BAMBOO JADE", hex: "#2F5A44" },
      { id: "D06", nameZh: "石绿", nameEn: "MINERAL GREEN", hex: "#1E5A44" },
      { id: "D07", nameZh: "黛绿", nameEn: "DEEP FOREST JADE", hex: "#113626" }
    ]
  },
  {
    id: "mineral-sea",
    nameZh: "石海",
    nameEn: "MINERAL SEA",
    description: "DEEP SEA INDIGOS AND LIGHT CERULEAN MINERAL GLAZES",
    themeColor: "#1E3F66",
    chips: [
      { id: "E01", nameZh: "矿蓝", nameEn: "MINERAL BLUE", hex: "#4A7C9D" },
      { id: "E02", nameZh: "碧青", nameEn: "JADE BLUE", hex: "#2B5F8C" },
      { id: "E03", nameZh: "乳青蓝", nameEn: "CERULEAN GLAZE", hex: "#3F5D7D" },
      { id: "E04", nameZh: "钴蓝", nameEn: "COBALT GLAZE", hex: "#1E3F66" },
      { id: "E05", nameZh: "黛青", nameEn: "INDIGO SEA", hex: "#0F1E36" }
    ]
  },
  {
    id: "lacquer-bloom",
    nameZh: "花漆",
    nameEn: "LACQUER BLOOM",
    description: "BRIGHT FLORAL CINNABAR AND DARK LACQUER PURPLES",
    themeColor: "#B83B5E",
    chips: [
      { id: "F01", nameZh: "柳红", nameEn: "WILLOW RED", hex: "#D9534F" },
      { id: "F02", nameZh: "浅粉", nameEn: "PEACH BLOSSOM", hex: "#F0AD4E" },
      { id: "F03", nameZh: "玫瑰木", nameEn: "ROSEWOOD", hex: "#A04455" },
      { id: "F04", nameZh: "胭脂", nameEn: "PLUM ROUGE", hex: "#B83B5E" },
      { id: "F05", nameZh: "朱砂", nameEn: "CINNABAR LACQUER", hex: "#E84545" },
      { id: "F06", nameZh: "朱漆", nameEn: "LACQUER RED", hex: "#903749" },
      { id: "F07", nameZh: "芍药紫", nameEn: "PEONY VIOLET", hex: "#53354A" }
    ]
  }
];

export const PRODUCT_LINES: ProductLine[] = [
  { id: "p1", num: "01", nameEn: "Color Print", nameZh: "色彩与印刷纸", subtitle: "Rich & Expressive" },
  { id: "p2", num: "02", nameEn: "Touch", nameZh: "触感纸", subtitle: "Tactile & Natural" },
  { id: "p3", num: "03", nameEn: "Pearl", nameZh: "珠光纸", subtitle: "Lustre & Elegance" },
  { id: "p4", num: "04", nameEn: "Coated", nameZh: "涂布纸", subtitle: "Smooth & Refined" },
  { id: "p5", num: "05", nameEn: "Digital Coated", nameZh: "数码涂布纸", subtitle: "Vivid & Precise" },
  { id: "p6", num: "06", nameEn: "Bag", nameZh: "高端手提袋纸", subtitle: "Strong & Beautiful" },
  { id: "p7", num: "07", nameEn: "Label", nameZh: "酒标与标签纸", subtitle: "Fine & Functional" },
  { id: "p8", num: "08", nameEn: "Bespoke", nameZh: "定制纸张系统", subtitle: "By Your Vision" }
];

export const SIGNATURE_COLORS: SignatureColor[] = [
  {
    id: "stone-green",
    name: "STONE GREEN",
    phrase: "Natural depth. Quiet strength.",
    asset: "/vanglam/signature-green.png",
    tone: "#2A826A"
  },
  {
    id: "autumn-citron",
    name: "AUTUMN CITRON",
    phrase: "Heritage luster. Timeless warmth.",
    asset: "/vanglam/signature-citron.png",
    tone: "#9E8F2E"
  },
  {
    id: "cobalt-blue",
    name: "COBALT BLUE",
    phrase: "Refined clarity. Global identity.",
    asset: "/vanglam/signature-blue.png",
    tone: "#244FA3"
  }
];

export const COLLECTIONS: VanglamCollection[] = [
  { id: "color-print", name: "Color Print", summary: "Rich & Expressive", icon: "flower" },
  { id: "touch", name: "Touch", summary: "Tactile & Natural", icon: "cube" },
  { id: "pearl", name: "Pearl", summary: "Lustre & Elegance", icon: "shell" },
  { id: "coated", name: "Coated", summary: "Smooth & Refined", icon: "diamond" },
  { id: "digital-coated", name: "Digital Coated", summary: "Vivid & Precise", icon: "box" },
  { id: "bag", name: "Bag", summary: "Strong & Beautiful", icon: "bag" },
  { id: "label", name: "Label", summary: "Fine & Functional", icon: "tag" },
  { id: "bespoke", name: "Bespoke", summary: "By Your Vision", icon: "wand" }
];

export const SURFACE_TERMS = [
  "Texture",
  "Tactility",
  "Pearlescent",
  "Embossing",
  "Coating",
  "Foil & Stamping",
  "UV & Special"
];

export const VANGLAM_APPLICATIONS: VanglamApplication[] = [
  { id: "wine", label: "Wine & Spirits Labels" },
  { id: "beauty", label: "Beauty & Fragrance" },
  { id: "luxury", label: "Luxury Packaging" },
  { id: "bags", label: "Premium Shopping Bags" },
  { id: "cards", label: "Invitation & Cards" },
  { id: "hotel", label: "Hotel & Lifestyle" }
];

export const ATELIER_FEATURES: AtelierFeature[] = [
  { id: "manufacturing", title: "Manufacturing", body: "Precision machines. Consistent excellence.", icon: "network" },
  { id: "sample-making", title: "Sample Making", body: "Rapid & accurate. Material made real.", icon: "swatch" },
  { id: "quality-control", title: "Quality Control", body: "Instrumented testing. Batch to batch.", icon: "cube" },
  { id: "material-philosophy", title: "Material Philosophy", body: "Respect paper. Respect the future.", icon: "molecule" }
];

export const COLOR_GUIDANCE: VanglamDetailCard[] = [
  {
    id: "overview",
    eyebrow: "Overview",
    title: "Overview / Signature Colors / Six Families / Full Color Index / Color Guidance / Color Deck",
    body: "VANGLAM Color System begins with three brand memories and expands into six calibrated families for premium packaging, labels and print."
  },
  {
    id: "signature",
    eyebrow: "Signature Colors",
    title: "Stone Green / Aged Citron / Cobalt Glaze",
    body: "Three restrained anchor colors create a quiet brand system: natural depth, heritage luster and global clarity."
  },
  {
    id: "index",
    eyebrow: "Full Color Index",
    title: "42 Core Colors - 6 Families - 3 Signature Colors",
    body: "Every color value is a digital reference for conversation, sampling and spectrophotometer confirmation rather than a final production standard.",
    image: "/vanglam/color-deck-fan.png"
  }
];

export const COLLECTION_DETAILS: VanglamDetailCard[] = [
  { id: "color-print", eyebrow: "Color Print", title: "Rich & Expressive", body: "Color-led papers for expressive packaging, print collateral and brand systems that need stable color language." },
  { id: "touch", eyebrow: "Touch", title: "Tactile & Natural", body: "Soft-touch and natural-feel papers designed for close hand contact, refined unboxing and sensory print experiences." },
  { id: "pearl", eyebrow: "Pearl", title: "Lustre & Elegance", body: "Pearlescent surfaces for beauty, fragrance and ceremonial packaging where light needs to move gently." },
  { id: "coated", eyebrow: "Coated", title: "Smooth & Refined", body: "Coated papers for sharp printing, smooth finishing and polished commercial presentation." },
  { id: "digital-coated", eyebrow: "Digital Coated", title: "Vivid & Precise", body: "Digital-print friendly coated papers for short-run packaging, rapid sampling and precise proofing." },
  { id: "bag", eyebrow: "Bag", title: "Strong & Beautiful", body: "High-strength papers for premium shopping bags that need structure, color and a refined touch." },
  { id: "label", eyebrow: "Label", title: "Fine & Functional", body: "Label papers for wine, spirits, beauty and specialty goods requiring fine print and finishing control." },
  { id: "bespoke", eyebrow: "Bespoke", title: "By Your Vision", body: "Custom color, paper and surface systems developed with brand teams and packaging designers." }
];

export const SURFACE_DETAILS: VanglamDetailCard[] = [
  { id: "texture", eyebrow: "Texture", title: "Material grain and paper memory", body: "Real paper texture gives packaging a calm physical presence before print or finishing begins.", image: "/vanglam/surface-tile.png" },
  { id: "tactility", eyebrow: "Tactility", title: "Touch-led surface systems", body: "Soft, skin-like or dry-touch finishes make the material memorable without becoming decorative noise." },
  { id: "pearlescent", eyebrow: "Pearlescent", title: "Controlled mineral glow", body: "A restrained light response for beauty, fragrance, invitations and high-end paper objects." },
  { id: "embossing", eyebrow: "Embossing", title: "Pressure, relief and shadow", body: "Embossed and debossed details add structure, hierarchy and a tangible premium signal." },
  { id: "coating", eyebrow: "Coating", title: "Print-ready surface refinement", body: "Coating controls ink behavior, smoothness and consistency across packaging and print work." },
  { id: "foil", eyebrow: "Foil & Stamping", title: "Metallic accents with restraint", body: "Foil and stamping should amplify color and identity rather than cover the material itself." },
  { id: "uv", eyebrow: "UV & Special", title: "Gloss contrast and special finishes", body: "Local UV, screen printing and special treatments create deliberate contrast on quiet material bases." }
];

export const APPLICATION_DETAILS: VanglamDetailCard[] = [
  { id: "wine", eyebrow: "Wine & Spirits Labels", title: "Labels with depth and wet-strength logic", body: "Material recommendations for wine labels, spirit boxes and premium cellar-ready presentation." },
  { id: "beauty", eyebrow: "Beauty & Fragrance", title: "Soft surfaces for close personal objects", body: "Pearl, touch and refined color systems for fragrance, skincare and cosmetic packaging." },
  { id: "luxury", eyebrow: "Luxury Packaging", title: "Quiet structure for high-value gifts", body: "Paper, color and surface combinations for rigid boxes, sleeves and brand presentation kits." },
  { id: "bags", eyebrow: "Premium Shopping Bags", title: "Strength with brand tactility", body: "Bag papers selected for load, fold behavior, color memory and premium handle presentation.", image: "/vanglam/application-bags.png" },
  { id: "cards", eyebrow: "Invitation & Cards", title: "Paper for emotion and ceremony", body: "Invitation, greeting and postcard materials that support embossing, foil and soft tactile response." },
  { id: "hotel", eyebrow: "Hotel & Lifestyle", title: "Material systems for hospitality", body: "Menu, envelope, room collateral and lifestyle packaging papers with calm, durable refinement." }
];

export const ARTCARD_ITEMS: VanglamDetailCard[] = [
  { id: "overview", eyebrow: "Overview", title: "Paper for emotion.", body: "Artcard Lab is VANGLAM's high-end paper object studio, not an e-commerce catalog.", image: "/vanglam/artcard-thanks.png" },
  { id: "invitation", eyebrow: "Invitation Cards", title: "Ceremonial color and finish", body: "Invitation papers balancing print clarity, embossing depth and refined hand feel." },
  { id: "greeting", eyebrow: "Greeting Cards", title: "Small objects with lasting touch", body: "Greeting cards, thank-you cards and seasonal paper objects with emotional material presence." },
  { id: "postcards", eyebrow: "Postcards", title: "Compact paper stories", body: "Postcard systems that carry image, type and surface in a memorable tactile format." },
  { id: "objects", eyebrow: "Paper Objects", title: "Folded, pressed and crafted forms", body: "Material-led exploration for paper sculptures, keepsakes and refined presentation pieces." },
  { id: "stationery", eyebrow: "Brand Stationery", title: "Identity in paper form", body: "Stationery systems for brands that need envelopes, cards and documents with one material voice." }
];

export const ATELIER_STORY_POINTS: VanglamDetailCard[] = [
  { id: "manufacturing", eyebrow: "Manufacturing", title: "Real manufacturing.", body: "QiLi Paper grounds the VANGLAM experience in actual paper production, surface control and repeatable delivery." },
  { id: "sample-making", eyebrow: "Sample Making", title: "Thoughtful process.", body: "Sample making turns color, paper and surface intent into physical decisions designers can judge by hand." },
  { id: "quality-control", eyebrow: "Quality Control", title: "Lasting quality.", body: "Batch-to-batch testing, print trials and finishing checks keep the material system credible." },
  { id: "philosophy", eyebrow: "Material Philosophy", title: "Quiet, material-led, editorial, useful.", body: "The website should feel like a high-end material showroom: useful, restrained and grounded in craft." },
  { id: "founder-story", eyebrow: "Founder Story", title: "From paper making to material language", body: "The founder story is presented through capability, standards and material judgment rather than sales claims." }
];

export const REQUEST_SAMPLE_FIELDS: RequestSampleField[] = [
  { id: "name", label: "Name", type: "text" },
  { id: "company", label: "Company", type: "text" },
  { id: "country", label: "Country", type: "text" },
  { id: "email", label: "Email", type: "email" },
  { id: "website", label: "Website", type: "url" },
  { id: "industry", label: "Industry", type: "select", options: ["Wine & Spirits", "Beauty & Fragrance", "Luxury Packaging", "Hospitality", "Design Studio", "Printing & Converting"] },
  { id: "application", label: "Application", type: "select", options: ["Wine & Spirits Labels", "Beauty & Fragrance", "Luxury Packaging", "Premium Shopping Bags", "Invitation & Cards", "Hotel & Lifestyle"] },
  { id: "interested-products", label: "Interested Products", type: "text" },
  { id: "printing-method", label: "Printing Method", type: "text" },
  { id: "finishing-process", label: "Finishing Process", type: "text" },
  { id: "expected-quantity", label: "Expected Quantity", type: "text" },
  { id: "message", label: "Message", type: "textarea" }
];

export const APPLICATIONS: ApplicationCategory[] = [
  { titleEn: "LUXURY PACKAGING", titleZh: "高端礼盒", subEn: "RECOMMENDED PAPER / COLOR / SURFACE", subZh: "高档礼品、奢侈品定制包装选用", bgHex: "#112A20", textLight: true },
  { titleEn: "BEAUTY & FRAGRANCE", titleZh: "美妆香氛", subEn: "RECOMMENDED PAPER / COLOR / SURFACE", subZh: "化妆品及香氛行业触感艺术包装", bgHex: "#EFECE6", textLight: false },
  { titleEn: "WINE & SPIRITS LABEL", titleZh: "酒标酒盒", subEn: "RECOMMENDED PAPER / COLOR / SURFACE", subZh: "高端酒类湿强力标签与礼盒用纸", bgHex: "#2D1D13", textLight: true },
  { titleEn: "PREMIUM SHOPPING BAG", titleZh: "高端手提袋", subEn: "RECOMMENDED PAPER / COLOR / SURFACE", subZh: "品牌手提袋承重与色彩质感用纸", bgHex: "#EFECE6", textLight: false },
  { titleEn: "HOTEL & LIFESTYLE", titleZh: "酒店生活方式", subEn: "RECOMMENDED PAPER / COLOR / SURFACE", subZh: "精品酒店菜单、信封及物料用纸", bgHex: "#2C2D2B", textLight: true },
  { titleEn: "TEA & GOURMET", titleZh: "茶酒食品", subEn: "RECOMMENDED PAPER / COLOR / SURFACE", subZh: "精致茗茶、食品级认证艺术包装", bgHex: "#8B6B51", textLight: true },
  { titleEn: "CULTURAL CREATIVE", titleZh: "文创礼品", subEn: "RECOMMENDED PAPER / COLOR / SURFACE", subZh: "艺术书籍、文创周边本册印刷介质", bgHex: "#EFECE6", textLight: false },
  { titleEn: "DIGITAL PRINT", titleZh: "数码印刷与包装", subEn: "RECOMMENDED PAPER / COLOR / SURFACE", subZh: "HP Indigo等短版数码快印特种介质", bgHex: "#1A4F8B", textLight: true },
  { titleEn: "INDUSTRIAL SPECIALTY", titleZh: "电子与工业特种纸", subEn: "RECOMMENDED PAPER / COLOR / SURFACE", subZh: "高端电子隔垫与工业特种材料解决方案", bgHex: "#373A3C", textLight: true }
];
