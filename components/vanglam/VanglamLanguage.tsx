import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { RequestSampleField, VanglamDetailCard } from './vanglamData';

export type VanglamLanguage = 'en' | 'zh';

interface VanglamNavItem {
  key: string;
  label: string;
  to: string;
}

interface VanglamHomeCopy {
  heroTitle: string;
  heroLines: string[];
  heroBodyLines: string[];
  discoverColorSystem: string;
  signatureHeading: string;
  explore: string;
  colorSystemEyebrow: string;
  colorSystemTitle: string;
  colorSystemBodyLines: string[];
  exploreSystem: string;
  collectionsHeading: string;
  featureGridAria: string;
  surfacesTitle: string;
  applicationsTitle: string;
  artcardTitle: string;
  artcardBodyLines: string[];
  exploreArtcard: string;
  atelierTitle: string;
  sampleTitle: string;
  sampleBody: string;
  sampleButton: string;
}

interface VanglamPageCopy {
  eyebrow: string;
  title: string;
  body: string;
  asideAlt?: string;
}

interface VanglamFooterColumn {
  title: string;
  links: Array<{ label: string; to: string }>;
}

interface VanglamCopy {
  brandHomeAria: string;
  brandTagline: string;
  navAria: string;
  nav: VanglamNavItem[];
  requestSample: string;
  languageToggleAria: string;
  home: VanglamHomeCopy;
  signatureColors: Array<{ id: string; name: string; phrase: string; alt: string; aria: string }>;
  collections: Array<{ id: string; name: string; summary: string; aria: string }>;
  surfaceTerms: string[];
  applications: Array<{ id: string; label: string }>;
  atelierFeatures: Array<{ id: string; title: string; body: string }>;
  pages: {
    colorSystem: VanglamPageCopy;
    collections: VanglamPageCopy;
    surfaces: VanglamPageCopy;
    applications: VanglamPageCopy;
    artcardLab: VanglamPageCopy;
    atelier: VanglamPageCopy;
    requestSample: VanglamPageCopy;
  };
  details: {
    colorGuidance: VanglamDetailCard[];
    collections: VanglamDetailCard[];
    surfaces: VanglamDetailCard[];
    applications: VanglamDetailCard[];
    artcard: VanglamDetailCard[];
    atelierStory: VanglamDetailCard[];
  };
  colorIndex: {
    eyebrow: string;
    title: string;
    familyDescriptions: Record<string, string>;
  };
  processIconLabel: string;
  requestAside: string;
  projectIntake: string;
  projectIntakeTitle: string;
  requestFields: RequestSampleField[];
  requestSuccess: string;
  requestLinks: {
    colorSystem: string;
    collections: string;
    surfaces: string;
  };
  footer: {
    columns: VanglamFooterColumn[];
    connectTitle: string;
    socialsAria: string;
    instagramAria: string;
    linkedinAria: string;
    contactAria: string;
    rights: string;
    line: string;
  };
}

interface VanglamLanguageContextValue {
  language: VanglamLanguage;
  copy: VanglamCopy;
  toggleLanguage: () => void;
}

const storageKey = 'vanglam-language';

const readInitialLanguage = (): VanglamLanguage => {
  if (typeof window === 'undefined') {
    return 'en';
  }

  return window.localStorage.getItem(storageKey) === 'zh' ? 'zh' : 'en';
};

const requestFieldIds = [
  'name',
  'company',
  'country',
  'email',
  'website',
  'industry',
  'application',
  'interested-products',
  'printing-method',
  'finishing-process',
  'expected-quantity',
  'message',
] as const;

const englishRequestFields: RequestSampleField[] = [
  { id: requestFieldIds[0], label: 'Name', type: 'text' },
  { id: requestFieldIds[1], label: 'Company', type: 'text' },
  { id: requestFieldIds[2], label: 'Country', type: 'text' },
  { id: requestFieldIds[3], label: 'Email', type: 'email' },
  { id: requestFieldIds[4], label: 'Website', type: 'url' },
  {
    id: requestFieldIds[5],
    label: 'Industry',
    type: 'select',
    options: ['Wine & Spirits', 'Beauty & Fragrance', 'Luxury Packaging', 'Hospitality', 'Design Studio', 'Printing & Converting'],
  },
  {
    id: requestFieldIds[6],
    label: 'Application',
    type: 'select',
    options: ['Wine & Spirits Labels', 'Beauty & Fragrance', 'Luxury Packaging', 'Premium Shopping Bags', 'Invitation & Cards', 'Hotel & Lifestyle'],
  },
  { id: requestFieldIds[7], label: 'Interested Products', type: 'text' },
  { id: requestFieldIds[8], label: 'Printing Method', type: 'text' },
  { id: requestFieldIds[9], label: 'Finishing Process', type: 'text' },
  { id: requestFieldIds[10], label: 'Expected Quantity', type: 'text' },
  { id: requestFieldIds[11], label: 'Message', type: 'textarea' },
];

const chineseRequestFields: RequestSampleField[] = [
  { id: requestFieldIds[0], label: '姓名', type: 'text' },
  { id: requestFieldIds[1], label: '公司', type: 'text' },
  { id: requestFieldIds[2], label: '国家/地区', type: 'text' },
  { id: requestFieldIds[3], label: '邮箱', type: 'email' },
  { id: requestFieldIds[4], label: '网站', type: 'url' },
  {
    id: requestFieldIds[5],
    label: '行业',
    type: 'select',
    options: ['酒类与烈酒', '美妆香氛', '高端包装', '酒店生活方式', '设计工作室', '印刷与后道加工'],
  },
  {
    id: requestFieldIds[6],
    label: '应用场景',
    type: 'select',
    options: ['酒标与烈酒标签', '美妆香氛', '高端包装', '精品手提袋', '邀请函与卡片', '酒店与生活方式'],
  },
  { id: requestFieldIds[7], label: '感兴趣产品', type: 'text' },
  { id: requestFieldIds[8], label: '印刷方式', type: 'text' },
  { id: requestFieldIds[9], label: '后道工艺', type: 'text' },
  { id: requestFieldIds[10], label: '预计数量', type: 'text' },
  { id: requestFieldIds[11], label: '项目说明', type: 'textarea' },
];

const copies: Record<VanglamLanguage, VanglamCopy> = {
  en: {
    brandHomeAria: 'QiLi Paper VANGLAM homepage',
    brandTagline: 'COLOR · PAPER · SURFACE',
    navAria: 'Primary navigation',
    nav: [
      { key: 'color-system', label: 'Color System', to: '/vanglam/color-system' },
      { key: 'collections', label: 'Collections', to: '/vanglam/collections' },
      { key: 'surfaces', label: 'Surfaces', to: '/vanglam/surfaces' },
      { key: 'applications', label: 'Applications', to: '/vanglam/applications' },
      { key: 'artcard-lab', label: 'Artcard Lab', to: '/vanglam/artcard-lab' },
      { key: 'atelier', label: 'Atelier', to: '/vanglam/atelier' },
    ],
    requestSample: 'REQUEST SAMPLE KIT',
    languageToggleAria: 'Switch to Chinese',
    home: {
      heroTitle: 'Soul of Color. Signature in Every Surface.',
      heroLines: ['Soul of Color.', 'Signature in', 'Every Surface.'],
      heroBodyLines: [
        'QiLi Paper is a material atelier.',
        'We create the color, paper and surface systems',
        "that define the world's most premium packaging,",
        'print and creative experiences.',
      ],
      discoverColorSystem: 'DISCOVER VANGLAM COLOR SYSTEM',
      signatureHeading: 'THREE SIGNATURE COLORS',
      explore: 'Explore',
      colorSystemEyebrow: 'VANGLAM COLOR SYSTEM',
      colorSystemTitle: 'A language of color, crafted in paper.',
      colorSystemBodyLines: [
        'A 42-color material system for premium packaging,',
        'labels and print. Created for consistency.',
        'Confirmed by spectrophotometer.',
      ],
      exploreSystem: 'EXPLORE THE SYSTEM',
      collectionsHeading: 'COLLECTIONS',
      featureGridAria: 'Surfaces, applications and Artcard Lab',
      surfacesTitle: 'SURFACES',
      applicationsTitle: 'APPLICATIONS',
      artcardTitle: 'ARTCARD LAB',
      artcardBodyLines: ['Paper for emotion.', 'Invitation cards, greeting cards,', 'postcards and paper objects.'],
      exploreArtcard: 'EXPLORE ARTCARD LAB',
      atelierTitle: 'ATELIER',
      sampleTitle: 'Request Your Sample Kit',
      sampleBody: 'Touch the difference. Start your story with VANGLAM.',
      sampleButton: 'REQUEST SAMPLE KIT',
    },
    signatureColors: [
      {
        id: 'stone-green',
        name: 'STONE GREEN',
        phrase: 'Natural depth. Quiet strength.',
        alt: 'STONE GREEN textured VANGLAM color card',
        aria: 'Explore STONE GREEN in the VANGLAM color system',
      },
      {
        id: 'autumn-citron',
        name: 'AUTUMN CITRON',
        phrase: 'Heritage luster. Timeless warmth.',
        alt: 'AUTUMN CITRON textured VANGLAM color card',
        aria: 'Explore AUTUMN CITRON in the VANGLAM color system',
      },
      {
        id: 'cobalt-blue',
        name: 'COBALT BLUE',
        phrase: 'Refined clarity. Global identity.',
        alt: 'COBALT BLUE textured VANGLAM color card',
        aria: 'Explore COBALT BLUE in the VANGLAM color system',
      },
    ],
    collections: [
      { id: 'color-print', name: 'Color Print', summary: 'Rich & Expressive', aria: 'Explore Color Print collection' },
      { id: 'touch', name: 'Touch', summary: 'Tactile & Natural', aria: 'Explore Touch collection' },
      { id: 'pearl', name: 'Pearl', summary: 'Lustre & Elegance', aria: 'Explore Pearl collection' },
      { id: 'coated', name: 'Coated', summary: 'Smooth & Refined', aria: 'Explore Coated collection' },
      { id: 'digital-coated', name: 'Digital Coated', summary: 'Vivid & Precise', aria: 'Explore Digital Coated collection' },
      { id: 'bag', name: 'Bag', summary: 'Strong & Beautiful', aria: 'Explore Bag collection' },
      { id: 'label', name: 'Label', summary: 'Fine & Functional', aria: 'Explore Label collection' },
      { id: 'bespoke', name: 'Bespoke', summary: 'By Your Vision', aria: 'Explore Bespoke collection' },
    ],
    surfaceTerms: ['Texture', 'Tactility', 'Pearlescent', 'Embossing', 'Coating', 'Foil & Stamping', 'UV & Special'],
    applications: [
      { id: 'wine', label: 'Wine & Spirits Labels' },
      { id: 'beauty', label: 'Beauty & Fragrance' },
      { id: 'luxury', label: 'Luxury Packaging' },
      { id: 'bags', label: 'Premium Shopping Bags' },
      { id: 'cards', label: 'Invitation & Cards' },
      { id: 'hotel', label: 'Hotel & Lifestyle' },
    ],
    atelierFeatures: [
      { id: 'manufacturing', title: 'Manufacturing', body: 'Precision machines. Consistent excellence.' },
      { id: 'sample-making', title: 'Sample Making', body: 'Rapid & accurate. Material made real.' },
      { id: 'quality-control', title: 'Quality Control', body: 'Instrumented testing. Batch to batch.' },
      { id: 'material-philosophy', title: 'Material Philosophy', body: 'Respect paper. Respect the future.' },
    ],
    pages: {
      colorSystem: {
        eyebrow: 'Color System',
        title: 'A language of color, crafted in paper.',
        body: 'Overview / Signature Colors / Six Families / Full Color Index / Color Guidance / Color Deck',
      },
      collections: {
        eyebrow: 'Collections',
        title: 'Curated families for every expression.',
        body: 'Color Print / Touch / Pearl / Coated / Digital Coated / Bag / Label / Bespoke',
        asideAlt: 'VANGLAM color deck',
      },
      surfaces: {
        eyebrow: 'Surfaces',
        title: 'Texture and finishes that bring ideas to life.',
        body: 'Texture / Tactility / Pearlescent / Embossing / Coating / Foil & Stamping / UV & Special',
        asideAlt: 'embossed paper texture',
      },
      applications: {
        eyebrow: 'Applications',
        title: 'Find the right paper for each brand project.',
        body: 'Wine & Spirits Labels / Beauty & Fragrance / Luxury Packaging / Premium Shopping Bags / Invitation & Cards / Hotel & Lifestyle',
        asideAlt: 'VANGLAM bags and box',
      },
      artcardLab: {
        eyebrow: 'Artcard Lab',
        title: 'Paper for emotion.',
        body: 'Invitation cards, greeting cards, postcards and paper objects.',
        asideAlt: 'embossed thank you card',
      },
      atelier: {
        eyebrow: 'Atelier',
        title: 'Real manufacturing. Thoughtful process. Lasting quality.',
        body: 'Manufacturing / Sample Making / Quality Control / Material Philosophy / Founder Story',
        asideAlt: 'paper roll in production',
      },
      requestSample: {
        eyebrow: 'Request Sample Kit',
        title: 'Experience the difference. Request Your Sample Kit.',
        body: 'Touch the difference. Start your story with VANGLAM.',
      },
    },
    details: {
      colorGuidance: [
        {
          id: 'overview',
          eyebrow: 'Overview',
          title: 'Overview / Signature Colors / Six Families / Full Color Index / Color Guidance / Color Deck',
          body: 'VANGLAM Color System begins with three brand memories and expands into six calibrated families for premium packaging, labels and print.',
        },
        {
          id: 'signature',
          eyebrow: 'Signature Colors',
          title: 'Stone Green / Aged Citron / Cobalt Glaze',
          body: 'Three restrained anchor colors create a quiet brand system: natural depth, heritage luster and global clarity.',
        },
        {
          id: 'index',
          eyebrow: 'Full Color Index',
          title: '42 Core Colors - 6 Families - 3 Signature Colors',
          body: 'Every color value is a digital reference for conversation, sampling and spectrophotometer confirmation rather than a final production standard.',
          image: '/vanglam/color-deck-fan.png',
        },
      ],
      collections: [
        { id: 'color-print', eyebrow: 'Color Print', title: 'Rich & Expressive', body: 'Color-led papers for expressive packaging, print collateral and brand systems that need stable color language.' },
        { id: 'touch', eyebrow: 'Touch', title: 'Tactile & Natural', body: 'Soft-touch and natural-feel papers designed for close hand contact, refined unboxing and sensory print experiences.' },
        { id: 'pearl', eyebrow: 'Pearl', title: 'Lustre & Elegance', body: 'Pearlescent surfaces for beauty, fragrance and ceremonial packaging where light needs to move gently.' },
        { id: 'coated', eyebrow: 'Coated', title: 'Smooth & Refined', body: 'Coated papers for sharp printing, smooth finishing and polished commercial presentation.' },
        { id: 'digital-coated', eyebrow: 'Digital Coated', title: 'Vivid & Precise', body: 'Digital-print friendly coated papers for short-run packaging, rapid sampling and precise proofing.' },
        { id: 'bag', eyebrow: 'Bag', title: 'Strong & Beautiful', body: 'High-strength papers for premium shopping bags that need structure, color and a refined touch.' },
        { id: 'label', eyebrow: 'Label', title: 'Fine & Functional', body: 'Label papers for wine, spirits, beauty and specialty goods requiring fine print and finishing control.' },
        { id: 'bespoke', eyebrow: 'Bespoke', title: 'By Your Vision', body: 'Custom color, paper and surface systems developed with brand teams and packaging designers.' },
      ],
      surfaces: [
        { id: 'texture', eyebrow: 'Texture', title: 'Material grain and paper memory', body: 'Real paper texture gives packaging a calm physical presence before print or finishing begins.', image: '/vanglam/surface-tile.png' },
        { id: 'tactility', eyebrow: 'Tactility', title: 'Touch-led surface systems', body: 'Soft, skin-like or dry-touch finishes make the material memorable without becoming decorative noise.' },
        { id: 'pearlescent', eyebrow: 'Pearlescent', title: 'Controlled mineral glow', body: 'A restrained light response for beauty, fragrance, invitations and high-end paper objects.' },
        { id: 'embossing', eyebrow: 'Embossing', title: 'Pressure, relief and shadow', body: 'Embossed and debossed details add structure, hierarchy and a tangible premium signal.' },
        { id: 'coating', eyebrow: 'Coating', title: 'Print-ready surface refinement', body: 'Coating controls ink behavior, smoothness and consistency across packaging and print work.' },
        { id: 'foil', eyebrow: 'Foil & Stamping', title: 'Metallic accents with restraint', body: 'Foil and stamping should amplify color and identity rather than cover the material itself.' },
        { id: 'uv', eyebrow: 'UV & Special', title: 'Gloss contrast and special finishes', body: 'Local UV, screen printing and special treatments create deliberate contrast on quiet material bases.' },
      ],
      applications: [
        { id: 'wine', eyebrow: 'Wine & Spirits Labels', title: 'Labels with depth and wet-strength logic', body: 'Material recommendations for wine labels, spirit boxes and premium cellar-ready presentation.' },
        { id: 'beauty', eyebrow: 'Beauty & Fragrance', title: 'Soft surfaces for close personal objects', body: 'Pearl, touch and refined color systems for fragrance, skincare and cosmetic packaging.' },
        { id: 'luxury', eyebrow: 'Luxury Packaging', title: 'Quiet structure for high-value gifts', body: 'Paper, color and surface combinations for rigid boxes, sleeves and brand presentation kits.' },
        { id: 'bags', eyebrow: 'Premium Shopping Bags', title: 'Strength with brand tactility', body: 'Bag papers selected for load, fold behavior, color memory and premium handle presentation.', image: '/vanglam/application-bags.png' },
        { id: 'cards', eyebrow: 'Invitation & Cards', title: 'Paper for emotion and ceremony', body: 'Invitation, greeting and postcard materials that support embossing, foil and soft tactile response.' },
        { id: 'hotel', eyebrow: 'Hotel & Lifestyle', title: 'Material systems for hospitality', body: 'Menu, envelope, room collateral and lifestyle packaging papers with calm, durable refinement.' },
      ],
      artcard: [
        { id: 'overview', eyebrow: 'Overview', title: 'Paper for emotion.', body: "Artcard Lab is VANGLAM's high-end paper object studio, not an e-commerce catalog.", image: '/vanglam/artcard-thanks.png' },
        { id: 'invitation', eyebrow: 'Invitation Cards', title: 'Ceremonial color and finish', body: 'Invitation papers balancing print clarity, embossing depth and refined hand feel.' },
        { id: 'greeting', eyebrow: 'Greeting Cards', title: 'Small objects with lasting touch', body: 'Greeting cards, thank-you cards and seasonal paper objects with emotional material presence.' },
        { id: 'postcards', eyebrow: 'Postcards', title: 'Compact paper stories', body: 'Postcard systems that carry image, type and surface in a memorable tactile format.' },
        { id: 'objects', eyebrow: 'Paper Objects', title: 'Folded, pressed and crafted forms', body: 'Material-led exploration for paper sculptures, keepsakes and refined presentation pieces.' },
        { id: 'stationery', eyebrow: 'Brand Stationery', title: 'Identity in paper form', body: 'Stationery systems for brands that need envelopes, cards and documents with one material voice.' },
      ],
      atelierStory: [
        { id: 'manufacturing', eyebrow: 'Manufacturing', title: 'Real manufacturing.', body: 'QiLi Paper grounds the VANGLAM experience in actual paper production, surface control and repeatable delivery.' },
        { id: 'sample-making', eyebrow: 'Sample Making', title: 'Thoughtful process.', body: 'Sample making turns color, paper and surface intent into physical decisions designers can judge by hand.' },
        { id: 'quality-control', eyebrow: 'Quality Control', title: 'Lasting quality.', body: 'Batch-to-batch testing, print trials and finishing checks keep the material system credible.' },
        { id: 'philosophy', eyebrow: 'Material Philosophy', title: 'Quiet, material-led, editorial, useful.', body: 'The website should feel like a high-end material showroom: useful, restrained and grounded in craft.' },
        { id: 'founder-story', eyebrow: 'Founder Story', title: 'From paper making to material language', body: 'The founder story is presented through capability, standards and material judgment rather than sales claims.' },
      ],
    },
    colorIndex: {
      eyebrow: 'Full Color Index',
      title: '42 Core Colors - 6 Families - 3 Signature Colors.',
      familyDescriptions: {
        'cloud-ink': '6 FAMILIES / 42 COLORS / 3 SIGNATURE COLORS',
        'gilded-earth': 'RICH EARTH OXIDES AND BAKED MINERAL TONES',
        'cask-reserve': 'DEEP BURGUNDY, CRIMSON, AND AGED WOOD AESTHETICS',
        'celadon-jade': 'TRADITIONAL MINERAL JADES AND DEEP FOREST GREENS',
        'mineral-sea': 'DEEP SEA INDIGOS AND LIGHT CERULEAN MINERAL GLAZES',
        'lacquer-bloom': 'BRIGHT FLORAL CINNABAR AND DARK LACQUER PURPLES',
      },
    },
    processIconLabel: 'Atelier process',
    requestAside: 'Sample requests are routed by project, application and finishing needs.',
    projectIntake: 'Project Intake',
    projectIntakeTitle: 'Tell us what your material needs to do.',
    requestFields: englishRequestFields,
    requestSuccess: 'Sample kit request received',
    requestLinks: {
      colorSystem: 'Explore Color System',
      collections: 'Browse Collections',
      surfaces: 'Study Surfaces',
    },
    footer: {
      columns: [
        {
          title: 'COMPANY',
          links: [
            { label: 'About QiLi Paper', to: '/vanglam/atelier' },
            { label: 'Sustainability', to: '/vanglam/atelier' },
            { label: 'News & Insights', to: '/vanglam/atelier' },
            { label: 'Careers', to: '/vanglam/atelier' },
          ],
        },
        {
          title: 'SUPPORT',
          links: [
            { label: 'Sample Kit', to: '/vanglam/request-sample-kit' },
            { label: 'Technical Information', to: '/vanglam/surfaces' },
            { label: 'FAQs', to: '/vanglam/color-system' },
            { label: 'Contact Us', to: '/vanglam/request-sample-kit' },
          ],
        },
        {
          title: 'POLICIES',
          links: [
            { label: 'Privacy Policy', to: '/vanglam/atelier' },
            { label: 'Terms of Use', to: '/vanglam/atelier' },
          ],
        },
      ],
      connectTitle: 'CONNECT',
      socialsAria: 'Social links',
      instagramAria: 'Instagram',
      linkedinAria: 'LinkedIn',
      contactAria: 'Contact VANGLAM',
      rights: '© 2024 QiLi Paper. All rights reserved.',
      line: 'Crafted in paper. Made for beauty.',
    },
  },
  zh: {
    brandHomeAria: '齐力纸业 VANGLAM 官网首页',
    brandTagline: '色彩 · 纸张 · 表面',
    navAria: '主导航',
    nav: [
      { key: 'color-system', label: '色彩系统', to: '/vanglam/color-system' },
      { key: 'collections', label: '产品系列', to: '/vanglam/collections' },
      { key: 'surfaces', label: '表面工艺', to: '/vanglam/surfaces' },
      { key: 'applications', label: '应用场景', to: '/vanglam/applications' },
      { key: 'artcard-lab', label: '艺术卡实验室', to: '/vanglam/artcard-lab' },
      { key: 'atelier', label: '纸艺工坊', to: '/vanglam/atelier' },
    ],
    requestSample: '索取样品套装',
    languageToggleAria: '切换到英文',
    home: {
      heroTitle: '灵魂之色，落于每一寸纸面。',
      heroLines: ['灵魂之色。', '品牌印记，', '落于纸面。'],
      heroBodyLines: ['齐力纸业是一间材料工坊。', '我们创造色彩、纸张与表面系统，', '为高端包装、印刷与创意体验，', '建立可触摸的品牌质感。'],
      discoverColorSystem: '探索 VANGLAM 色彩系统',
      signatureHeading: '三款标志色',
      explore: '探索',
      colorSystemEyebrow: 'VANGLAM 色彩系统',
      colorSystemTitle: '以纸张承载的色彩语言。',
      colorSystemBodyLines: ['42 款核心色组成高端材料系统，', '服务包装、标签与印刷的一致表达。', '并通过分光测色仪进行确认。'],
      exploreSystem: '探索系统',
      collectionsHeading: '产品系列',
      featureGridAria: '表面工艺、应用场景与艺术卡实验室',
      surfacesTitle: '表面工艺',
      applicationsTitle: '应用场景',
      artcardTitle: '艺术卡实验室',
      artcardBodyLines: ['以纸传递情绪。', '邀请函、贺卡、明信片，', '以及高端纸艺物件。'],
      exploreArtcard: '探索艺术卡实验室',
      atelierTitle: '纸艺工坊',
      sampleTitle: '索取您的样品套装',
      sampleBody: '亲手触摸差异，从 VANGLAM 开始您的材料故事。',
      sampleButton: '索取样品套装',
    },
    signatureColors: [
      { id: 'stone-green', name: '石绿', phrase: '自然深度，静默力量。', alt: '石绿 VANGLAM 纹理色卡', aria: '在 VANGLAM 色彩系统中探索石绿' },
      { id: 'autumn-citron', name: '秋香', phrase: '传承光泽，恒久温度。', alt: '秋香 VANGLAM 纹理色卡', aria: '在 VANGLAM 色彩系统中探索秋香' },
      { id: 'cobalt-blue', name: '钴蓝', phrase: '克制清澈，国际识别。', alt: '钴蓝 VANGLAM 纹理色卡', aria: '在 VANGLAM 色彩系统中探索钴蓝' },
    ],
    collections: [
      { id: 'color-print', name: '色彩印刷', summary: '浓郁而富表现力', aria: '探索色彩印刷系列' },
      { id: 'touch', name: '触感纸', summary: '自然触感', aria: '探索触感纸系列' },
      { id: 'pearl', name: '珠光纸', summary: '柔和光泽', aria: '探索珠光纸系列' },
      { id: 'coated', name: '涂布纸', summary: '顺滑精致', aria: '探索涂布纸系列' },
      { id: 'digital-coated', name: '数码涂布', summary: '鲜明精准', aria: '探索数码涂布系列' },
      { id: 'bag', name: '手提袋纸', summary: '强韧美观', aria: '探索手提袋纸系列' },
      { id: 'label', name: '标签纸', summary: '精细实用', aria: '探索标签纸系列' },
      { id: 'bespoke', name: '定制系统', summary: '因品牌而生', aria: '探索定制系统' },
    ],
    surfaceTerms: ['纹理', '触感', '珠光', '压纹', '涂布', '烫印', 'UV 与特殊工艺'],
    applications: [
      { id: 'wine', label: '酒类与烈酒标签' },
      { id: 'beauty', label: '美妆香氛' },
      { id: 'luxury', label: '高端包装' },
      { id: 'bags', label: '精品手提袋' },
      { id: 'cards', label: '邀请函与卡片' },
      { id: 'hotel', label: '酒店与生活方式' },
    ],
    atelierFeatures: [
      { id: 'manufacturing', title: '生产制造', body: '精密设备，稳定品质。' },
      { id: 'sample-making', title: '样品制作', body: '快速准确，让材料真实可感。' },
      { id: 'quality-control', title: '品质控制', body: '仪器检测，批次稳定。' },
      { id: 'material-philosophy', title: '材料哲学', body: '尊重纸张，也尊重未来。' },
    ],
    pages: {
      colorSystem: {
        eyebrow: '色彩系统',
        title: '以纸张承载的色彩语言。',
        body: '概览 / 标志色 / 六大色系 / 完整色彩索引 / 色彩指引 / 色卡册',
      },
      collections: {
        eyebrow: '产品系列',
        title: '为不同表达而策划的纸张家族。',
        body: '色彩印刷 / 触感 / 珠光 / 涂布 / 数码涂布 / 手提袋 / 标签 / 定制',
        asideAlt: 'VANGLAM 色卡册',
      },
      surfaces: {
        eyebrow: '表面工艺',
        title: '以纹理与工艺让创意成形。',
        body: '纹理 / 触感 / 珠光 / 压纹 / 涂布 / 烫印 / UV 与特殊工艺',
        asideAlt: '压纹纸张纹理',
      },
      applications: {
        eyebrow: '应用场景',
        title: '为每一个品牌项目匹配合适纸张。',
        body: '酒类标签 / 美妆香氛 / 高端包装 / 精品手提袋 / 邀请函与卡片 / 酒店生活方式',
        asideAlt: 'VANGLAM 手提袋与包装盒',
      },
      artcardLab: {
        eyebrow: '艺术卡实验室',
        title: '以纸传递情绪。',
        body: '邀请函、贺卡、明信片与高端纸艺物件。',
        asideAlt: '压纹感谢卡',
      },
      atelier: {
        eyebrow: '纸艺工坊',
        title: '真实制造。严谨流程。持久品质。',
        body: '生产制造 / 样品制作 / 品质控制 / 材料哲学 / 创始人故事',
        asideAlt: '纸张生产纸卷',
      },
      requestSample: {
        eyebrow: '索取样品套装',
        title: '体验差异，索取您的样品套装。',
        body: '亲手触摸差异，从 VANGLAM 开始您的材料故事。',
      },
    },
    details: {
      colorGuidance: [
        { id: 'overview', eyebrow: '概览', title: '概览 / 标志色 / 六大色系 / 完整色彩索引 / 色彩指引 / 色卡册', body: 'VANGLAM 色彩系统从三款品牌记忆色出发，扩展为六大校准色系，服务高端包装、标签与印刷。' },
        { id: 'signature', eyebrow: '标志色', title: '石绿 / 秋香 / 钴蓝', body: '三款克制的锚点色建立安静而清晰的品牌系统：自然深度、传承光泽与国际清澈感。' },
        { id: 'index', eyebrow: '完整色彩索引', title: '42 款核心色 - 6 大色系 - 3 款标志色', body: '所有色值用于沟通、打样与仪器确认，是数字参考而非最终量产标准。', image: '/vanglam/color-deck-fan.png' },
      ],
      collections: [
        { id: 'color-print', eyebrow: '色彩印刷', title: '浓郁而富表现力', body: '以色彩为核心的纸张，适用于包装、印刷物料与需要稳定色彩语言的品牌系统。' },
        { id: 'touch', eyebrow: '触感纸', title: '自然触感', body: '柔触与自然手感纸张，适合近距离接触、精致开箱与感官印刷体验。' },
        { id: 'pearl', eyebrow: '珠光纸', title: '柔和光泽', body: '为美妆、香氛与仪式感包装提供温和移动的珠光表面。' },
        { id: 'coated', eyebrow: '涂布纸', title: '顺滑精致', body: '适合清晰印刷、平滑后道与精致商业呈现的涂布纸。' },
        { id: 'digital-coated', eyebrow: '数码涂布', title: '鲜明精准', body: '适合短版包装、快速打样与精准校样的数码印刷涂布纸。' },
        { id: 'bag', eyebrow: '手提袋纸', title: '强韧美观', body: '用于精品手提袋的高强度纸张，兼顾结构、色彩与高级触感。' },
        { id: 'label', eyebrow: '标签纸', title: '精细实用', body: '服务酒类、美妆与精品商品的标签纸，支持精细印刷与后道控制。' },
        { id: 'bespoke', eyebrow: '定制系统', title: '因品牌而生', body: '与品牌团队和包装设计师共同开发定制色彩、纸张与表面系统。' },
      ],
      surfaces: [
        { id: 'texture', eyebrow: '纹理', title: '材料肌理与纸张记忆', body: '真实纸张纹理让包装在印刷与后道之前就拥有安静的物理存在感。', image: '/vanglam/surface-tile.png' },
        { id: 'tactility', eyebrow: '触感', title: '以手感主导的表面系统', body: '柔触、肤感或干爽触感让材料被记住，而不成为多余装饰。' },
        { id: 'pearlescent', eyebrow: '珠光', title: '克制的矿物光泽', body: '为美妆、香氛、邀请函与高端纸艺物件提供含蓄的光线回应。' },
        { id: 'embossing', eyebrow: '压纹', title: '压力、浮雕与阴影', body: '压纹与凹凸细节增加结构、层级与可触摸的高级信号。' },
        { id: 'coating', eyebrow: '涂布', title: '适合印刷的表面精修', body: '涂布控制油墨表现、平滑度与包装印刷的一致性。' },
        { id: 'foil', eyebrow: '烫印', title: '有节制的金属点缀', body: '烫印应放大色彩与识别，而不是遮盖材料本身。' },
        { id: 'uv', eyebrow: 'UV 与特殊工艺', title: '光泽对比与特殊处理', body: '局部 UV、丝网与特殊处理在安静材料基底上制造明确对比。' },
      ],
      applications: [
        { id: 'wine', eyebrow: '酒类标签', title: '兼具深度与湿强逻辑的标签', body: '为葡萄酒标签、烈酒盒与高端窖藏展示提供材料建议。' },
        { id: 'beauty', eyebrow: '美妆香氛', title: '适合贴近身体物件的柔和表面', body: '珠光、触感与精致色彩系统服务香氛、护肤与美妆包装。' },
        { id: 'luxury', eyebrow: '高端包装', title: '高价值礼品的安静结构', body: '为硬盒、套封与品牌展示套装提供纸张、色彩与表面组合。' },
        { id: 'bags', eyebrow: '精品手提袋', title: '兼顾强度与品牌触感', body: '根据承重、折叠表现、色彩记忆与提绳呈现选择手提袋纸。', image: '/vanglam/application-bags.png' },
        { id: 'cards', eyebrow: '邀请函与卡片', title: '为情绪与仪式感而生的纸张', body: '支持压纹、烫印与柔和触感的邀请函、贺卡与明信片材料。' },
        { id: 'hotel', eyebrow: '酒店与生活方式', title: '酒店场景的材料系统', body: '菜单、信封、客房物料与生活方式包装所需的安静耐用品质。' },
      ],
      artcard: [
        { id: 'overview', eyebrow: '概览', title: '以纸传递情绪。', body: 'Artcard Lab 是 VANGLAM 的高端纸艺物件工作室，而不是电商目录。', image: '/vanglam/artcard-thanks.png' },
        { id: 'invitation', eyebrow: '邀请函', title: '仪式化的色彩与工艺', body: '邀请函纸张平衡印刷清晰度、压纹深度与精致手感。' },
        { id: 'greeting', eyebrow: '贺卡', title: '小物件，长久触感', body: '贺卡、感谢卡与季节纸艺物件以材料承载情绪。' },
        { id: 'postcards', eyebrow: '明信片', title: '紧凑的纸张故事', body: '让图像、文字与表面在可触摸的格式中被记住。' },
        { id: 'objects', eyebrow: '纸艺物件', title: '折叠、压制与手作形态', body: '围绕纸雕、纪念物与高端展示物件进行材料探索。' },
        { id: 'stationery', eyebrow: '品牌文具', title: '纸张形态中的品牌识别', body: '为需要信封、卡片与文件统一材料语言的品牌建立文具系统。' },
      ],
      atelierStory: [
        { id: 'manufacturing', eyebrow: '生产制造', title: '真实制造。', body: '齐力纸业以真实纸张生产、表面控制与可重复交付支撑 VANGLAM 体验。' },
        { id: 'sample-making', eyebrow: '样品制作', title: '严谨流程。', body: '样品制作将色彩、纸张与表面意图转化为设计师能亲手判断的实体决策。' },
        { id: 'quality-control', eyebrow: '品质控制', title: '持久品质。', body: '批次检测、印刷试验与后道检查让材料系统保持可信。' },
        { id: 'philosophy', eyebrow: '材料哲学', title: '安静、材料主导、编辑感、实用。', body: '网站应像高端材料展厅：有用、克制，并扎根于工艺。' },
        { id: 'founder-story', eyebrow: '创始人故事', title: '从造纸到材料语言', body: '创始人故事通过能力、标准与材料判断呈现，而不是销售话术。' },
      ],
    },
    colorIndex: {
      eyebrow: '完整色彩索引',
      title: '42 款核心色 - 6 大色系 - 3 款标志色。',
      familyDescriptions: {
        'cloud-ink': '冷静云白、墨色与灰调构成基础秩序',
        'gilded-earth': '温润土色、金色与烘焙矿物调',
        'cask-reserve': '深酒红、胭脂与陈年木质美学',
        'celadon-jade': '传统矿物玉色与深林绿色',
        'mineral-sea': '深海靛蓝与浅色矿物釉感蓝',
        'lacquer-bloom': '明亮花色、朱砂与深漆紫调',
      },
    },
    processIconLabel: '工坊流程',
    requestAside: '样品请求会根据项目、应用场景与后道工艺需求进行分配。',
    projectIntake: '项目需求',
    projectIntakeTitle: '告诉我们材料需要完成什么任务。',
    requestFields: chineseRequestFields,
    requestSuccess: '样品套装请求已收到',
    requestLinks: {
      colorSystem: '探索色彩系统',
      collections: '浏览产品系列',
      surfaces: '研究表面工艺',
    },
    footer: {
      columns: [
        {
          title: '公司',
          links: [
            { label: '关于齐力纸业', to: '/vanglam/atelier' },
            { label: '可持续发展', to: '/vanglam/atelier' },
            { label: '新闻与洞察', to: '/vanglam/atelier' },
            { label: '加入我们', to: '/vanglam/atelier' },
          ],
        },
        {
          title: '支持',
          links: [
            { label: '样品套装', to: '/vanglam/request-sample-kit' },
            { label: '技术资料', to: '/vanglam/surfaces' },
            { label: '常见问题', to: '/vanglam/color-system' },
            { label: '联系我们', to: '/vanglam/request-sample-kit' },
          ],
        },
        {
          title: '政策',
          links: [
            { label: '隐私政策', to: '/vanglam/atelier' },
            { label: '使用条款', to: '/vanglam/atelier' },
          ],
        },
      ],
      connectTitle: '联系',
      socialsAria: '社交链接',
      instagramAria: 'Instagram',
      linkedinAria: 'LinkedIn',
      contactAria: '联系 VANGLAM',
      rights: '© 2024 齐力纸业。保留所有权利。',
      line: '以纸成艺，为美而生。',
    },
  },
};

const VanglamLanguageContext = createContext<VanglamLanguageContextValue | null>(null);

export const getVanglamCopy = (language: VanglamLanguage) => copies[language];

export const VanglamLanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<VanglamLanguage>(readInitialLanguage);

  useEffect(() => {
    window.localStorage.setItem(storageKey, language);
  }, [language]);

  const value = useMemo<VanglamLanguageContextValue>(
    () => ({
      language,
      copy: getVanglamCopy(language),
      toggleLanguage: () => setLanguage((current) => (current === 'en' ? 'zh' : 'en')),
    }),
    [language]
  );

  return <VanglamLanguageContext.Provider value={value}>{children}</VanglamLanguageContext.Provider>;
};

export const useVanglamLanguage = () => {
  const context = useContext(VanglamLanguageContext);

  if (!context) {
    throw new Error('useVanglamLanguage must be used inside VanglamLanguageProvider');
  }

  return context;
};

export const useVanglamCopy = () => useVanglamLanguage().copy;
