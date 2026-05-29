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

export interface ApplicationCategory {
  titleEn: string;
  titleZh: string;
  subEn: string;
  subZh: string;
  bgHex: string;
  textLight: boolean;
}

export const COLOR_FAMILIES: ColorFamily[] = [
  {
    id: "cloud-ink",
    nameZh: "云墨",
    nameEn: "CLOUD & INK",
    description: "6 families / 42 colors / 3 signature colors",
    themeColor: "#5F6F72",
    chips: [
      { id: "A01", nameZh: "冰白", nameEn: "Ice White", hex: "#F4F5F6" },
      { id: "A02", nameZh: "云白", nameEn: "Cloud White", hex: "#EAECED" },
      { id: "A03", nameZh: "澄泥", nameEn: "Sediment Clay", hex: "#E1DCD6" },
      { id: "A04", nameZh: "黛粉", nameEn: "Dusk Pink", hex: "#DECED0" },
      { id: "A05", nameZh: "苍蓝", nameEn: "Pale Slate", hex: "#879FA5" },
      { id: "A06", nameZh: "黛灰", nameEn: "Slate Charcoal", hex: "#5F6F72" },
      { id: "A07", nameZh: "烟岚", nameEn: "Mist Haze", hex: "#838D8F" },
      { id: "A08", nameZh: "铂灰", nameEn: "Platinum Grey", hex: "#AEB3B5" },
      { id: "A09", nameZh: "玄墨", nameEn: "Deep Obsidian", hex: "#1C1E21" },
      { id: "A10", nameZh: "焦茶", nameEn: "Smoked Tea", hex: "#2D231E" }
    ]
  },
  {
    id: "gilded-earth",
    nameZh: "金壤",
    nameEn: "GILDED EARTH",
    description: "Rich earth oxides and baked mineral tones",
    themeColor: "#9C8A3B",
    chips: [
      { id: "B01", nameZh: "杏黄", nameEn: "Apricot Gold", hex: "#E8D4A2" },
      { id: "B02", nameZh: "姜黄", nameEn: "Ginger Ochre", hex: "#D1A153" },
      { id: "B03", nameZh: "秋香", nameEn: "Aged Citron", hex: "#9C8A3B" },
      { id: "B04", nameZh: "烤金", nameEn: "Baked Gold", hex: "#B0883E" },
      { id: "B05", nameZh: "赭石", nameEn: "Ochre Stone", hex: "#8C5835" },
      { id: "B06", nameZh: "陶土", nameEn: "Terracotta", hex: "#B8724D" },
      { id: "B07", nameZh: "赤铜", nameEn: "Red Copper", hex: "#9C4C38" },
      { id: "B08", nameZh: "可可", nameEn: "Cacao", hex: "#5C4033" }
    ]
  },
  {
    id: "cask-reserve",
    nameZh: "醇藏",
    nameEn: "CASK RESERVE",
    description: "Deep burgundy, crimson, and aged wood aesthetics",
    themeColor: "#8B2635",
    chips: [
      { id: "C01", nameZh: "茱萸", nameEn: "Cornel Pink", hex: "#DDA5B2" },
      { id: "C02", nameZh: "胭脂", nameEn: "Rouge Carmine", hex: "#8B2635" },
      { id: "C03", nameZh: "朱砂", nameEn: "Vermilion", hex: "#990011" },
      { id: "C04", nameZh: "晚吾", nameEn: "Midnight Red", hex: "#4A121A" },
      { id: "C05", nameZh: "沉香", nameEn: "Aloeswood", hex: "#2B0C10" }
    ]
  },
  {
    id: "celadon-jade",
    nameZh: "青玉",
    nameEn: "CELADON & JADE",
    description: "Traditional mineral jades and deep forest greens",
    themeColor: "#1E5A44",
    chips: [
      { id: "D01", nameZh: "浅水碧", nameEn: "Shallow Celadon", hex: "#A2D2C8" },
      { id: "D02", nameZh: "渌青", nameEn: "Pure Green", hex: "#5F9E8F" },
      { id: "D03", nameZh: "葱绿", nameEn: "Scallion Jade", hex: "#4E8C6F" },
      { id: "D04", nameZh: "苔绿", nameEn: "Moss Green", hex: "#3C6B52" },
      { id: "D05", nameZh: "竹青", nameEn: "Bamboo Jade", hex: "#2F5A44" },
      { id: "D06", nameZh: "石绿", nameEn: "Mineral Green", hex: "#1E5A44" },
      { id: "D07", nameZh: "黛绿", nameEn: "Deep Forest Jade", hex: "#113626" }
    ]
  },
  {
    id: "mineral-sea",
    nameZh: "石海",
    nameEn: "MINERAL SEA",
    description: "Deep sea indigos and light cerulean mineral glazes",
    themeColor: "#1E3F66",
    chips: [
      { id: "E01", nameZh: "矿蓝", nameEn: "Mineral Blue", hex: "#4A7C9D" },
      { id: "E02", nameZh: "碧青", nameEn: "Jade Blue", hex: "#2B5F8C" },
      { id: "E03", nameZh: "乳青蓝", nameEn: "Cerulean Glaze", hex: "#3F5D7D" },
      { id: "E04", nameZh: "钴蓝", nameEn: "Cobalt Glaze", hex: "#1E3F66" },
      { id: "E05", nameZh: "黛青", nameEn: "Indigo Sea", hex: "#0F1E36" }
    ]
  },
  {
    id: "lacquer-bloom",
    nameZh: "花漆",
    nameEn: "LACQUER BLOOM",
    description: "Bright floral cinnabar and dark lacquer purples",
    themeColor: "#B83B5E",
    chips: [
      { id: "F01", nameZh: "柳红", nameEn: "Willow Red", hex: "#D9534F" },
      { id: "F02", nameZh: "浅粉", nameEn: "Peach Blossom", hex: "#F0AD4E" },
      { id: "F03", nameZh: "玫瑰木", nameEn: "Rosewood", hex: "#A04455" },
      { id: "F04", nameZh: "胭脂", nameEn: "Plum Rouge", hex: "#B83B5E" },
      { id: "F05", nameZh: "朱砂", nameEn: "Cinnabar Lacquer", hex: "#E84545" },
      { id: "F06", nameZh: "朱漆", nameEn: "Lacquer Red", hex: "#903749" },
      { id: "F07", nameZh: "芍药紫", nameEn: "Peony Violet", hex: "#53354A" }
    ]
  }
];

export const PRODUCT_LINES: ProductLine[] = [
  { id: "p1", num: "01", nameEn: "Color Print", nameZh: "色彩与印刷纸", subtitle: "image + use + process" },
  { id: "p2", num: "02", nameEn: "Touch", nameZh: "触感纸", subtitle: "image + use + process" },
  { id: "p3", num: "03", nameEn: "Pearl", nameZh: "珠光纸", subtitle: "image + use + process" },
  { id: "p4", num: "04", nameEn: "Surface", nameZh: "表面工艺纸", subtitle: "image + use + process" },
  { id: "p5", num: "05", nameEn: "Bag", nameZh: "高端手提袋纸", subtitle: "image + use + process" },
  { id: "p6", num: "06", nameEn: "Label", nameZh: "酒标&标签纸", subtitle: "image + use + process" },
  { id: "p7", num: "07", nameEn: "Bespoke Lab", nameZh: "定制实验室", subtitle: "image + use + process" }
];

export const APPLICATIONS: ApplicationCategory[] = [
  { titleEn: "Luxury Packaging", titleZh: "高端礼盒", subEn: "recommended paper / color / surface", subZh: "高档礼品、奢侈品定制包装选用", bgHex: "#112A20", textLight: true },
  { titleEn: "Beauty & Fragrance", titleZh: "美妆香氛", subEn: "recommended paper / color / surface", subZh: "化妆品及香氛行业触感艺术包装", bgHex: "#EFECE6", textLight: false },
  { titleEn: "Wine & Spirits Label", titleZh: "酒标酒盒", subEn: "recommended paper / color / surface", subZh: "高端酒类湿强力标签与礼盒用纸", bgHex: "#2D1D13", textLight: true },
  { titleEn: "Premium Shopping Bag", titleZh: "高端手提袋", subEn: "recommended paper / color / surface", subZh: "品牌手提袋承重与色彩质感用纸", bgHex: "#EFECE6", textLight: false },
  { titleEn: "Hotel & Lifestyle", titleZh: "酒店生活方式", subEn: "recommended paper / color / surface", subZh: "精品酒店菜单、信封及物料用纸", bgHex: "#2C2D2B", textLight: true },
  { titleEn: "Tea & Gourmet", titleZh: "茶酒食品", subEn: "recommended paper / color / surface", subZh: "精致茗茶、食品级认证艺术包装", bgHex: "#8B6B51", textLight: true },
  { titleEn: "Cultural Creative", titleZh: "文创礼品", subEn: "recommended paper / color / surface", subZh: "艺术书籍、文创周边本册印刷介质", bgHex: "#EFECE6", textLight: false },
  { titleEn: "Digital Print", titleZh: "数码印刷与包装", subEn: "recommended paper / color / surface", subZh: "HP Indigo等短版数码快印特种介质", bgHex: "#1A4F8B", textLight: true },
  { titleEn: "Industrial Specialty", titleZh: "电子与工业特种纸", subEn: "recommended paper / color / surface", subZh: "高端电子隔垫与工业特种材料解决方案", bgHex: "#373A3C", textLight: true }
];
