"use client";

// ============================================================================
// Dynamic Event Theming System — Core Engine
// Automatically detects seasonal events based on Country + Religion
// ============================================================================

// ============================================================================
// Types
// ============================================================================

export interface EventTheme {
  primary: string;
  secondary: string;
  accent: string;
  gradient: string;
  bgPattern: string;
  textOnPrimary: string;
  glow: string;
}

export interface SeasonalEvent {
  id: string;
  name: string;
  emoji: string;
  date: string; // MM-DD
  dateEnd?: string; // MM-DD for multi-day events
  type: "religious" | "national" | "cultural" | "commercial";
  religions: string[];
  countries: string[];
  theme: EventTheme;
  description: string;
  offerTemplate: string;
  floatingIcons: string[];
}

// ============================================================================
// Massive Event Database — 90+ Events
// ============================================================================

const EVENTS: SeasonalEvent[] = [
  // ── Islamic Events ──────────────────────────────────────────────────────
  {
    id: "ramadan", name: "Ramadan", emoji: "🌙",
    date: "02-18", dateEnd: "03-19", type: "religious",
    religions: ["islam"], countries: ["all"],
    theme: { primary: "#581c87", secondary: "#D97706", accent: "#F59E0B", gradient: "linear-gradient(135deg, #581c87, #7c3aed, #D97706)", bgPattern: "rgba(88,28,135,0.04)", textOnPrimary: "#ffffff", glow: "rgba(88,28,135,0.4)" },
    description: "Holy month of fasting, prayer and reflection",
    offerTemplate: "Ramadan Kareem! 🌙 Up to {discount}% off on all products",
    floatingIcons: ["🌙", "⭐", "🤲", "🕌", "📿", "🏮", "✨", "🌙"],
  },
  {
    id: "eid-ul-fitr", name: "Eid ul Fitr", emoji: "🎉",
    date: "03-20", dateEnd: "03-22", type: "religious",
    religions: ["islam"], countries: ["all"],
    theme: { primary: "#065f46", secondary: "#D97706", accent: "#F59E0B", gradient: "linear-gradient(135deg, #065f46, #059669, #D97706)", bgPattern: "rgba(6,95,70,0.04)", textOnPrimary: "#ffffff", glow: "rgba(6,95,70,0.4)" },
    description: "Festival of breaking the fast — celebrations, gifts, feasts",
    offerTemplate: "Eid Mubarak! 🎉 Eid Special Sale — {discount}% off!",
    floatingIcons: ["🎉", "🌙", "⭐", "🎁", "🎊", "🤲", "🕌", "✨"],
  },
  {
    id: "eid-ul-adha", name: "Eid ul Adha", emoji: "🐑",
    date: "05-27", dateEnd: "05-30", type: "religious",
    religions: ["islam"], countries: ["all"],
    theme: { primary: "#166534", secondary: "#D97706", accent: "#EAB308", gradient: "linear-gradient(135deg, #166534, #059669, #D97706)", bgPattern: "rgba(22,101,52,0.04)", textOnPrimary: "#ffffff", glow: "rgba(22,101,52,0.4)" },
    description: "Festival of Sacrifice — faith, charity, and community",
    offerTemplate: "Eid ul Adha Mubarak! 🐑 Qurbani Special Deals!",
    floatingIcons: ["🐑", "🕌", "🤲", "⭐", "🎁", "🎉", "✨", "🎊"],
  },
  {
    id: "muharram", name: "Muharram", emoji: "🕌",
    date: "07-17", dateEnd: "07-26", type: "religious",
    religions: ["islam"], countries: ["all"],
    theme: { primary: "#1c1917", secondary: "#44403c", accent: "#78716c", gradient: "linear-gradient(135deg, #1c1917, #292524, #44403c)", bgPattern: "rgba(28,25,23,0.03)", textOnPrimary: "#ffffff", glow: "rgba(28,25,23,0.3)" },
    description: "Islamic New Year — sacred month of reflection",
    offerTemplate: "Muharram Special — Peace & Blessings Collection",
    floatingIcons: ["🕌", "🤲", "⭐", "📿", "🌙", "✨"],
  },
  {
    id: "shab-e-meraj", name: "Shab-e-Meraj", emoji: "✨",
    date: "01-16", type: "religious",
    religions: ["islam"], countries: ["all"],
    theme: { primary: "#1e3a5f", secondary: "#D97706", accent: "#60a5fa", gradient: "linear-gradient(135deg, #1e3a5f, #1e40af, #D97706)", bgPattern: "rgba(30,58,95,0.04)", textOnPrimary: "#ffffff", glow: "rgba(30,58,95,0.4)" },
    description: "Night of Ascension — sacred journey of Prophet Muhammad (PBUH)",
    offerTemplate: "Shab-e-Meraj Mubarak! ✨ Blessed Night Special",
    floatingIcons: ["✨", "⭐", "🌙", "🤲", "🕌", "🌠"],
  },
  {
    id: "shab-e-qadr", name: "Shab-e-Qadr", emoji: "⭐",
    date: "03-17", type: "religious",
    religions: ["islam"], countries: ["all"],
    theme: { primary: "#312e81", secondary: "#F59E0B", accent: "#818cf8", gradient: "linear-gradient(135deg, #312e81, #4338ca, #F59E0B)", bgPattern: "rgba(49,46,129,0.05)", textOnPrimary: "#ffffff", glow: "rgba(49,46,129,0.4)" },
    description: "Night of Power — better than a thousand months",
    offerTemplate: "Shab-e-Qadr Mubarak! ⭐ Night of Blessings",
    floatingIcons: ["⭐", "✨", "🌙", "🤲", "📖", "🕌"],
  },
  {
    id: "milad-un-nabi", name: "Milad un Nabi", emoji: "🕌",
    date: "07-06", dateEnd: "07-07", type: "religious",
    religions: ["islam"], countries: ["all"],
    theme: { primary: "#065f46", secondary: "#D97706", accent: "#34d399", gradient: "linear-gradient(135deg, #065f46, #047857, #D97706)", bgPattern: "rgba(6,95,70,0.04)", textOnPrimary: "#ffffff", glow: "rgba(6,95,70,0.4)" },
    description: "Birthday of Prophet Muhammad (PBUH) — peace and blessings",
    offerTemplate: "Milad un Nabi Mubarak! 🕌 Blessed Day Special",
    floatingIcons: ["🕌", "🌙", "⭐", "🤲", "✨", "💚", "🎁"],
  },

  // ── Christian Events ────────────────────────────────────────────────────
  {
    id: "christmas", name: "Christmas", emoji: "🎄",
    date: "12-24", dateEnd: "12-26", type: "religious",
    religions: ["christianity"], countries: ["all"],
    theme: { primary: "#dc2626", secondary: "#16a34a", accent: "#fbbf24", gradient: "linear-gradient(135deg, #dc2626, #b91c1c, #16a34a)", bgPattern: "rgba(220,38,38,0.04)", textOnPrimary: "#ffffff", glow: "rgba(220,38,38,0.4)" },
    description: "Celebration of the birth of Jesus Christ",
    offerTemplate: "Merry Christmas! 🎄 Holiday Sale — Up to {discount}% off!",
    floatingIcons: ["🎄", "⭐", "🎁", "🎅", "❄️", "🔔", "🌨️", "🦌"],
  },
  {
    id: "easter", name: "Easter", emoji: "🥚",
    date: "04-05", dateEnd: "04-06", type: "religious",
    religions: ["christianity"], countries: ["all"],
    theme: { primary: "#a855f7", secondary: "#f59e0b", accent: "#ec4899", gradient: "linear-gradient(135deg, #a855f7, #c084fc, #f59e0b)", bgPattern: "rgba(168,85,247,0.04)", textOnPrimary: "#ffffff", glow: "rgba(168,85,247,0.4)" },
    description: "Resurrection of Jesus Christ — celebration of new life",
    offerTemplate: "Happy Easter! 🥚 Easter Egg Hunt Sale!",
    floatingIcons: ["🥚", "🐰", "🌸", "🐣", "🔔", "🌷", "🎁"],
  },
  {
    id: "good-friday", name: "Good Friday", emoji: "✝️",
    date: "04-03", type: "religious",
    religions: ["christianity"], countries: ["all"],
    theme: { primary: "#374151", secondary: "#9ca3af", accent: "#6b7280", gradient: "linear-gradient(135deg, #374151, #4b5563, #6b7280)", bgPattern: "rgba(55,65,81,0.03)", textOnPrimary: "#ffffff", glow: "rgba(55,65,81,0.3)" },
    description: "Commemoration of the crucifixion of Jesus Christ",
    offerTemplate: "Good Friday Reflection — Special Collection",
    floatingIcons: ["✝️", "🕊️", "⭐", "🙏"],
  },
  {
    id: "thanksgiving-us", name: "Thanksgiving", emoji: "🦃",
    date: "11-27", type: "cultural",
    religions: ["all"], countries: ["US"],
    theme: { primary: "#b45309", secondary: "#dc2626", accent: "#f59e0b", gradient: "linear-gradient(135deg, #b45309, #d97706, #dc2626)", bgPattern: "rgba(180,83,9,0.04)", textOnPrimary: "#ffffff", glow: "rgba(180,83,9,0.4)" },
    description: "American Thanksgiving — gratitude, family, and feasts",
    offerTemplate: "Thanksgiving Sale! 🦃 Gratitude Deals — {discount}% off!",
    floatingIcons: ["🦃", "🍂", "🎃", "🌰", "🍎", "🥧", "🌾"],
  },
  {
    id: "valentines", name: "Valentine's Day", emoji: "💕",
    date: "02-14", type: "commercial",
    religions: ["all"], countries: ["all"],
    theme: { primary: "#ec4899", secondary: "#dc2626", accent: "#f472b6", gradient: "linear-gradient(135deg, #ec4899, #f472b6, #dc2626)", bgPattern: "rgba(236,72,153,0.04)", textOnPrimary: "#ffffff", glow: "rgba(236,72,153,0.4)" },
    description: "Day of love and romance",
    offerTemplate: "Happy Valentine's! 💕 Love Special — {discount}% off!",
    floatingIcons: ["💕", "❤️", "🌹", "💘", "💝", "🥰", "✨", "💐"],
  },
  {
    id: "st-patricks", name: "St. Patrick's Day", emoji: "🍀",
    date: "03-17", type: "cultural",
    religions: ["all"], countries: ["US", "GB", "IE"],
    theme: { primary: "#16a34a", secondary: "#f59e0b", accent: "#22c55e", gradient: "linear-gradient(135deg, #16a34a, #22c55e, #f59e0b)", bgPattern: "rgba(22,163,74,0.04)", textOnPrimary: "#ffffff", glow: "rgba(22,163,74,0.4)" },
    description: "Irish cultural celebration — luck of the Irish!",
    offerTemplate: "St. Patrick's Day! 🍀 Lucky Deals — {discount}% off!",
    floatingIcons: ["🍀", "🌈", "💚", "🎩", "🪙", "🎩"],
  },
  {
    id: "halloween", name: "Halloween", emoji: "🎃",
    date: "10-31", type: "cultural",
    religions: ["all"], countries: ["US", "GB", "CA", "AU"],
    theme: { primary: "#ea580c", secondary: "#7c2d12", accent: "#f59e0b", gradient: "linear-gradient(135deg, #ea580c, #c2410c, #7c2d12)", bgPattern: "rgba(234,88,12,0.04)", textOnPrimary: "#ffffff", glow: "rgba(234,88,12,0.4)" },
    description: "Spooky season — tricks, treats, and costumes",
    offerTemplate: "Halloween Sale! 🎃 Spooky Deals — {discount}% off!",
    floatingIcons: ["🎃", "👻", "🦇", "🕸️", "💀", "🕷️", "🍬", "🌙"],
  },
  {
    id: "new-year", name: "New Year", emoji: "🎆",
    date: "12-31", dateEnd: "01-01", type: "cultural",
    religions: ["all"], countries: ["all"],
    theme: { primary: "#1e40af", secondary: "#f59e0b", accent: "#3b82f6", gradient: "linear-gradient(135deg, #1e40af, #2563eb, #f59e0b)", bgPattern: "rgba(30,64,175,0.04)", textOnPrimary: "#ffffff", glow: "rgba(30,64,175,0.4)" },
    description: "New Year celebrations — new beginnings",
    offerTemplate: "Happy New Year! 🎆 Fresh Start Sale — {discount}% off!",
    floatingIcons: ["🎆", "🎇", "🎉", "🍾", "✨", "🥂", "🎊", "⭐"],
  },

  // ── Hindu Events ───────────────────────────────────────────────────────
  {
    id: "diwali", name: "Diwali", emoji: "🪔",
    date: "11-08", dateEnd: "11-12", type: "religious",
    religions: ["hinduism"], countries: ["IN", "PK", "BD", "NP", "LK", "MY", "SG", "GB", "US", "AE"],
    theme: { primary: "#c2410c", secondary: "#EAB308", accent: "#f59e0b", gradient: "linear-gradient(135deg, #c2410c, #ea580c, #EAB308)", bgPattern: "rgba(194,65,12,0.04)", textOnPrimary: "#ffffff", glow: "rgba(194,65,12,0.4)" },
    description: "Festival of Lights — victory of light over darkness",
    offerTemplate: "Happy Diwali! 🪔 Festival of Lights Sale — {discount}% off!",
    floatingIcons: ["🪔", "🪔", "🎆", "✨", "🎊", "💨", "🌟", "🎇"],
  },
  {
    id: "holi", name: "Holi", emoji: "🎨",
    date: "03-10", dateEnd: "03-11", type: "religious",
    religions: ["hinduism"], countries: ["IN", "NP", "BD"],
    theme: { primary: "#e11d48", secondary: "#8b5cf6", accent: "#06b6d4", gradient: "linear-gradient(135deg, #e11d48, #8b5cf6, #06b6d4)", bgPattern: "rgba(225,29,72,0.04)", textOnPrimary: "#ffffff", glow: "rgba(225,29,72,0.4)" },
    description: "Festival of Colors — joy, love, and spring",
    offerTemplate: "Happy Holi! 🎨 Color Festival Sale!",
    floatingIcons: ["🎨", "🌈", "💥", "🎈", "🌸", "💦", "🎯", "✨"],
  },
  {
    id: "navratri", name: "Navratri", emoji: "💃",
    date: "10-01", dateEnd: "10-10", type: "religious",
    religions: ["hinduism"], countries: ["IN"],
    theme: { primary: "#dc2626", secondary: "#f59e0b", accent: "#ef4444", gradient: "linear-gradient(135deg, #dc2626, #ef4444, #f59e0b)", bgPattern: "rgba(220,38,38,0.04)", textOnPrimary: "#ffffff", glow: "rgba(220,38,38,0.4)" },
    description: "Nine nights of Goddess Durga worship",
    offerTemplate: "Happy Navratri! 💃 Garba Special Sale!",
    floatingIcons: ["💃", "🙏", "🔥", "⭐", "🌸", "🎵", "🪘"],
  },
  {
    id: "dussehra", name: "Dussehra", emoji: "🏹",
    date: "10-10", dateEnd: "10-11", type: "religious",
    religions: ["hinduism"], countries: ["IN"],
    theme: { primary: "#dc2626", secondary: "#f97316", accent: "#eab308", gradient: "linear-gradient(135deg, #dc2626, #b91c1c, #f97316)", bgPattern: "rgba(220,38,38,0.04)", textOnPrimary: "#ffffff", glow: "rgba(220,38,38,0.4)" },
    description: "Victory of good over evil — Ramlila celebrations",
    offerTemplate: "Happy Dussehra! 🏹 Victory Sale — {discount}% off!",
    floatingIcons: ["🏹", "🔥", "⚔️", "🏹", "🎉", "⭐"],
  },
  {
    id: "ganesh-chaturthi", name: "Ganesh Chaturthi", emoji: "🙏",
    date: "08-27", dateEnd: "09-06", type: "religious",
    religions: ["hinduism"], countries: ["IN"],
    theme: { primary: "#dc2626", secondary: "#f59e0b", accent: "#fb923c", gradient: "linear-gradient(135deg, #dc2626, #ea580c, #f59e0b)", bgPattern: "rgba(220,38,38,0.04)", textOnPrimary: "#ffffff", glow: "rgba(220,38,38,0.4)" },
    description: "Birthday of Lord Ganesha — remover of obstacles",
    offerTemplate: "Ganpati Bappa Morya! 🙏 Blessings Sale!",
    floatingIcons: ["🙏", "🪔", "🌸", "⭐", "🎊", "✨"],
  },
  {
    id: "raksha-bandhan", name: "Raksha Bandhan", emoji: "🪢",
    date: "08-10", type: "religious",
    religions: ["hinduism"], countries: ["IN"],
    theme: { primary: "#e11d48", secondary: "#f59e0b", accent: "#f472b6", gradient: "linear-gradient(135deg, #e11d48, #f472b6, #f59e0b)", bgPattern: "rgba(225,29,72,0.04)", textOnPrimary: "#ffffff", glow: "rgba(225,29,72,0.4)" },
    description: "Sacred bond between brother and sister",
    offerTemplate: "Happy Raksha Bandhan! 🪢 Sibling Special — {discount}% off!",
    floatingIcons: ["🪢", "💕", "🎁", "🌸", "🤲", "✨"],
  },
  {
    id: "makar-sankranti", name: "Makar Sankranti", emoji: "🪁",
    date: "01-14", type: "religious",
    religions: ["hinduism"], countries: ["IN"],
    theme: { primary: "#f59e0b", secondary: "#ea580c", accent: "#fbbf24", gradient: "linear-gradient(135deg, #f59e0b, #d97706, #ea580c)", bgPattern: "rgba(245,158,11,0.04)", textOnPrimary: "#ffffff", glow: "rgba(245,158,11,0.4)" },
    description: "Harvest festival — sun enters Capricorn",
    offerTemplate: "Happy Sankranti! 🪁 Kite Festival Sale!",
    floatingIcons: ["🪁", "☀️", "🌾", " sesame", "🥜", "✨"],
  },
  {
    id: "janmashtami", name: "Janmashtami", emoji: "🪈",
    date: "08-15", type: "religious",
    religions: ["hinduism"], countries: ["IN"],
    theme: { primary: "#2563eb", secondary: "#f59e0b", accent: "#60a5fa", gradient: "linear-gradient(135deg, #2563eb, #3b82f6, #f59e0b)", bgPattern: "rgba(37,99,235,0.04)", textOnPrimary: "#ffffff", glow: "rgba(37,99,235,0.4)" },
    description: "Birthday of Lord Krishna — devotion and celebration",
    offerTemplate: "Happy Janmashtami! 🪈 Krishna Special Collection",
    floatingIcons: ["🪈", "🪔", "🧈", "🥛", "👶", "⭐", "🎵"],
  },
  {
    id: "pongal", name: "Pongal", emoji: "🌾",
    date: "01-14", dateEnd: "01-17", type: "religious",
    religions: ["hinduism"], countries: ["IN"],
    theme: { primary: "#f59e0b", secondary: "#16a34a", accent: "#fbbf24", gradient: "linear-gradient(135deg, #f59e0b, #d97706, #16a34a)", bgPattern: "rgba(245,158,11,0.04)", textOnPrimary: "#ffffff", glow: "rgba(245,158,11,0.4)" },
    description: "Tamil harvest festival — thanksgiving to nature",
    offerTemplate: "Happy Pongal! 🌾 Harvest Festival Special!",
    floatingIcons: ["🌾", "☀️", "🫕", "🌸", "🌿", "✨"],
  },
  {
    id: "baisakhi", name: "Baisakhi", emoji: "🌾",
    date: "04-13", type: "religious",
    religions: ["sikhism", "hinduism"], countries: ["IN"],
    theme: { primary: "#f59e0b", secondary: "#dc2626", accent: "#fbbf24", gradient: "linear-gradient(135deg, #f59e0b, #d97706, #dc2626)", bgPattern: "rgba(245,158,11,0.04)", textOnPrimary: "#ffffff", glow: "rgba(245,158,11,0.4)" },
    description: "Sikh New Year — harvest festival of Punjab",
    offerTemplate: "Happy Baisakhi! 🌾 New Year Sale!",
    floatingIcons: ["🌾", "🪔", "🎉", "🎊", "💃", "✨"],
  },

  // ── Pakistani National Events ──────────────────────────────────────────
  {
    id: "pakistan-independence", name: "Pakistan Independence Day", emoji: "🇵🇰",
    date: "08-14", type: "national",
    religions: ["all"], countries: ["PK"],
    theme: { primary: "#16a34a", secondary: "#ffffff", accent: "#22c55e", gradient: "linear-gradient(135deg, #16a34a, #15803d, #ffffff)", bgPattern: "rgba(22,163,74,0.04)", textOnPrimary: "#ffffff", glow: "rgba(22,163,74,0.4)" },
    description: "Independence Day of Pakistan — August 14, 1947",
    offerTemplate: "Happy Independence Day! 🇵🇰 Azadi Sale — {discount}% off!",
    floatingIcons: ["🇵🇰", "⭐", "🌙", "🟢", "🤍", "🟢", "✨", "🎉"],
  },
  {
    id: "pakistan-day", name: "Pakistan Day", emoji: "🇵🇰",
    date: "03-23", type: "national",
    religions: ["all"], countries: ["PK"],
    theme: { primary: "#16a34a", secondary: "#ffffff", accent: "#22c55e", gradient: "linear-gradient(135deg, #16a34a, #15803d)", bgPattern: "rgba(22,163,74,0.04)", textOnPrimary: "#ffffff", glow: "rgba(22,163,74,0.4)" },
    description: "Lahore Resolution — March 23, 1940",
    offerTemplate: "Pakistan Day! 🇵🇰 Special Deals Today!",
    floatingIcons: ["🇵🇰", "⭐", "🌙", "✨", "🎉"],
  },
  {
    id: "kashmir-day", name: "Kashmir Solidarity Day", emoji: "🤍",
    date: "02-05", type: "national",
    religions: ["all"], countries: ["PK"],
    theme: { primary: "#16a34a", secondary: "#ffffff", accent: "#86efac", gradient: "linear-gradient(135deg, #16a34a, #22c55e)", bgPattern: "rgba(22,163,74,0.04)", textOnPrimary: "#ffffff", glow: "rgba(22,163,74,0.4)" },
    description: "Solidarity with the people of Kashmir",
    offerTemplate: "Kashmir Day Solidarity — Special Collection",
    floatingIcons: ["🤍", "🟢", "🇵🇰", "✨"],
  },
  {
    id: "quaid-day", name: "Quaid-e-Azam Day", emoji: "⭐",
    date: "12-25", type: "national",
    religions: ["all"], countries: ["PK"],
    theme: { primary: "#16a34a", secondary: "#f59e0b", accent: "#22c55e", gradient: "linear-gradient(135deg, #16a34a, #15803d, #f59e0b)", bgPattern: "rgba(22,163,74,0.04)", textOnPrimary: "#ffffff", glow: "rgba(22,163,74,0.4)" },
    description: "Birthday of Quaid-e-Azam Muhammad Ali Jinnah",
    offerTemplate: "Quaid Day Tribute — Father of the Nation Special",
    floatingIcons: ["⭐", "🇵🇰", "🌙", "✨"],
  },
  {
    id: "defense-day", name: "Defense Day", emoji: "🎖️",
    date: "09-06", type: "national",
    religions: ["all"], countries: ["PK"],
    theme: { primary: "#16a34a", secondary: "#dc2626", accent: "#22c55e", gradient: "linear-gradient(135deg, #16a34a, #dc2626)", bgPattern: "rgba(22,163,74,0.04)", textOnPrimary: "#ffffff", glow: "rgba(22,163,74,0.4)" },
    description: "September 6 — honoring martyrs of 1965 war",
    offerTemplate: "Defense Day — Salute to Our Heroes!",
    floatingIcons: ["🎖️", "🇵🇰", "⭐", "🎖️"],
  },
  {
    id: "iqbal-day", name: "Iqbal Day", emoji: "📚",
    date: "11-09", type: "national",
    religions: ["all"], countries: ["PK"],
    theme: { primary: "#16a34a", secondary: "#7c3aed", accent: "#22c55e", gradient: "linear-gradient(135deg, #16a34a, #7c3aed)", bgPattern: "rgba(22,163,74,0.04)", textOnPrimary: "#ffffff", glow: "rgba(22,163,74,0.4)" },
    description: "Birthday of Allama Muhammad Iqbal — Poet of the East",
    offerTemplate: "Iqbal Day — Khudi & Inspiration Collection",
    floatingIcons: ["📚", "⭐", "🦅", "✨"],
  },

  // ── Indian Events ──────────────────────────────────────────────────────
  {
    id: "india-independence", name: "Independence Day", emoji: "🇮🇳",
    date: "08-15", type: "national",
    religions: ["all"], countries: ["IN"],
    theme: { primary: "#f97316", secondary: "#ffffff", accent: "#16a34a", gradient: "linear-gradient(135deg, #f97316, #16a34a, #ffffff)", bgPattern: "rgba(249,115,22,0.04)", textOnPrimary: "#ffffff", glow: "rgba(249,115,22,0.4)" },
    description: "India's Independence Day — August 15, 1947",
    offerTemplate: "Happy Independence Day! 🇮🇳 Swatantrata Sale!",
    floatingIcons: ["🇮🇳", "🧡", "⚪", "💚", "✨", "🎉"],
  },
  {
    id: "india-republic", name: "Republic Day", emoji: "🇮🇳",
    date: "01-26", type: "national",
    religions: ["all"], countries: ["IN"],
    theme: { primary: "#f97316", secondary: "#16a34a", accent: "#fbbf24", gradient: "linear-gradient(135deg, #f97316, #16a34a)", bgPattern: "rgba(249,115,22,0.04)", textOnPrimary: "#ffffff", glow: "rgba(249,115,22,0.4)" },
    description: "Republic Day of India — January 26, 1950",
    offerTemplate: "Republic Day! 🇮🇳 Gantantra Sale — {discount}% off!",
    floatingIcons: ["🇮🇳", "🧡", "⚪", "💚", "✨"],
  },

  // ── UAE Events ─────────────────────────────────────────────────────────
  {
    id: "uae-national-day", name: "UAE National Day", emoji: "🇦🇪",
    date: "12-02", dateEnd: "12-03", type: "national",
    religions: ["all"], countries: ["AE"],
    theme: { primary: "#16a34a", secondary: "#ffffff", accent: "#dc2626", gradient: "linear-gradient(135deg, #16a34a, #ffffff, #dc2626)", bgPattern: "rgba(22,163,74,0.04)", textOnPrimary: "#ffffff", glow: "rgba(22,163,74,0.4)" },
    description: "UAE National Day — December 2, 1971",
    offerTemplate: "Happy National Day! 🇦🇪 UAE Special Sale!",
    floatingIcons: ["🇦🇪", "⭐", "✨", "🎉", "🇦🇪"],
  },
  {
    id: "commemoration-day", name: "Commemoration Day", emoji: "🕊️",
    date: "11-30", type: "national",
    religions: ["all"], countries: ["AE"],
    theme: { primary: "#374151", secondary: "#f59e0b", accent: "#9ca3af", gradient: "linear-gradient(135deg, #374151, #6b7280)", bgPattern: "rgba(55,65,81,0.03)", textOnPrimary: "#ffffff", glow: "rgba(55,65,81,0.3)" },
    description: "Honoring UAE martyrs",
    offerTemplate: "Commemoration Day — Special Collection",
    floatingIcons: ["🕊️", "🇦🇪", "⭐"],
  },

  // ── Saudi Events ───────────────────────────────────────────────────────
  {
    id: "saudi-national", name: "Saudi National Day", emoji: "🇸🇦",
    date: "09-23", type: "national",
    religions: ["all"], countries: ["SA"],
    theme: { primary: "#16a34a", secondary: "#ffffff", accent: "#22c55e", gradient: "linear-gradient(135deg, #16a34a, #22c55e)", bgPattern: "rgba(22,163,74,0.04)", textOnPrimary: "#ffffff", glow: "rgba(22,163,74,0.4)" },
    description: "Kingdom of Saudi Arabia National Day",
    offerTemplate: "Happy National Day! 🇸🇦 Special Deals!",
    floatingIcons: ["🇸🇦", "🗡️", "🌴", "✨", "🎉"],
  },
  {
    id: "saudi-founding", name: "Saudi Founding Day", emoji: "🇸🇦",
    date: "02-22", type: "national",
    religions: ["all"], countries: ["SA"],
    theme: { primary: "#16a34a", secondary: "#f59e0b", accent: "#22c55e", gradient: "linear-gradient(135deg, #16a34a, #f59e0b)", bgPattern: "rgba(22,163,74,0.04)", textOnPrimary: "#ffffff", glow: "rgba(22,163,74,0.4)" },
    description: "Commemorating the founding of the First Saudi State",
    offerTemplate: "Founding Day! 🇸🇦 Heritage Special Collection",
    floatingIcons: ["🇸🇦", "⭐", "✨"],
  },

  // ── US Events ──────────────────────────────────────────────────────────
  {
    id: "july-4th", name: "Independence Day", emoji: "🇺🇸",
    date: "07-04", type: "national",
    religions: ["all"], countries: ["US"],
    theme: { primary: "#dc2626", secondary: "#1e40af", accent: "#f59e0b", gradient: "linear-gradient(135deg, #dc2626, #1e40af, #ffffff)", bgPattern: "rgba(220,38,38,0.04)", textOnPrimary: "#ffffff", glow: "rgba(220,38,38,0.4)" },
    description: "4th of July — American Independence Day",
    offerTemplate: "Happy 4th of July! 🇺🇸 Stars & Stripes Sale!",
    floatingIcons: ["🇺🇸", "🎆", "⭐", "🎉", "🎊", "🎈"],
  },
  {
    id: "black-friday", name: "Black Friday", emoji: "🖤",
    date: "11-28", type: "commercial",
    religions: ["all"], countries: ["all"],
    theme: { primary: "#000000", secondary: "#D97706", accent: "#f59e0b", gradient: "linear-gradient(135deg, #000000, #1c1917, #D97706)", bgPattern: "rgba(0,0,0,0.03)", textOnPrimary: "#ffffff", glow: "rgba(217,119,6,0.4)" },
    description: "The biggest shopping day of the year",
    offerTemplate: "BLACK FRIDAY! 🖤 Up to {discount}% off EVERYTHING!",
    floatingIcons: ["🖤", "🏷️", "💰", "🔥", "⭐", "🎁"],
  },
  {
    id: "cyber-monday", name: "Cyber Monday", emoji: "💻",
    date: "12-01", type: "commercial",
    religions: ["all"], countries: ["all"],
    theme: { primary: "#1e40af", secondary: "#7c3aed", accent: "#3b82f6", gradient: "linear-gradient(135deg, #1e40af, #7c3aed, #3b82f6)", bgPattern: "rgba(30,64,175,0.04)", textOnPrimary: "#ffffff", glow: "rgba(30,64,175,0.4)" },
    description: "Online shopping extravaganza",
    offerTemplate: "CYBER MONDAY! 💻 Online Exclusive — {discount}% off!",
    floatingIcons: ["💻", "🛒", "🔥", "⭐", "💰", "✨"],
  },
  {
    id: "mothers-day", name: "Mother's Day", emoji: "💐",
    date: "05-11", type: "cultural",
    religions: ["all"], countries: ["all"],
    theme: { primary: "#ec4899", secondary: "#f472b6", accent: "#f9a8d4", gradient: "linear-gradient(135deg, #ec4899, #f472b6, #fce7f3)", bgPattern: "rgba(236,72,153,0.04)", textOnPrimary: "#ffffff", glow: "rgba(236,72,153,0.4)" },
    description: "Celebrating mothers everywhere",
    offerTemplate: "Happy Mother's Day! 💐 Mom Special — {discount}% off!",
    floatingIcons: ["💐", "💕", "🌹", "🤱", "💗", "✨", "🎁"],
  },
  {
    id: "fathers-day", name: "Father's Day", emoji: "👔",
    date: "06-15", type: "cultural",
    religions: ["all"], countries: ["all"],
    theme: { primary: "#1e40af", secondary: "#64748b", accent: "#3b82f6", gradient: "linear-gradient(135deg, #1e40af, #3b82f6, #64748b)", bgPattern: "rgba(30,64,175,0.04)", textOnPrimary: "#ffffff", glow: "rgba(30,64,175,0.4)" },
    description: "Celebrating fathers everywhere",
    offerTemplate: "Happy Father's Day! 👔 Dad Special — {discount}% off!",
    floatingIcons: ["👔", "💎", "⭐", "🎮", "🏆", "🎁", "✨"],
  },
  {
    id: "womens-day", name: "Women's Day", emoji: "💃",
    date: "03-08", type: "cultural",
    religions: ["all"], countries: ["all"],
    theme: { primary: "#7c3aed", secondary: "#ec4899", accent: "#a78bfa", gradient: "linear-gradient(135deg, #7c3aed, #a78bfa, #ec4899)", bgPattern: "rgba(124,58,237,0.04)", textOnPrimary: "#ffffff", glow: "rgba(124,58,237,0.4)" },
    description: "International Women's Day — celebrate women's achievement",
    offerTemplate: "Happy Women's Day! 💃 Her Special — {discount}% off!",
    floatingIcons: ["💃", "💜", "✨", "🌹", "⭐", "💪"],
  },
  {
    id: "earth-day", name: "Earth Day", emoji: "🌍",
    date: "04-22", type: "cultural",
    religions: ["all"], countries: ["all"],
    theme: { primary: "#16a34a", secondary: "#06b6d4", accent: "#22c55e", gradient: "linear-gradient(135deg, #16a34a, #22c55e, #06b6d4)", bgPattern: "rgba(22,163,74,0.04)", textOnPrimary: "#ffffff", glow: "rgba(22,163,74,0.4)" },
    description: "Celebrate and protect our planet",
    offerTemplate: "Earth Day! 🌍 Eco-Friendly Collection — {discount}% off!",
    floatingIcons: ["🌍", "🌱", "🌿", "♻️", "🦋", "🌸"],
  },

  // ── Chinese Events ─────────────────────────────────────────────────────
  {
    id: "chinese-new-year", name: "Chinese New Year", emoji: "🧧",
    date: "02-17", dateEnd: "02-21", type: "cultural",
    religions: ["all"], countries: ["CN", "SG", "MY", "TH", "VN", "PH", "ID"],
    theme: { primary: "#dc2626", secondary: "#f59e0b", accent: "#fbbf24", gradient: "linear-gradient(135deg, #dc2626, #ef4444, #f59e0b)", bgPattern: "rgba(220,38,38,0.04)", textOnPrimary: "#ffffff", glow: "rgba(220,38,38,0.4)" },
    description: "Lunar New Year — the most important Chinese holiday",
    offerTemplate: "Happy Chinese New Year! 🧧 Red Envelope Deals!",
    floatingIcons: ["🧧", "🐉", "🎆", "🏮", "🧨", "💰", "🎆", "✨"],
  },
  {
    id: "mid-autumn", name: "Mid-Autumn Festival", emoji: "🥮",
    date: "10-06", type: "cultural",
    religions: ["all"], countries: ["CN", "SG", "MY", "VN"],
    theme: { primary: "#f59e0b", secondary: "#8b5cf6", accent: "#fbbf24", gradient: "linear-gradient(135deg, #f59e0b, #d97706, #8b5cf6)", bgPattern: "rgba(245,158,11,0.04)", textOnPrimary: "#ffffff", glow: "rgba(245,158,11,0.4)" },
    description: "Moon festival — family reunion and mooncakes",
    offerTemplate: "Happy Mid-Autumn! 🥮 Mooncake Special!",
    floatingIcons: ["🥮", "🌕", "🏮", "🐰", "✨", "🎉"],
  },

  // ── Jewish Events ──────────────────────────────────────────────────────
  {
    id: "hanukkah", name: "Hanukkah", emoji: "🕎",
    date: "12-15", dateEnd: "12-23", type: "religious",
    religions: ["judaism"], countries: ["all"],
    theme: { primary: "#2563eb", secondary: "#f59e0b", accent: "#3b82f6", gradient: "linear-gradient(135deg, #2563eb, #3b82f6, #f59e0b)", bgPattern: "rgba(37,99,235,0.04)", textOnPrimary: "#ffffff", glow: "rgba(37,99,235,0.4)" },
    description: "Festival of Lights — 8 days of miracles",
    offerTemplate: "Happy Hanukkah! 🕎 Festival of Lights Sale!",
    floatingIcons: ["🕎", "⭐", "✨", "🕯️", "酥", "💎", "🎁"],
  },
  {
    id: "passover", name: "Passover", emoji: "🍃",
    date: "04-12", dateEnd: "04-20", type: "religious",
    religions: ["judaism"], countries: ["all"],
    theme: { primary: "#16a34a", secondary: "#f59e0b", accent: "#22c55e", gradient: "linear-gradient(135deg, #16a34a, #22c55e, #f59e0b)", bgPattern: "rgba(22,163,74,0.04)", textOnPrimary: "#ffffff", glow: "rgba(22,163,74,0.4)" },
    description: "Festival of Freedom — Exodus from Egypt",
    offerTemplate: "Happy Passover! 🍃 Freedom Festival Deals!",
    floatingIcons: ["🍃", "🏔️", "🌊", "⭐", "✨"],
  },
  {
    id: "rosh-hashanah", name: "Rosh Hashanah", emoji: "🍯",
    date: "09-22", dateEnd: "09-24", type: "religious",
    religions: ["judaism"], countries: ["all"],
    theme: { primary: "#f59e0b", secondary: "#ffffff", accent: "#fbbf24", gradient: "linear-gradient(135deg, #f59e0b, #fbbf24)", bgPattern: "rgba(245,158,11,0.04)", textOnPrimary: "#ffffff", glow: "rgba(245,158,11,0.4)" },
    description: "Jewish New Year — sweet new beginnings",
    offerTemplate: "Shana Tova! 🍯 Sweet New Year Sale!",
    floatingIcons: ["🍯", "🍎", "🎺", "⭐", "✨"],
  },

  // ── Sikh Events ────────────────────────────────────────────────────────
  {
    id: "guru-nanak", name: "Guru Nanak Jayanti", emoji: "🙏",
    date: "11-05", type: "religious",
    religions: ["sikhism"], countries: ["IN", "PK", "GB", "CA", "US"],
    theme: { primary: "#f59e0b", secondary: "#1e40af", accent: "#fbbf24", gradient: "linear-gradient(135deg, #f59e0b, #1e40af)", bgPattern: "rgba(245,158,11,0.04)", textOnPrimary: "#ffffff", glow: "rgba(245,158,11,0.4)" },
    description: "Birthday of Guru Nanak Dev Ji — founder of Sikhism",
    offerTemplate: "Guru Nanak Jayanti! 🙏 Blessings Special",
    floatingIcons: ["🙏", "⭐", "🪔", "✨", "💜"],
  },

  // ── More Global Events ─────────────────────────────────────────────────
  {
    id: "labour-day-pk", name: "Labour Day", emoji: "⚒️",
    date: "05-01", type: "national",
    religions: ["all"], countries: ["PK", "IN", "AE", "SA", "GB", "AU"],
    theme: { primary: "#dc2626", secondary: "#f59e0b", accent: "#ef4444", gradient: "linear-gradient(135deg, #dc2626, #f59e0b)", bgPattern: "rgba(220,38,38,0.04)", textOnPrimary: "#ffffff", glow: "rgba(220,38,38,0.4)" },
    description: "International Workers' Day",
    offerTemplate: "Labour Day! ⚒️ Workers Appreciation Sale!",
    floatingIcons: ["⚒️", "👊", "✊", "⭐"],
  },
  {
    id: "labour-day-us", name: "Labor Day", emoji: "🇺🇸",
    date: "09-01", type: "national",
    religions: ["all"], countries: ["US", "CA"],
    theme: { primary: "#dc2626", secondary: "#1e40af", accent: "#f59e0b", gradient: "linear-gradient(135deg, #dc2626, #1e40af)", bgPattern: "rgba(220,38,38,0.04)", textOnPrimary: "#ffffff", glow: "rgba(220,38,38,0.4)" },
    description: "US Labor Day — end of summer",
    offerTemplate: "Labor Day Sale! 🇺🇸 End of Summer Deals!",
    floatingIcons: ["🇺🇸", "🔥", "⭐", "🎉"],
  },
  {
    id: "11-11", name: "11.11 Shopping Festival", emoji: "🛒",
    date: "11-11", type: "commercial",
    religions: ["all"], countries: ["all"],
    theme: { primary: "#7c3aed", secondary: "#f59e0b", accent: "#a78bfa", gradient: "linear-gradient(135deg, #7c3aed, #a78bfa, #f59e0b)", bgPattern: "rgba(124,58,237,0.04)", textOnPrimary: "#ffffff", glow: "rgba(124,58,237,0.4)" },
    description: "Singles' Day — biggest online shopping festival",
    offerTemplate: "11.11 MEGA SALE! 🛒 Double {discount}% deals!",
    floatingIcons: ["🛒", "💰", "🔥", "⭐", "🎁", "🏷️"],
  },
  {
    id: "12-12", name: "12.12 Shopping Festival", emoji: "🎉",
    date: "12-12", type: "commercial",
    religions: ["all"], countries: ["all"],
    theme: { primary: "#e11d48", secondary: "#7c3aed", accent: "#f472b6", gradient: "linear-gradient(135deg, #e11d48, #f472b6, #7c3aed)", bgPattern: "rgba(225,29,72,0.04)", textOnPrimary: "#ffffff", glow: "rgba(225,29,72,0.4)" },
    description: "Year-end mega shopping festival",
    offerTemplate: "12.12 MEGA SALE! 🎉 Year-End Deals!",
    floatingIcons: ["🎉", "💰", "🔥", "⭐", "🎁"],
  },
  {
    id: "end-of-year", name: "Year-End Clearance", emoji: "🎊",
    date: "12-26", dateEnd: "12-31", type: "commercial",
    religions: ["all"], countries: ["all"],
    theme: { primary: "#1e40af", secondary: "#dc2626", accent: "#3b82f6", gradient: "linear-gradient(135deg, #1e40af, #dc2626)", bgPattern: "rgba(30,64,175,0.04)", textOnPrimary: "#ffffff", glow: "rgba(30,64,175,0.4)" },
    description: "Clearance sale to end the year",
    offerTemplate: "YEAR-END CLEARANCE! 🊊 Up to {discount}% off!",
    floatingIcons: ["🎊", "🎉", "🎆", "⭐", "💰", "🎁"],
  },
];

// ============================================================================
// Country, Religion, Timezone Data
// ============================================================================

export function getAllCountries(): Array<{ code: string; name: string; flag: string }> {
  return [
    { code: "PK", name: "Pakistan", flag: "🇵🇰" },
    { code: "IN", name: "India", flag: "🇮🇳" },
    { code: "US", name: "United States", flag: "🇺🇸" },
    { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
    { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
    { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
    { code: "CN", name: "China", flag: "🇨🇳" },
    { code: "JP", name: "Japan", flag: "🇯🇵" },
    { code: "KR", name: "South Korea", flag: "🇰🇷" },
    { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
    { code: "NP", name: "Nepal", flag: "🇳🇵" },
    { code: "LK", name: "Sri Lanka", flag: "🇱🇰" },
    { code: "AF", name: "Afghanistan", flag: "🇦🇫" },
    { code: "IR", name: "Iran", flag: "🇮🇷" },
    { code: "IQ", name: "Iraq", flag: "🇮🇶" },
    { code: "TR", name: "Turkey", flag: "🇹🇷" },
    { code: "EG", name: "Egypt", flag: "🇪🇬" },
    { code: "MY", name: "Malaysia", flag: "🇲🇾" },
    { code: "ID", name: "Indonesia", flag: "🇮🇩" },
    { code: "SG", name: "Singapore", flag: "🇸🇬" },
    { code: "TH", name: "Thailand", flag: "🇹🇭" },
    { code: "PH", name: "Philippines", flag: "🇵🇭" },
    { code: "VN", name: "Vietnam", flag: "🇻🇳" },
    { code: "CA", name: "Canada", flag: "🇨🇦" },
    { code: "AU", name: "Australia", flag: "🇦🇺" },
    { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
    { code: "DE", name: "Germany", flag: "🇩🇪" },
    { code: "FR", name: "France", flag: "🇫🇷" },
    { code: "IT", name: "Italy", flag: "🇮🇹" },
    { code: "ES", name: "Spain", flag: "🇪🇸" },
    { code: "NL", name: "Netherlands", flag: "🇳🇱" },
    { code: "SE", name: "Sweden", flag: "🇸🇪" },
    { code: "NO", name: "Norway", flag: "🇳🇴" },
    { code: "DK", name: "Denmark", flag: "🇩🇰" },
    { code: "FI", name: "Finland", flag: "🇫🇮" },
    { code: "PL", name: "Poland", flag: "🇵🇱" },
    { code: "PT", name: "Portugal", flag: "🇵🇹" },
    { code: "GR", name: "Greece", flag: "🇬🇷" },
    { code: "RU", name: "Russia", flag: "🇷🇺" },
    { code: "UA", name: "Ukraine", flag: "🇺🇦" },
    { code: "BR", name: "Brazil", flag: "🇧🇷" },
    { code: "MX", name: "Mexico", flag: "🇲🇽" },
    { code: "AR", name: "Argentina", flag: "🇦🇷" },
    { code: "CO", name: "Colombia", flag: "🇨🇴" },
    { code: "CL", name: "Chile", flag: "🇨🇱" },
    { code: "PE", name: "Peru", flag: "🇵🇪" },
    { code: "ZA", name: "South Africa", flag: "🇿🇦" },
    { code: "NG", name: "Nigeria", flag: "🇳🇬" },
    { code: "KE", name: "Kenya", flag: "🇰🇪" },
    { code: "ET", name: "Ethiopia", flag: "🇪🇹" },
    { code: "GH", name: "Ghana", flag: "🇬🇭" },
    { code: "TZ", name: "Tanzania", flag: "🇹🇿" },
    { code: "MA", name: "Morocco", flag: "🇲🇦" },
    { code: "DZ", name: "Algeria", flag: "🇩🇿" },
    { code: "TN", name: "Tunisia", flag: "🇹🇳" },
    { code: "JO", name: "Jordan", flag: "🇯🇴" },
    { code: "LB", name: "Lebanon", flag: "🇱🇧" },
    { code: "KW", name: "Kuwait", flag: "🇰🇼" },
    { code: "QA", name: "Qatar", flag: "🇶🇦" },
    { code: "BH", name: "Bahrain", flag: "🇧🇭" },
    { code: "OM", name: "Oman", flag: "🇴🇲" },
    { code: "YE", name: "Yemen", flag: "🇾🇪" },
    { code: "SY", name: "Syria", flag: "🇸🇾" },
    { code: "PS", name: "Palestine", flag: "🇵🇸" },
    { code: "IL", name: "Israel", flag: "🇮🇱" },
    { code: "IE", name: "Ireland", flag: "🇮🇪" },
    { code: "CH", name: "Switzerland", flag: "🇨🇭" },
    { code: "AT", name: "Austria", flag: "🇦🇹" },
    { code: "BE", name: "Belgium", flag: "🇧🇪" },
    { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
    { code: "HU", name: "Hungary", flag: "🇭🇺" },
    { code: "RO", name: "Romania", flag: "🇷🇴" },
    { code: "BG", name: "Bulgaria", flag: "🇧🇬" },
    { code: "HR", name: "Croatia", flag: "🇭🇷" },
    { code: "RS", name: "Serbia", flag: "🇷🇸" },
    { code: "BA", name: "Bosnia", flag: "🇧🇦" },
    { code: "AL", name: "Albania", flag: "🇦🇱" },
    { code: "MK", name: "North Macedonia", flag: "🇲🇰" },
    { code: "XK", name: "Kosovo", flag: "🇽🇰" },
    { code: "SK", name: "Slovakia", flag: "🇸🇰" },
    { code: "SI", name: "Slovenia", flag: "🇸🇮" },
    { code: "LT", name: "Lithuania", flag: "🇱🇹" },
    { code: "LV", name: "Latvia", flag: "🇱🇻" },
    { code: "EE", name: "Estonia", flag: "🇪🇪" },
    { code: "IS", name: "Iceland", flag: "🇮🇸" },
    { code: "LU", name: "Luxembourg", flag: "🇱🇺" },
    { code: "MT", name: "Malta", flag: "🇲🇹" },
    { code: "CY", name: "Cyprus", flag: "🇨🇾" },
    { code: "GE", name: "Georgia", flag: "🇬🇪" },
    { code: "AM", name: "Armenia", flag: "🇦🇲" },
    { code: "AZ", name: "Azerbaijan", flag: "🇦🇿" },
    { code: "KZ", name: "Kazakhstan", flag: "🇰🇿" },
    { code: "UZ", name: "Uzbekistan", flag: "🇺🇿" },
    { code: "TM", name: "Turkmenistan", flag: "🇹🇲" },
    { code: "KG", name: "Kyrgyzstan", flag: "🇰🇬" },
    { code: "TJ", name: "Tajikistan", flag: "🇹🇯" },
    { code: "MN", name: "Mongolia", flag: "🇲🇳" },
    { code: "KH", name: "Cambodia", flag: "🇰🇭" },
    { code: "MM", name: "Myanmar", flag: "🇲🇲" },
    { code: "LA", name: "Laos", flag: "🇱🇦" },
    { code: "TW", name: "Taiwan", flag: "🇹🇼" },
    { code: "HK", name: "Hong Kong", flag: "🇭🇰" },
    { code: "MO", name: "Macau", flag: "🇲🇴" },
    { code: "PK", name: "Pakistan", flag: "🇵🇰" },
    { code: "BT", name: "Bhutan", flag: "🇧🇹" },
    { code: "MV", name: "Maldives", flag: "🇲🇻" },
    { code: "LK", name: "Sri Lanka", flag: "🇱🇰" },
    { code: "CX", name: "Christmas Island", flag: "🎁" },
    { code: "FJ", name: "Fiji", flag: "🇫🇯" },
    { code: "PG", name: "Papua New Guinea", flag: "🇵🇬" },
    { code: "WS", name: "Samoa", flag: "🇼🇸" },
    { code: "TO", name: "Tonga", flag: "🇹🇴" },
    { code: "CU", name: "Cuba", flag: "🇨🇺" },
    { code: "JM", name: "Jamaica", flag: "🇯🇲" },
    { code: "TT", name: "Trinidad & Tobago", flag: "🇹🇹" },
    { code: "PA", name: "Panama", flag: "🇵🇦" },
    { code: "CR", name: "Costa Rica", flag: "🇨🇷" },
    { code: "EC", name: "Ecuador", flag: "🇪🇨" },
    { code: "VE", name: "Venezuela", flag: "🇻🇪" },
    { code: "UY", name: "Uruguay", flag: "🇺🇾" },
    { code: "PY", name: "Paraguay", flag: "🇵🇾" },
    { code: "BO", name: "Bolivia", flag: "🇧🇴" },
    { code: "SV", name: "El Salvador", flag: "🇸🇻" },
    { code: "GT", name: "Guatemala", flag: "🇬🇹" },
    { code: "HN", name: "Honduras", flag: "🇭🇳" },
    { code: "NI", name: "Nicaragua", flag: "🇳🇮" },
    { code: "DO", name: "Dominican Republic", flag: "🇩🇴" },
    { code: "HT", name: "Haiti", flag: "🇭🇹" },
    { code: "RW", name: "Rwanda", flag: "🇷🇼" },
    { code: "UG", name: "Uganda", flag: "🇺🇬" },
    { code: "SN", name: "Senegal", flag: "🇸🇳" },
    { code: "CM", name: "Cameroon", flag: "🇨🇲" },
    { code: "CI", name: "Ivory Coast", flag: "🇨🇮" },
  ];
}

export function getAllReligions(): Array<{ id: string; name: string; emoji: string }> {
  return [
    { id: "all", name: "All Religions", emoji: "🌍" },
    { id: "islam", name: "Islam", emoji: "☪️" },
    { id: "christianity", name: "Christianity", emoji: "✝️" },
    { id: "hinduism", name: "Hinduism", emoji: "🕉️" },
    { id: "buddhism", name: "Buddhism", emoji: "☸️" },
    { id: "judaism", name: "Judaism", emoji: "✡️" },
    { id: "sikhism", name: "Sikhism", emoji: "ਵ" },
    { id: "jainism", name: "Jainism", emoji: "卐" },
    { id: "other", name: "Other", emoji: "🙏" },
  ];
}

export function getAllTimezones(): Array<{ value: string; label: string; offset: string }> {
  return [
    { value: "Pacific/Midway", label: "Midway Island", offset: "UTC-11:00" },
    { value: "Pacific/Honolulu", label: "Honolulu (Hawaii)", offset: "UTC-10:00" },
    { value: "America/Anchorage", label: "Anchorage (Alaska)", offset: "UTC-09:00" },
    { value: "America/Los_Angeles", label: "Los Angeles (Pacific)", offset: "UTC-08:00" },
    { value: "America/Tijuana", label: "Tijuana", offset: "UTC-08:00" },
    { value: "America/Denver", label: "Denver (Mountain)", offset: "UTC-07:00" },
    { value: "America/Phoenix", label: "Phoenix (Arizona)", offset: "UTC-07:00" },
    { value: "America/Chicago", label: "Chicago (Central)", offset: "UTC-06:00" },
    { value: "America/Mexico_City", label: "Mexico City", offset: "UTC-06:00" },
    { value: "America/Regina", label: "Regina (Saskatchewan)", offset: "UTC-06:00" },
    { value: "America/Bogota", label: "Bogota (Colombia)", offset: "UTC-05:00" },
    { value: "America/New_York", label: "New York (Eastern)", offset: "UTC-05:00" },
    { value: "America/Indiana/Indianapolis", label: "Indianapolis", offset: "UTC-05:00" },
    { value: "America/Lima", label: "Lima (Peru)", offset: "UTC-05:00" },
    { value: "America/Halifax", label: "Halifax (Atlantic)", offset: "UTC-04:00" },
    { value: "America/Caracas", label: "Caracas (Venezuela)", offset: "UTC-04:00" },
    { value: "America/Santiago", label: "Santiago (Chile)", offset: "UTC-04:00" },
    { value: "America/St_Johns", label: "St. John's (Newfoundland)", offset: "UTC-03:30" },
    { value: "America/Sao_Paulo", label: "São Paulo (Brazil)", offset: "UTC-03:00" },
    { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (Argentina)", offset: "UTC-03:00" },
    { value: "America/Montevideo", label: "Montevideo (Uruguay)", offset: "UTC-03:00" },
    { value: "Atlantic/South_Georgia", label: "South Georgia", offset: "UTC-02:00" },
    { value: "Atlantic/Azores", label: "Azores", offset: "UTC-01:00" },
    { value: "Atlantic/Cape_Verde", label: "Cape Verde", offset: "UTC-01:00" },
    { value: "Europe/London", label: "London (GMT)", offset: "UTC+00:00" },
    { value: "Europe/Dublin", label: "Dublin", offset: "UTC+00:00" },
    { value: "Africa/Casablanca", label: "Casablanca (Morocco)", offset: "UTC+01:00" },
    { value: "Europe/Paris", label: "Paris (CET)", offset: "UTC+01:00" },
    { value: "Europe/Berlin", label: "Berlin (CET)", offset: "UTC+01:00" },
    { value: "Europe/Madrid", label: "Madrid (Spain)", offset: "UTC+01:00" },
    { value: "Europe/Rome", label: "Rome (Italy)", offset: "UTC+01:00" },
    { value: "Europe/Amsterdam", label: "Amsterdam (Netherlands)", offset: "UTC+01:00" },
    { value: "Europe/Zurich", label: "Zurich (Switzerland)", offset: "UTC+01:00" },
    { value: "Europe/Stockholm", label: "Stockholm (Sweden)", offset: "UTC+01:00" },
    { value: "Europe/Oslo", label: "Oslo (Norway)", offset: "UTC+01:00" },
    { value: "Europe/Copenhagen", label: "Copenhagen (Denmark)", offset: "UTC+01:00" },
    { value: "Europe/Warsaw", label: "Warsaw (Poland)", offset: "UTC+01:00" },
    { value: "Europe/Budapest", label: "Budapest (Hungary)", offset: "UTC+01:00" },
    { value: "Europe/Vienna", label: "Vienna (Austria)", offset: "UTC+01:00" },
    { value: "Europe/Prague", label: "Prague (Czech)", offset: "UTC+01:00" },
    { value: "Europe/Lisbon", label: "Lisbon (Portugal)", offset: "UTC+00:00" },
    { value: "Africa/Lagos", label: "Lagos (Nigeria)", offset: "UTC+01:00" },
    { value: "Africa/Algiers", label: "Algiers (Algeria)", offset: "UTC+01:00" },
    { value: "Africa/Tunis", label: "Tunis (Tunisia)", offset: "UTC+01:00" },
    { value: "Europe/Bucharest", label: "Bucharest (Romania)", offset: "UTC+02:00" },
    { value: "Europe/Athens", label: "Athens (Greece)", offset: "UTC+02:00" },
    { value: "Europe/Helsinki", label: "Helsinki (Finland)", offset: "UTC+02:00" },
    { value: "Europe/Belgrade", label: "Belgrade (Serbia)", offset: "UTC+01:00" },
    { value: "Europe/Sofia", label: "Sofia (Bulgaria)", offset: "UTC+02:00" },
    { value: "Africa/Cairo", label: "Cairo (Egypt)", offset: "UTC+02:00" },
    { value: "Africa/Johannesburg", label: "Johannesburg (South Africa)", offset: "UTC+02:00" },
    { value: "Africa/Nairobi", label: "Nairobi (Kenya)", offset: "UTC+03:00" },
    { value: "Europe/Istanbul", label: "Istanbul (Turkey)", offset: "UTC+03:00" },
    { value: "Europe/Moscow", label: "Moscow (Russia)", offset: "UTC+03:00" },
    { value: "Asia/Riyadh", label: "Riyadh (Saudi Arabia)", offset: "UTC+03:00" },
    { value: "Asia/Dubai", label: "Dubai (UAE)", offset: "UTC+04:00" },
    { value: "Asia/Karachi", label: "Karachi (Pakistan)", offset: "UTC+05:00" },
    { value: "Asia/Tashkent", label: "Tashkent (Uzbekistan)", offset: "UTC+05:00" },
    { value: "Asia/Kolkata", label: "Kolkata (India)", offset: "UTC+05:30" },
    { value: "Asia/Colombo", label: "Colombo (Sri Lanka)", offset: "UTC+05:30" },
    { value: "Asia/Kathmandu", label: "Kathmandu (Nepal)", offset: "UTC+05:45" },
    { value: "Asia/Dhaka", label: "Dhaka (Bangladesh)", offset: "UTC+06:00" },
    { value: "Asia/Almaty", label: "Almaty (Kazakhstan)", offset: "UTC+06:00" },
    { value: "Asia/Yangon", label: "Yangon (Myanmar)", offset: "UTC+06:30" },
    { value: "Asia/Bangkok", label: "Bangkok (Thailand)", offset: "UTC+07:00" },
    { value: "Asia/Jakarta", label: "Jakarta (Indonesia)", offset: "UTC+07:00" },
    { value: "Asia/Singapore", label: "Singapore", offset: "UTC+08:00" },
    { value: "Asia/Kuala_Lumpur", label: "Kuala Lumpur (Malaysia)", offset: "UTC+08:00" },
    { value: "Asia/Hong_Kong", label: "Hong Kong", offset: "UTC+08:00" },
    { value: "Asia/Shanghai", label: "Shanghai (China)", offset: "UTC+08:00" },
    { value: "Asia/Taipei", label: "Taipei (Taiwan)", offset: "UTC+08:00" },
    { value: "Asia/Manila", label: "Manila (Philippines)", offset: "UTC+08:00" },
    { value: "Asia/Seoul", label: "Seoul (South Korea)", offset: "UTC+09:00" },
    { value: "Asia/Tokyo", label: "Tokyo (Japan)", offset: "UTC+09:00" },
    { value: "Australia/Adelaide", label: "Adelaide (Australia)", offset: "UTC+09:30" },
    { value: "Australia/Sydney", label: "Sydney (Australia)", offset: "UTC+10:00" },
    { value: "Pacific/Auckland", label: "Auckland (New Zealand)", offset: "UTC+12:00" },
    { value: "Pacific/Fiji", label: "Fiji", offset: "UTC+12:00" },
  ];
}

// ============================================================================
// Event Detection Functions
// ============================================================================

function parseMMDD(dateStr: string): { month: number; day: number } {
  const [m, d] = dateStr.split("-").map(Number);
  return { month: m, day: d };
}

function todayMMDD(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

function dateToOrdinal(dateStr: string): number {
  const { month, day } = parseMMDD(dateStr);
  return month * 100 + day;
}

export function getActiveEvents(country: string, religion: string): SeasonalEvent[] {
  const today = todayMMDD();
  const todayOrd = dateToOrdinal(today);

  return EVENTS.filter((event) => {
    const startOrd = dateToOrdinal(event.date);
    const endOrd = event.dateEnd ? dateToOrdinal(event.dateEnd) : startOrd;

    if (todayOrd < startOrd || todayOrd > endOrd) return false;

    // Check religion match
    if (!event.religions.includes("all") && !event.religions.includes(religion)) return false;

    // Check country match
    if (!event.countries.includes("all") && !event.countries.includes(country)) return false;

    return true;
  });
}

export function getUpcomingEvents(country: string, religion: string, daysAhead: number = 30): SeasonalEvent[] {
  const today = new Date();
  const future = new Date(today);
  future.setDate(future.getDate() + daysAhead);

  return EVENTS.filter((event) => {
    const start = parseMMDD(event.date);
    let eventYear = today.getFullYear();
    let eventDate = new Date(eventYear, start.month - 1, start.day);

    // If event already passed this year, check next year
    if (eventDate < today) {
      eventDate = new Date(eventYear + 1, start.month - 1, start.day);
    }

    if (eventDate > future) return false;
    if (eventDate <= today) return false;

    if (!event.religions.includes("all") && !event.religions.includes(religion)) return false;
    if (!event.countries.includes("all") && !event.countries.includes(country)) return false;

    return true;
  }).sort((a, b) => {
    const aDate = parseMMDD(a.date);
    const bDate = parseMMDD(b.date);
    return (aDate.month * 100 + aDate.day) - (bDate.month * 100 + bDate.day);
  });
}

export function applyEventTheme(event: SeasonalEvent): EventTheme {
  return event.theme;
}

export function getFloatingIcons(event: SeasonalEvent): string[] {
  return event.floatingIcons;
}

export function getAllEvents(): SeasonalEvent[] {
  return EVENTS;
}
