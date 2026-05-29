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
  { id: "p1", num: "01", nameEn: "COLOR PRINT", nameZh: "色彩与印刷纸", subtitle: "IMAGE + USE + PROCESS" },
  { id: "p2", num: "02", nameEn: "TOUCH", nameZh: "触感纸", subtitle: "IMAGE + USE + PROCESS" },
  { id: "p3", num: "03", nameEn: "PEARL", nameZh: "珠光纸", subtitle: "IMAGE + USE + PROCESS" },
  { id: "p4", num: "04", nameEn: "SURFACE", nameZh: "表面工艺纸", subtitle: "IMAGE + USE + PROCESS" },
  { id: "p5", num: "05", nameEn: "BAG", nameZh: "高端手提袋纸", subtitle: "IMAGE + USE + PROCESS" },
  { id: "p6", num: "06", nameEn: "LABEL", nameZh: "酒标&标签纸", subtitle: "IMAGE + USE + PROCESS" },
  { id: "p7", num: "07", nameEn: "BESPOKE LAB", nameZh: "定制实验室", subtitle: "IMAGE + USE + PROCESS" }
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
