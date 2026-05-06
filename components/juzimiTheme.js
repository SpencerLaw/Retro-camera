export const JUZIMI_THEME_STORAGE_KEY = 'juzimi_theme_preference';

export const JUZIMI_THEME_FAMILIES = ['morning', 'studio', 'retreat'];
export const JUZIMI_THEME_MODES = ['day', 'night'];

const DEFAULT_THEME_PREFERENCE = { family: 'morning', mode: 'day' };

const MORNING_DAY_CARD_ACCENTS = [
  { bg: 'linear-gradient(135deg, #6c8cb0 0%, #87a5c1 40%, #d8c29e 100%)', text: '#ffffff', sub: 'rgba(255,255,255,0.7)', tagBg: 'rgba(255,255,255,0.15)', tagText: '#ffffff' },
  { bg: 'linear-gradient(135deg, #e5aba4 0%, #efcdbe 100%)', text: '#3c282a', sub: 'rgba(60,40,42,0.7)', tagBg: 'rgba(60,40,42,0.1)', tagText: '#3c282a' },
  { bg: 'linear-gradient(135deg, #abc1b8 0%, #b2ccda 100%)', text: '#ffffff', sub: 'rgba(255,255,255,0.8)', tagBg: 'rgba(255,255,255,0.2)', tagText: '#ffffff' },
  { bg: 'linear-gradient(135deg, #1a1a1c 0%, #2f3032 100%)', text: '#f0ece1', sub: 'rgba(240,236,225,0.7)', tagBg: 'rgba(240,236,225,0.15)', tagText: '#f0ece1' },
  { bg: 'linear-gradient(135deg, #7c8872 0%, #a2a08c 50%, #465158 100%)', text: '#f0ece1', sub: 'rgba(240,236,225,0.7)', tagBg: 'rgba(240,236,225,0.15)', tagText: '#f0ece1' },
  { bg: 'linear-gradient(135deg, #9bb0ba 0%, #c1ced4 100%)', text: '#1a1f22', sub: 'rgba(26,31,34,0.7)', tagBg: 'rgba(26,31,34,0.1)', tagText: '#1a1f22' },
  { bg: 'linear-gradient(135deg, #2a4c7e 0%, #5b81ae 100%)', text: '#ffffff', sub: 'rgba(255,255,255,0.7)', tagBg: 'rgba(255,255,255,0.2)', tagText: '#ffffff' },
  { bg: '#dcd8c8', text: '#2a2622', sub: 'rgba(42,38,34,0.7)', tagBg: 'rgba(42,38,34,0.1)', tagText: '#2a2622' },
  { bg: 'linear-gradient(135deg, #dfa2ab 0%, #f1ccb5 100%)', text: '#3c282a', sub: 'rgba(60,40,42,0.7)', tagBg: 'rgba(60,40,42,0.1)', tagText: '#3c282a' },
  { bg: '#d6cdbd', text: '#2a2622', sub: 'rgba(42,38,34,0.7)', tagBg: 'rgba(42,38,34,0.1)', tagText: '#2a2622' },
];

const MORNING_NIGHT_CARD_ACCENTS = [
  { bg: 'linear-gradient(135deg, #23354d 0%, #355a78 48%, #9d7a4b 100%)', text: '#fff7e8', sub: 'rgba(255,247,232,0.72)', tagBg: 'rgba(255,247,232,0.14)', tagText: '#fff7e8' },
  { bg: 'linear-gradient(135deg, #4b2d36 0%, #7a4d57 52%, #d9a37d 100%)', text: '#fff6ee', sub: 'rgba(255,246,238,0.72)', tagBg: 'rgba(255,246,238,0.14)', tagText: '#fff6ee' },
  { bg: 'linear-gradient(135deg, #1b3835 0%, #51736e 54%, #a9c3b5 100%)', text: '#f7fff9', sub: 'rgba(247,255,249,0.74)', tagBg: 'rgba(247,255,249,0.14)', tagText: '#f7fff9' },
  { bg: 'linear-gradient(135deg, #100f12 0%, #2b2528 56%, #4f3d32 100%)', text: '#f3eadc', sub: 'rgba(243,234,220,0.7)', tagBg: 'rgba(243,234,220,0.13)', tagText: '#f3eadc' },
  { bg: 'linear-gradient(135deg, #34392f 0%, #5d6152 50%, #202b31 100%)', text: '#f4efdf', sub: 'rgba(244,239,223,0.72)', tagBg: 'rgba(244,239,223,0.13)', tagText: '#f4efdf' },
  { bg: 'linear-gradient(135deg, #273b42 0%, #76919a 100%)', text: '#f7fbfb', sub: 'rgba(247,251,251,0.76)', tagBg: 'rgba(247,251,251,0.14)', tagText: '#f7fbfb' },
];

const STUDIO_DAY_CARD_ACCENTS = [
  { surface: 'rgba(255,255,255,0.9)', cover: 'linear-gradient(135deg, #111827 0%, #2858b7 34%, #ff3f7f 68%, #ffb347 100%)', text: '#141315', sub: 'rgba(20,19,21,0.62)', tagBg: 'rgba(38,99,235,0.12)', tagText: '#315fbd' },
  { surface: 'rgba(255,255,255,0.92)', cover: 'linear-gradient(135deg, #05b98f 0%, #fb2f71 34%, #ffb21e 64%, #fff0b8 100%)', text: '#141315', sub: 'rgba(20,19,21,0.62)', tagBg: 'rgba(236,72,153,0.12)', tagText: '#a13269' },
  { surface: 'rgba(255,255,255,0.9)', cover: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 38%, #f472b6 72%, #fde68a 100%)', text: '#141315', sub: 'rgba(20,19,21,0.62)', tagBg: 'rgba(139,92,246,0.12)', tagText: '#6845bc' },
  { surface: 'rgba(255,255,255,0.9)', cover: 'linear-gradient(135deg, #111827 0%, #334155 28%, #f97316 62%, #facc15 100%)', text: '#141315', sub: 'rgba(20,19,21,0.62)', tagBg: 'rgba(249,115,22,0.12)', tagText: '#99541d' },
];

const STUDIO_NIGHT_CARD_ACCENTS = [
  { surface: 'rgba(16,18,23,0.9)', cover: 'linear-gradient(135deg, #020617 0%, #1d4ed8 34%, #db2777 68%, #f97316 100%)', text: '#f8fafc', sub: 'rgba(248,250,252,0.62)', tagBg: 'rgba(96,165,250,0.16)', tagText: '#bfdbfe' },
  { surface: 'rgba(17,18,24,0.9)', cover: 'linear-gradient(135deg, #064e3b 0%, #be123c 36%, #f59e0b 72%, #fde68a 100%)', text: '#f8fafc', sub: 'rgba(248,250,252,0.62)', tagBg: 'rgba(244,114,182,0.14)', tagText: '#fbcfe8' },
  { surface: 'rgba(18,16,27,0.9)', cover: 'linear-gradient(135deg, #1d4ed8 0%, #6d28d9 42%, #be185d 74%, #fbbf24 100%)', text: '#f8fafc', sub: 'rgba(248,250,252,0.62)', tagBg: 'rgba(167,139,250,0.16)', tagText: '#ddd6fe' },
  { surface: 'rgba(18,18,18,0.91)', cover: 'linear-gradient(135deg, #030712 0%, #1f2937 28%, #ea580c 64%, #facc15 100%)', text: '#f8fafc', sub: 'rgba(248,250,252,0.62)', tagBg: 'rgba(251,191,36,0.14)', tagText: '#fde68a' },
];

const RETREAT_CARD_ACCENTS = [
  { image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=82', mood: '海风', price: '#01', text: '#ffffff', sub: 'rgba(255,255,255,0.7)', tagBg: 'rgba(255,255,255,0.18)', tagText: '#ffffff' },
  { image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=900&q=82', mood: '木屋', price: '#02', text: '#ffffff', sub: 'rgba(255,255,255,0.72)', tagBg: 'rgba(255,255,255,0.18)', tagText: '#ffffff' },
  { image: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=82', mood: '暮色', price: '#03', text: '#ffffff', sub: 'rgba(255,255,255,0.7)', tagBg: 'rgba(255,255,255,0.16)', tagText: '#ffffff' },
  { image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=82', mood: '山谷', price: '#04', text: '#ffffff', sub: 'rgba(255,255,255,0.72)', tagBg: 'rgba(255,255,255,0.18)', tagText: '#ffffff' },
  { image: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=900&q=82', mood: '森林', price: '#05', text: '#ffffff', sub: 'rgba(255,255,255,0.72)', tagBg: 'rgba(255,255,255,0.16)', tagText: '#ffffff' },
  { image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=82', mood: '远方', price: '#06', text: '#ffffff', sub: 'rgba(255,255,255,0.7)', tagBg: 'rgba(255,255,255,0.18)', tagText: '#ffffff' },
];

const withFrostedGlass = (accents, glass) => accents.map(accent => ({
  ...accent,
  glass,
}));

const GLASS_MORNING_DAY = {
  surface: 'rgba(255,255,255,0.28)',
  tint: 'linear-gradient(180deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.08) 36%, rgba(19,24,28,0.42) 100%)',
  border: 'rgba(255,255,255,0.62)',
  shadow: 'rgba(91,71,45,0.24)',
  highlight: 'rgba(255,255,255,0.58)',
};

const GLASS_MORNING_NIGHT = {
  surface: 'rgba(255,246,226,0.12)',
  tint: 'linear-gradient(180deg, rgba(255,244,218,0.13) 0%, rgba(255,244,218,0.04) 34%, rgba(0,0,0,0.5) 100%)',
  border: 'rgba(255,230,185,0.24)',
  shadow: 'rgba(0,0,0,0.46)',
  highlight: 'rgba(255,239,203,0.25)',
};

const GLASS_STUDIO_DAY = {
  surface: 'rgba(255,255,255,0.24)',
  tint: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.02) 32%, rgba(9,13,22,0.5) 100%)',
  border: 'rgba(255,255,255,0.7)',
  shadow: 'rgba(55,65,81,0.28)',
  highlight: 'rgba(255,255,255,0.66)',
};

const GLASS_STUDIO_NIGHT = {
  surface: 'rgba(255,255,255,0.1)',
  tint: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 30%, rgba(0,0,0,0.58) 100%)',
  border: 'rgba(255,255,255,0.2)',
  shadow: 'rgba(0,0,0,0.56)',
  highlight: 'rgba(255,255,255,0.2)',
};

const GLASS_RETREAT_DAY = {
  surface: 'rgba(255,255,255,0.18)',
  tint: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(15,23,42,0.08) 34%, rgba(9,14,18,0.76) 100%)',
  border: 'rgba(255,255,255,0.48)',
  shadow: 'rgba(31,41,55,0.32)',
  highlight: 'rgba(255,255,255,0.42)',
  edge: 'rgba(255,198,216,0.42)',
  glow: 'rgba(255,166,196,0.24)',
};

const GLASS_RETREAT_NIGHT = {
  surface: 'rgba(255,255,255,0.1)',
  tint: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.14) 34%, rgba(0,0,0,0.82) 100%)',
  border: 'rgba(255,255,255,0.22)',
  shadow: 'rgba(0,0,0,0.58)',
  highlight: 'rgba(255,255,255,0.22)',
  edge: 'rgba(255,192,214,0.36)',
  glow: 'rgba(255,162,196,0.22)',
};

const commonTheme = {
  cardShadowClass: 'shadow-[0_18px_52px_rgba(23,19,16,0.13)] hover:shadow-[0_22px_70px_rgba(23,19,16,0.18)]',
  errorClass: 'mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700',
};

export const JUZIMI_THEMES = {
  morning: {
    day: {
      ...commonTheme,
      family: 'morning',
      mode: 'day',
      name: '晨光',
      modeLabel: '白天',
      cardVariant: 'poster',
      rootClass: 'bg-[#f8f0e3] text-[#171310]',
      titleClass: 'text-[#171310]',
      mutedClass: 'text-[#5f5448]',
      accentClass: 'text-[#8c6b3f]',
      backgroundBase: 'bg-[linear-gradient(120deg,#fff7e8_0%,#f5e5cf_34%,#eadfcb_58%,#f6ded2_78%,#edf3e9_100%)]',
      backgroundDriftStyle: {
        backgroundImage: [
          'radial-gradient(circle at 16% 18%, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.56) 16%, transparent 36%)',
          'radial-gradient(circle at 75% 8%, rgba(230,184,105,0.46) 0%, rgba(230,184,105,0.2) 22%, transparent 42%)',
          'radial-gradient(circle at 88% 72%, rgba(151,184,173,0.36) 0%, rgba(151,184,173,0.16) 20%, transparent 44%)',
          'radial-gradient(circle at 10% 86%, rgba(230,150,126,0.28) 0%, rgba(230,150,126,0.12) 18%, transparent 38%)',
        ].join(', '),
        backgroundSize: '150% 150%, 130% 130%, 140% 140%, 120% 120%',
        animation: 'juzimi-gradient-drift 18s ease-in-out infinite',
      },
      gridClass: 'bg-[linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(180deg,rgba(116,91,61,0.024)_1px,transparent_1px)] bg-[size:88px_88px]',
      noiseClass: 'opacity-[0.14] mix-blend-multiply',
      glows: [
        { className: 'juzimi-bg-breathe absolute left-[-16vw] top-[8vh] h-[66vh] w-[52vw] rounded-full bg-[#fff8dc]/70 blur-3xl mix-blend-screen', style: { animation: 'juzimi-breathe-a 14s ease-in-out infinite' } },
        { className: 'juzimi-bg-breathe absolute right-[-15vw] top-[2vh] h-[76vh] w-[44vw] rounded-full bg-[#e8c27d]/28 blur-3xl mix-blend-multiply', style: { animation: 'juzimi-breathe-b 17s ease-in-out infinite' } },
        { className: 'juzimi-bg-breathe absolute right-[4vw] bottom-[-20vh] h-[52vh] w-[42vw] rounded-full bg-[#9fbcaf]/28 blur-3xl mix-blend-multiply', style: { animation: 'juzimi-breathe-a 20s ease-in-out infinite reverse' } },
      ],
      headerIconButtonClass: 'h-11 w-11 rounded-full bg-white/80 border border-black/10 shadow-sm flex items-center justify-center hover:bg-white transition-colors',
      headerPillClass: 'h-11 rounded-full bg-white/85 border border-black/10 px-4 font-black flex items-center gap-2 shadow-sm hover:bg-white transition-colors text-[#171310]',
      primaryButtonClass: 'rounded-2xl bg-[#171310] text-white font-black flex items-center justify-center gap-2 shadow-lg',
      secondaryButtonClass: 'rounded-2xl bg-white border border-black/10 text-slate-700 font-black',
      switchWrapClass: 'flex items-center gap-1 rounded-full bg-white/62 backdrop-blur-xl border border-[#dcc28e]/40 p-1 shadow-[0_12px_38px_rgba(138,102,45,0.14)]',
      switchButtonClass: 'h-9 rounded-full px-3 text-xs font-black flex items-center gap-1.5 text-[#6f6254] hover:bg-white/70 transition-colors',
      searchPanelClass: 'w-full md:w-80 shrink-0 rounded-2xl bg-[#fff9ed]/66 backdrop-blur-xl border border-[#dcc28e]/45 p-4 shadow-[0_22px_70px_rgba(138,102,45,0.18)]',
      searchCountClass: 'text-sm font-black text-[#6f6254]',
      searchIconClass: 'absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c6b3f]/70',
      inputClass: 'w-full h-11 rounded-xl bg-[#fffaf1]/72 border border-[#c7a46c]/24 pl-10 pr-4 outline-none text-[#171310] placeholder:text-[#8b7a68]/58 font-bold text-sm shadow-inner focus:bg-white/85 focus:border-[#c7a46c]/70 transition-colors',
      panelClass: 'mb-8 rounded-[2rem] bg-white/85 backdrop-blur border border-black/10 shadow-[0_20px_60px_rgba(23,19,16,0.12)] overflow-hidden',
      panelHeaderClass: 'p-5 md:p-6 border-b border-black/10 flex items-center justify-between gap-3',
      panelInputClass: 'rounded-2xl border border-black/10 bg-[#f8f3eb] px-4 font-bold outline-none focus:border-[#c7a46c] text-[#171310] placeholder:text-[#8b7a68]/58',
      panelTextAreaClass: 'rounded-3xl border border-black/10 bg-[#f8f3eb] p-5 font-serif text-xl leading-9 outline-none focus:border-[#c7a46c] resize-none text-[#171310] placeholder:text-[#8b7a68]/58',
      closeButtonClass: 'h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 text-[#171310]',
      emptyStateClass: 'py-16 md:py-24 text-center',
      cardAccents: withFrostedGlass(MORNING_DAY_CARD_ACCENTS, GLASS_MORNING_DAY),
    },
    night: {
      ...commonTheme,
      family: 'morning',
      mode: 'night',
      name: '晨光',
      modeLabel: '黑夜',
      cardVariant: 'poster',
      rootClass: 'bg-[#15110e] text-[#f6ead8]',
      titleClass: 'text-[#fff3e2]',
      mutedClass: 'text-[#cdbda7]',
      accentClass: 'text-[#d6b16e]',
      backgroundBase: 'bg-[linear-gradient(120deg,#15110e_0%,#24180f_35%,#182026_68%,#2a1b22_100%)]',
      backgroundDriftStyle: {
        backgroundImage: [
          'radial-gradient(circle at 18% 14%, rgba(255,236,184,0.22) 0%, rgba(255,236,184,0.1) 18%, transparent 38%)',
          'radial-gradient(circle at 78% 10%, rgba(215,149,61,0.32) 0%, rgba(215,149,61,0.16) 24%, transparent 46%)',
          'radial-gradient(circle at 84% 74%, rgba(93,143,136,0.3) 0%, rgba(93,143,136,0.13) 22%, transparent 45%)',
          'radial-gradient(circle at 8% 84%, rgba(188,83,96,0.24) 0%, rgba(188,83,96,0.1) 20%, transparent 42%)',
        ].join(', '),
        backgroundSize: '145% 145%, 130% 130%, 140% 140%, 120% 120%',
        animation: 'juzimi-gradient-drift 20s ease-in-out infinite',
      },
      gridClass: 'bg-[linear-gradient(90deg,rgba(255,247,232,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(255,247,232,0.045)_1px,transparent_1px)] bg-[size:88px_88px]',
      noiseClass: 'opacity-[0.2] mix-blend-overlay',
      glows: [
        { className: 'juzimi-bg-breathe absolute left-[-18vw] top-[10vh] h-[62vh] w-[48vw] rounded-full bg-[#d4a356]/16 blur-3xl mix-blend-screen', style: { animation: 'juzimi-breathe-a 15s ease-in-out infinite' } },
        { className: 'juzimi-bg-breathe absolute right-[-16vw] top-[0vh] h-[78vh] w-[46vw] rounded-full bg-[#734b27]/36 blur-3xl mix-blend-screen', style: { animation: 'juzimi-breathe-b 18s ease-in-out infinite' } },
        { className: 'juzimi-bg-breathe absolute right-[4vw] bottom-[-22vh] h-[52vh] w-[42vw] rounded-full bg-[#4c8a81]/18 blur-3xl mix-blend-screen', style: { animation: 'juzimi-breathe-a 21s ease-in-out infinite reverse' } },
      ],
      headerIconButtonClass: 'h-11 w-11 rounded-full bg-[#251e18]/76 border border-[#d6b16e]/20 shadow-sm flex items-center justify-center hover:bg-[#2f261d] transition-colors text-[#fff3e2]',
      headerPillClass: 'h-11 rounded-full bg-[#251e18]/76 border border-[#d6b16e]/20 px-4 font-black flex items-center gap-2 shadow-sm hover:bg-[#2f261d] transition-colors text-[#fff3e2]',
      primaryButtonClass: 'rounded-2xl bg-[#f3d9a0] text-[#171310] font-black flex items-center justify-center gap-2 shadow-lg',
      secondaryButtonClass: 'rounded-2xl bg-[#251e18]/80 border border-[#d6b16e]/20 text-[#f6ead8] font-black',
      switchWrapClass: 'flex items-center gap-1 rounded-full bg-[#211914]/70 backdrop-blur-xl border border-[#d6b16e]/20 p-1 shadow-[0_12px_38px_rgba(0,0,0,0.28)]',
      switchButtonClass: 'h-9 rounded-full px-3 text-xs font-black flex items-center gap-1.5 text-[#f3d9a0] hover:bg-[#f3d9a0]/12 transition-colors',
      searchPanelClass: 'w-full md:w-80 shrink-0 rounded-2xl bg-[#211914]/72 backdrop-blur-xl border border-[#d6b16e]/20 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.32)]',
      searchCountClass: 'text-sm font-black text-[#cdbda7]',
      searchIconClass: 'absolute left-3.5 top-1/2 -translate-y-1/2 text-[#d6b16e]/78',
      inputClass: 'w-full h-11 rounded-xl bg-[#fff3e2]/10 border border-[#d6b16e]/20 pl-10 pr-4 outline-none text-[#fff3e2] placeholder:text-[#cdbda7]/55 font-bold text-sm shadow-inner focus:bg-[#fff3e2]/14 focus:border-[#d6b16e]/70 transition-colors',
      panelClass: 'mb-8 rounded-[2rem] bg-[#211914]/86 backdrop-blur border border-[#d6b16e]/18 shadow-[0_20px_70px_rgba(0,0,0,0.36)] overflow-hidden',
      panelHeaderClass: 'p-5 md:p-6 border-b border-[#d6b16e]/16 flex items-center justify-between gap-3',
      panelInputClass: 'rounded-2xl border border-[#d6b16e]/18 bg-[#fff3e2]/10 px-4 font-bold outline-none focus:border-[#d6b16e] text-[#fff3e2] placeholder:text-[#cdbda7]/55',
      panelTextAreaClass: 'rounded-3xl border border-[#d6b16e]/18 bg-[#fff3e2]/10 p-5 font-serif text-xl leading-9 outline-none focus:border-[#d6b16e] resize-none text-[#fff3e2] placeholder:text-[#cdbda7]/55',
      closeButtonClass: 'h-10 w-10 rounded-full bg-[#fff3e2]/10 flex items-center justify-center hover:bg-[#fff3e2]/16 text-[#fff3e2]',
      emptyStateClass: 'py-16 md:py-24 text-center',
      cardAccents: withFrostedGlass(MORNING_NIGHT_CARD_ACCENTS, GLASS_MORNING_NIGHT),
    },
  },
  studio: {
    day: {
      ...commonTheme,
      family: 'studio',
      mode: 'day',
      name: '流光',
      modeLabel: '白天',
      cardVariant: 'studio',
      rootClass: 'bg-[#f6f7fb] text-[#151518]',
      titleClass: 'text-[#111113]',
      mutedClass: 'text-[#63646b]',
      accentClass: 'text-[#a36a2d]',
      backgroundBase: 'bg-[linear-gradient(135deg,#f7f8fb_0%,#eef3ff_28%,#fff4e8_62%,#f8fbf4_100%)]',
      backgroundDriftStyle: {
        backgroundImage: [
          'radial-gradient(circle at 18% 18%, rgba(255,255,255,0.92) 0%, transparent 34%)',
          'radial-gradient(circle at 76% 12%, rgba(255,95,119,0.34) 0%, rgba(255,173,72,0.24) 20%, transparent 42%)',
          'radial-gradient(circle at 90% 74%, rgba(83,146,255,0.24) 0%, rgba(41,216,179,0.14) 22%, transparent 44%)',
          'radial-gradient(circle at 10% 84%, rgba(255,195,64,0.18) 0%, transparent 38%)',
        ].join(', '),
        backgroundSize: '140% 140%, 130% 130%, 135% 135%, 120% 120%',
        animation: 'juzimi-gradient-drift 15s ease-in-out infinite',
      },
      gridClass: 'bg-[linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(180deg,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[size:92px_92px]',
      noiseClass: 'opacity-[0.1] mix-blend-multiply',
      glows: [
        { className: 'juzimi-bg-breathe absolute left-[-18vw] top-[8vh] h-[58vh] w-[48vw] rounded-full bg-white/70 blur-3xl mix-blend-screen', style: { animation: 'juzimi-breathe-a 14s ease-in-out infinite' } },
        { className: 'juzimi-bg-breathe absolute right-[-14vw] top-[-4vh] h-[72vh] w-[48vw] rounded-full bg-[#ff7b3d]/28 blur-3xl mix-blend-multiply', style: { animation: 'juzimi-breathe-b 16s ease-in-out infinite' } },
        { className: 'juzimi-bg-breathe absolute right-[4vw] bottom-[-22vh] h-[52vh] w-[44vw] rounded-full bg-[#5fd8d0]/20 blur-3xl mix-blend-multiply', style: { animation: 'juzimi-breathe-a 19s ease-in-out infinite reverse' } },
      ],
      headerIconButtonClass: 'h-11 w-11 rounded-full bg-white/86 border border-black/8 shadow-sm flex items-center justify-center hover:bg-white transition-colors text-[#151518]',
      headerPillClass: 'h-11 rounded-full bg-white/86 border border-black/8 px-4 font-black flex items-center gap-2 shadow-sm hover:bg-white transition-colors text-[#151518]',
      primaryButtonClass: 'rounded-2xl bg-[#151518] text-white font-black flex items-center justify-center gap-2 shadow-lg',
      secondaryButtonClass: 'rounded-2xl bg-white border border-black/10 text-[#555861] font-black',
      switchWrapClass: 'flex items-center gap-1 rounded-full bg-white/76 backdrop-blur-xl border border-white/80 p-1 shadow-[0_14px_42px_rgba(65,74,92,0.14)]',
      switchButtonClass: 'h-9 rounded-full px-3 text-xs font-black flex items-center gap-1.5 text-[#555861] hover:bg-[#f3f6ff] transition-colors',
      searchPanelClass: 'w-full md:w-80 shrink-0 rounded-[1.55rem] bg-white/78 backdrop-blur-xl border border-white/80 p-4 shadow-[0_22px_70px_rgba(65,74,92,0.16)]',
      searchCountClass: 'text-sm font-black text-[#62656f]',
      searchIconClass: 'absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9a6a32]/75',
      inputClass: 'w-full h-11 rounded-[1.1rem] bg-white/86 border border-black/8 pl-10 pr-4 outline-none text-[#151518] placeholder:text-[#818794]/68 font-bold text-sm shadow-[inset_0_1px_4px_rgba(15,23,42,0.08)] focus:border-[#ff9b45]/60 transition-colors',
      panelClass: 'mb-8 rounded-[2rem] bg-white/78 backdrop-blur border border-white/80 shadow-[0_20px_70px_rgba(65,74,92,0.14)] overflow-hidden',
      panelHeaderClass: 'p-5 md:p-6 border-b border-black/8 flex items-center justify-between gap-3',
      panelInputClass: 'rounded-2xl border border-black/10 bg-white/86 px-4 font-bold outline-none focus:border-[#ff9b45] text-[#151518] placeholder:text-[#818794]/68',
      panelTextAreaClass: 'rounded-3xl border border-black/10 bg-white/86 p-5 font-serif text-xl leading-9 outline-none focus:border-[#ff9b45] resize-none text-[#151518] placeholder:text-[#818794]/68',
      closeButtonClass: 'h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 text-[#151518]',
      emptyStateClass: 'py-16 md:py-24 text-center',
      cardAccents: withFrostedGlass(STUDIO_DAY_CARD_ACCENTS, GLASS_STUDIO_DAY),
    },
    night: {
      ...commonTheme,
      family: 'studio',
      mode: 'night',
      name: '流光',
      modeLabel: '黑夜',
      cardVariant: 'studio',
      rootClass: 'bg-[#07080d] text-[#f8fafc]',
      titleClass: 'text-[#f8fafc]',
      mutedClass: 'text-[#b7bdca]',
      accentClass: 'text-[#ffd166]',
      backgroundBase: 'bg-[linear-gradient(135deg,#07080d_0%,#10131f_32%,#160b13_62%,#081714_100%)]',
      backgroundDriftStyle: {
        backgroundImage: [
          'radial-gradient(circle at 20% 18%, rgba(68,93,255,0.2) 0%, transparent 36%)',
          'radial-gradient(circle at 78% 12%, rgba(255,60,105,0.34) 0%, rgba(255,149,42,0.2) 22%, transparent 46%)',
          'radial-gradient(circle at 88% 74%, rgba(43,210,190,0.22) 0%, rgba(43,210,190,0.1) 22%, transparent 44%)',
          'radial-gradient(circle at 10% 86%, rgba(251,191,36,0.16) 0%, transparent 38%)',
        ].join(', '),
        backgroundSize: '145% 145%, 130% 130%, 135% 135%, 120% 120%',
        animation: 'juzimi-gradient-drift 16s ease-in-out infinite',
      },
      gridClass: 'bg-[linear-gradient(90deg,rgba(248,250,252,0.055)_1px,transparent_1px),linear-gradient(180deg,rgba(248,250,252,0.04)_1px,transparent_1px)] bg-[size:92px_92px]',
      noiseClass: 'opacity-[0.18] mix-blend-overlay',
      glows: [
        { className: 'juzimi-bg-breathe absolute left-[-18vw] top-[10vh] h-[58vh] w-[48vw] rounded-full bg-[#3157ff]/18 blur-3xl mix-blend-screen', style: { animation: 'juzimi-breathe-a 14s ease-in-out infinite' } },
        { className: 'juzimi-bg-breathe absolute right-[-14vw] top-[-6vh] h-[74vh] w-[48vw] rounded-full bg-[#ff4f38]/28 blur-3xl mix-blend-screen', style: { animation: 'juzimi-breathe-b 16s ease-in-out infinite' } },
        { className: 'juzimi-bg-breathe absolute right-[4vw] bottom-[-22vh] h-[52vh] w-[44vw] rounded-full bg-[#22d3c5]/16 blur-3xl mix-blend-screen', style: { animation: 'juzimi-breathe-a 19s ease-in-out infinite reverse' } },
      ],
      headerIconButtonClass: 'h-11 w-11 rounded-full bg-white/10 border border-white/12 shadow-sm flex items-center justify-center hover:bg-white/16 transition-colors text-[#f8fafc]',
      headerPillClass: 'h-11 rounded-full bg-white/10 border border-white/12 px-4 font-black flex items-center gap-2 shadow-sm hover:bg-white/16 transition-colors text-[#f8fafc]',
      primaryButtonClass: 'rounded-2xl bg-[#f8fafc] text-[#07080d] font-black flex items-center justify-center gap-2 shadow-lg',
      secondaryButtonClass: 'rounded-2xl bg-white/10 border border-white/12 text-[#f8fafc] font-black',
      switchWrapClass: 'flex items-center gap-1 rounded-full bg-white/10 backdrop-blur-xl border border-white/12 p-1 shadow-[0_14px_42px_rgba(0,0,0,0.28)]',
      switchButtonClass: 'h-9 rounded-full px-3 text-xs font-black flex items-center gap-1.5 text-[#f8fafc] hover:bg-white/12 transition-colors',
      searchPanelClass: 'w-full md:w-80 shrink-0 rounded-[1.55rem] bg-white/10 backdrop-blur-xl border border-white/12 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.34)]',
      searchCountClass: 'text-sm font-black text-[#b7bdca]',
      searchIconClass: 'absolute left-3.5 top-1/2 -translate-y-1/2 text-[#ffd166]/78',
      inputClass: 'w-full h-11 rounded-[1.1rem] bg-white/12 border border-white/12 pl-10 pr-4 outline-none text-[#f8fafc] placeholder:text-[#b7bdca]/60 font-bold text-sm shadow-[inset_0_1px_4px_rgba(0,0,0,0.24)] focus:border-[#ffd166]/64 transition-colors',
      panelClass: 'mb-8 rounded-[2rem] bg-white/10 backdrop-blur border border-white/12 shadow-[0_20px_70px_rgba(0,0,0,0.34)] overflow-hidden',
      panelHeaderClass: 'p-5 md:p-6 border-b border-white/10 flex items-center justify-between gap-3',
      panelInputClass: 'rounded-2xl border border-white/12 bg-white/10 px-4 font-bold outline-none focus:border-[#ffd166] text-[#f8fafc] placeholder:text-[#b7bdca]/60',
      panelTextAreaClass: 'rounded-3xl border border-white/12 bg-white/10 p-5 font-serif text-xl leading-9 outline-none focus:border-[#ffd166] resize-none text-[#f8fafc] placeholder:text-[#b7bdca]/60',
      closeButtonClass: 'h-10 w-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/16 text-[#f8fafc]',
      emptyStateClass: 'py-16 md:py-24 text-center',
      cardAccents: withFrostedGlass(STUDIO_NIGHT_CARD_ACCENTS, GLASS_STUDIO_NIGHT),
    },
  },
  retreat: {
    day: {
      ...commonTheme,
      family: 'retreat',
      mode: 'day',
      name: '旅影',
      modeLabel: '白天',
      cardVariant: 'retreat',
      rootClass: 'bg-[#f3f4f2] text-[#111315]',
      titleClass: 'text-[#111315]',
      mutedClass: 'text-[#6a6e72]',
      accentClass: 'text-[#69716b]',
      backgroundBase: 'bg-[linear-gradient(135deg,#f7f8f7_0%,#eef0ef_45%,#e6e8e6_100%)]',
      backgroundDriftStyle: {
        backgroundImage: [
          'radial-gradient(circle at 16% 20%, rgba(255,255,255,0.92) 0%, transparent 34%)',
          'radial-gradient(circle at 80% 16%, rgba(181,190,184,0.32) 0%, transparent 38%)',
          'radial-gradient(circle at 50% 86%, rgba(112,123,113,0.12) 0%, transparent 42%)',
        ].join(', '),
        backgroundSize: '140% 140%, 130% 130%, 120% 120%',
        animation: 'juzimi-gradient-drift 18s ease-in-out infinite',
      },
      gridClass: 'bg-[linear-gradient(90deg,rgba(17,19,21,0.026)_1px,transparent_1px),linear-gradient(180deg,rgba(17,19,21,0.022)_1px,transparent_1px)] bg-[size:96px_96px]',
      noiseClass: 'opacity-[0.08] mix-blend-multiply',
      glows: [
        { className: 'juzimi-bg-breathe absolute left-[-18vw] top-[4vh] h-[64vh] w-[48vw] rounded-full bg-white/80 blur-3xl mix-blend-screen', style: { animation: 'juzimi-breathe-a 16s ease-in-out infinite' } },
        { className: 'juzimi-bg-breathe absolute right-[-12vw] top-[0vh] h-[74vh] w-[46vw] rounded-full bg-[#c9ceca]/42 blur-3xl mix-blend-multiply', style: { animation: 'juzimi-breathe-b 18s ease-in-out infinite' } },
      ],
      headerIconButtonClass: 'h-11 w-11 rounded-full bg-white/82 border border-black/8 shadow-[0_12px_34px_rgba(31,41,55,0.12)] flex items-center justify-center hover:bg-white transition-colors text-[#111315]',
      headerPillClass: 'h-11 rounded-full bg-white/82 border border-black/8 px-4 font-black flex items-center gap-2 shadow-[0_12px_34px_rgba(31,41,55,0.12)] hover:bg-white transition-colors text-[#111315]',
      primaryButtonClass: 'rounded-2xl bg-[#111315] text-white font-black flex items-center justify-center gap-2 shadow-lg',
      secondaryButtonClass: 'rounded-2xl bg-white border border-black/10 text-[#555b5f] font-black',
      switchWrapClass: 'flex items-center gap-1 rounded-full bg-white/74 backdrop-blur-xl border border-white/84 p-1 shadow-[0_14px_42px_rgba(31,41,55,0.12)]',
      switchButtonClass: 'h-9 rounded-full px-3 text-xs font-black flex items-center gap-1.5 text-[#555b5f] hover:bg-white transition-colors',
      searchPanelClass: 'w-full md:w-80 shrink-0 rounded-[1.4rem] bg-white/74 backdrop-blur-xl border border-white/84 p-4 shadow-[0_20px_64px_rgba(31,41,55,0.12)]',
      searchCountClass: 'text-sm font-black text-[#6a6e72]',
      searchIconClass: 'absolute left-3.5 top-1/2 -translate-y-1/2 text-[#69716b]/76',
      inputClass: 'w-full h-11 rounded-[1rem] bg-white/86 border border-black/8 pl-10 pr-4 outline-none text-[#111315] placeholder:text-[#7a8085]/68 font-bold text-sm shadow-[inset_0_1px_4px_rgba(15,23,42,0.08)] focus:border-[#69716b]/54 transition-colors',
      panelClass: 'mb-8 rounded-[2rem] bg-white/78 backdrop-blur border border-white/80 shadow-[0_20px_70px_rgba(31,41,55,0.14)] overflow-hidden',
      panelHeaderClass: 'p-5 md:p-6 border-b border-black/8 flex items-center justify-between gap-3',
      panelInputClass: 'rounded-2xl border border-black/10 bg-white/86 px-4 font-bold outline-none focus:border-[#69716b] text-[#111315] placeholder:text-[#7a8085]/68',
      panelTextAreaClass: 'rounded-3xl border border-black/10 bg-white/86 p-5 font-serif text-xl leading-9 outline-none focus:border-[#69716b] resize-none text-[#111315] placeholder:text-[#7a8085]/68',
      closeButtonClass: 'h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 text-[#111315]',
      emptyStateClass: 'py-16 md:py-24 text-center',
      cardAccents: withFrostedGlass(RETREAT_CARD_ACCENTS, GLASS_RETREAT_DAY),
    },
    night: {
      ...commonTheme,
      family: 'retreat',
      mode: 'night',
      name: '旅影',
      modeLabel: '黑夜',
      cardVariant: 'retreat',
      rootClass: 'bg-[#090b0c] text-[#f8fafc]',
      titleClass: 'text-[#f8fafc]',
      mutedClass: 'text-[#bbc2c7]',
      accentClass: 'text-[#c9d2cc]',
      backgroundBase: 'bg-[linear-gradient(135deg,#07111f_0%,#111627_30%,#241020_62%,#081714_100%)]',
      backgroundDriftStyle: {
        backgroundImage: [
          'radial-gradient(circle at 20% 18%, rgba(68,93,255,0.18) 0%, transparent 36%)',
          'radial-gradient(circle at 78% 12%, rgba(255,60,105,0.26) 0%, rgba(255,149,42,0.12) 22%, transparent 46%)',
          'radial-gradient(circle at 88% 74%, rgba(43,210,190,0.16) 0%, rgba(43,210,190,0.08) 22%, transparent 44%)',
          'radial-gradient(circle at 10% 86%, rgba(255,198,216,0.12) 0%, transparent 38%)',
        ].join(', '),
        backgroundSize: '145% 145%, 130% 130%, 135% 135%, 120% 120%',
        animation: 'juzimi-gradient-drift 16s ease-in-out infinite',
      },
      gridClass: 'bg-[linear-gradient(90deg,rgba(248,250,252,0.04)_1px,transparent_1px),linear-gradient(180deg,rgba(248,250,252,0.032)_1px,transparent_1px)] bg-[size:96px_96px]',
      noiseClass: 'opacity-[0.18] mix-blend-overlay',
      glows: [
        { className: 'juzimi-bg-breathe absolute left-[-18vw] top-[10vh] h-[58vh] w-[48vw] rounded-full bg-[#3157ff]/16 blur-3xl mix-blend-screen', style: { animation: 'juzimi-breathe-a 14s ease-in-out infinite' } },
        { className: 'juzimi-bg-breathe absolute right-[-14vw] top-[-6vh] h-[74vh] w-[48vw] rounded-full bg-[#ff4f7a]/22 blur-3xl mix-blend-screen', style: { animation: 'juzimi-breathe-b 16s ease-in-out infinite' } },
        { className: 'juzimi-bg-breathe absolute right-[4vw] bottom-[-22vh] h-[52vh] w-[44vw] rounded-full bg-[#22d3c5]/14 blur-3xl mix-blend-screen', style: { animation: 'juzimi-breathe-a 19s ease-in-out infinite reverse' } },
      ],
      headerIconButtonClass: 'h-11 w-11 rounded-full bg-white/10 border border-white/14 shadow-[0_12px_34px_rgba(0,0,0,0.28)] flex items-center justify-center hover:bg-white/16 transition-colors text-[#f8fafc]',
      headerPillClass: 'h-11 rounded-full bg-white/10 border border-white/14 px-4 font-black flex items-center gap-2 shadow-[0_12px_34px_rgba(0,0,0,0.28)] hover:bg-white/16 transition-colors text-[#f8fafc]',
      primaryButtonClass: 'rounded-2xl bg-[#f8fafc] text-[#090b0c] font-black flex items-center justify-center gap-2 shadow-lg',
      secondaryButtonClass: 'rounded-2xl bg-white/10 border border-white/14 text-[#f8fafc] font-black',
      switchWrapClass: 'flex items-center gap-1 rounded-full bg-white/10 backdrop-blur-xl border border-white/14 p-1 shadow-[0_14px_42px_rgba(0,0,0,0.3)]',
      switchButtonClass: 'h-9 rounded-full px-3 text-xs font-black flex items-center gap-1.5 text-[#f8fafc] hover:bg-white/12 transition-colors',
      searchPanelClass: 'w-full md:w-80 shrink-0 rounded-[1.4rem] bg-white/10 backdrop-blur-xl border border-white/14 p-4 shadow-[0_20px_64px_rgba(0,0,0,0.32)]',
      searchCountClass: 'text-sm font-black text-[#bbc2c7]',
      searchIconClass: 'absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c9d2cc]/78',
      inputClass: 'w-full h-11 rounded-[1rem] bg-white/12 border border-white/14 pl-10 pr-4 outline-none text-[#f8fafc] placeholder:text-[#bbc2c7]/62 font-bold text-sm shadow-[inset_0_1px_4px_rgba(0,0,0,0.24)] focus:border-[#c9d2cc]/60 transition-colors',
      panelClass: 'mb-8 rounded-[2rem] bg-white/10 backdrop-blur border border-white/14 shadow-[0_20px_70px_rgba(0,0,0,0.34)] overflow-hidden',
      panelHeaderClass: 'p-5 md:p-6 border-b border-white/10 flex items-center justify-between gap-3',
      panelInputClass: 'rounded-2xl border border-white/12 bg-white/10 px-4 font-bold outline-none focus:border-[#c9d2cc] text-[#f8fafc] placeholder:text-[#bbc2c7]/62',
      panelTextAreaClass: 'rounded-3xl border border-white/12 bg-white/10 p-5 font-serif text-xl leading-9 outline-none focus:border-[#c9d2cc] resize-none text-[#f8fafc] placeholder:text-[#bbc2c7]/62',
      closeButtonClass: 'h-10 w-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/16 text-[#f8fafc]',
      emptyStateClass: 'py-16 md:py-24 text-center',
      cardAccents: withFrostedGlass(RETREAT_CARD_ACCENTS, GLASS_RETREAT_NIGHT),
    },
  },
};

export const normalizeJuzimiThemePreference = (preference = {}) => {
  const family = JUZIMI_THEME_FAMILIES.includes(preference?.family)
    ? preference.family
    : DEFAULT_THEME_PREFERENCE.family;
  const mode = JUZIMI_THEME_MODES.includes(preference?.mode)
    ? preference.mode
    : DEFAULT_THEME_PREFERENCE.mode;
  return { family, mode };
};

export const getNextJuzimiThemeFamily = (family) => {
  const currentIndex = JUZIMI_THEME_FAMILIES.indexOf(family);
  if (currentIndex < 0) return DEFAULT_THEME_PREFERENCE.family;
  return JUZIMI_THEME_FAMILIES[(currentIndex + 1) % JUZIMI_THEME_FAMILIES.length];
};

export const getJuzimiThemeFamilyAction = (family) => {
  const nextFamily = getNextJuzimiThemeFamily(family);
  return {
    family: nextFamily,
    label: nextFamily === 'studio' ? '流光' : nextFamily === 'retreat' ? '旅影' : '晨光',
  };
};

export const getNextJuzimiThemeMode = (mode) => {
  const currentIndex = JUZIMI_THEME_MODES.indexOf(mode);
  if (currentIndex < 0) return DEFAULT_THEME_PREFERENCE.mode;
  return JUZIMI_THEME_MODES[(currentIndex + 1) % JUZIMI_THEME_MODES.length];
};

export const getJuzimiThemeModeAction = (mode) => {
  const nextMode = getNextJuzimiThemeMode(mode);
  return {
    mode: nextMode,
    label: nextMode === 'night' ? '黑夜' : '白天',
  };
};

export const getJuzimiCardMinHeight = (sentence = {}, index = 0, variant = 'poster') => {
  const textLength = String(sentence.text || '').length;
  const rhythm = [0, 46, 18, 76, 32, 92][Math.abs(index) % 6];
  const textLift = Math.min(120, Math.floor(textLength / 22) * 28);
  if (variant === 'retreat') return 460 + rhythm + Math.min(96, Math.floor(textLength / 24) * 24);
  const base = variant === 'studio' ? 322 : 286;
  return base + rhythm + textLift;
};

export const getJuzimiTheme = (preference = {}) => {
  const normalized = normalizeJuzimiThemePreference(preference);
  return JUZIMI_THEMES[normalized.family][normalized.mode];
};
