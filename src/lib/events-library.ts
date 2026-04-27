// ============================================================================
// Dynamic Events Library — Country + Religion Based Events System
// Returns curated events based on a brand's country and religion selection.
// ============================================================================

export interface RegionEvent {
  id: string;
  name: string;
  description: string;
  date: string; // "dynamic" for lunar events, or "MM-DD" for fixed
  lunar?: boolean;
  month?: number; // for lunar events, approximate Gregorian month (1-12)
  day?: number; // day of month for fixed events
  dateRule?: "fixed" | "lunar-islamic" | "dynamic";
  emoji: string;
  theme: {
    primary: string;
    secondary: string;
    gradient: string;
    bgPattern: string;
  };
  isActive: boolean;
  autoDetectDaysBefore: number;
  promotionalMessage: string;
  category: "religious" | "cultural" | "national" | "commercial";
}

// ============================================================================
// Event Database per Region
// ============================================================================

const PAKISTAN_EVENTS: RegionEvent[] = [
  { id: "pk-ramadan", name: "Ramadan", description: "Holy month of fasting, prayer and reflection for Muslims worldwide", date: "dynamic", lunar: true, month: 3, emoji: "🌙", theme: { primary: "#581c87", secondary: "#D97706", gradient: "linear-gradient(135deg, #581c87, #7c3aed, #D97706)", bgPattern: "rgba(88,28,135,0.04)" }, isActive: true, autoDetectDaysBefore: 30, promotionalMessage: "Ramadan Kareem! 🌙 Up to 30% off on all products", category: "religious" },
  { id: "pk-eid-fitr", name: "Eid ul Fitr", description: "Festival of breaking the fast — celebrations, gifts, feasts", date: "dynamic", lunar: true, month: 4, emoji: "🎉", theme: { primary: "#065f46", secondary: "#D97706", gradient: "linear-gradient(135deg, #065f46, #059669, #D97706)", bgPattern: "rgba(6,95,70,0.04)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "Eid Mubarak! 🎉 Eid Special Sale — 25% off!", category: "religious" },
  { id: "pk-eid-adha", name: "Eid ul Adha", description: "Festival of Sacrifice — faith, charity, and community", date: "dynamic", lunar: true, month: 6, emoji: "🐑", theme: { primary: "#166534", secondary: "#D97706", gradient: "linear-gradient(135deg, #166534, #059669, #D97706)", bgPattern: "rgba(22,101,52,0.04)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "Eid ul Adha Mubarak! 🐑 Qurbani Special Deals!", category: "religious" },
  { id: "pk-shab-barat", name: "Shab-e-Barat", description: "Night of Fortune — a night of prayer and forgiveness", date: "dynamic", lunar: true, month: 2, emoji: "🤲", theme: { primary: "#1e3a5f", secondary: "#D97706", gradient: "linear-gradient(135deg, #1e3a5f, #1e40af, #D97706)", bgPattern: "rgba(30,58,95,0.04)" }, isActive: true, autoDetectDaysBefore: 3, promotionalMessage: "Shab-e-Barat Mubarak! 🤲 Blessed Night Special", category: "religious" },
  { id: "pk-shab-qadr", name: "Shab-e-Qadr", description: "Night of Power — better than a thousand months", date: "dynamic", lunar: true, month: 3, emoji: "⭐", theme: { primary: "#312e81", secondary: "#F59E0B", gradient: "linear-gradient(135deg, #312e81, #4338ca, #F59E0B)", bgPattern: "rgba(49,46,129,0.05)" }, isActive: true, autoDetectDaysBefore: 3, promotionalMessage: "Shab-e-Qadr Mubarak! ⭐ Night of Blessings", category: "religious" },
  { id: "pk-milad-nabi", name: "Eid Milad-un-Nabi", description: "Birthday of Prophet Muhammad (PBUH) — peace and blessings", date: "dynamic", lunar: true, month: 9, emoji: "🕌", theme: { primary: "#065f46", secondary: "#D97706", gradient: "linear-gradient(135deg, #065f46, #047857, #D97706)", bgPattern: "rgba(6,95,70,0.04)" }, isActive: true, autoDetectDaysBefore: 3, promotionalMessage: "Milad un Nabi Mubarak! 🕌 Blessed Day Special", category: "religious" },
  { id: "pk-shab-meraj", name: "Shab-e-Meraj", description: "Night of Ascension — sacred journey of Prophet Muhammad (PBUH)", date: "dynamic", lunar: true, month: 1, emoji: "✨", theme: { primary: "#1e3a5f", secondary: "#D97706", gradient: "linear-gradient(135deg, #1e3a5f, #1e40af, #D97706)", bgPattern: "rgba(30,58,95,0.04)" }, isActive: true, autoDetectDaysBefore: 3, promotionalMessage: "Shab-e-Meraj Mubarak! ✨ Blessed Night Special", category: "religious" },
  { id: "pk-aug14", name: "Youm-e-Azadi", description: "Independence Day of Pakistan — August 14, 1947", date: "08-14", emoji: "🇵🇰", theme: { primary: "#16a34a", secondary: "#ffffff", gradient: "linear-gradient(135deg, #16a34a, #15803d, #ffffff)", bgPattern: "rgba(22,163,74,0.04)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "Happy Independence Day! 🇵🇰 Azadi Sale — 30% off!", category: "national" },
  { id: "pk-mar23", name: "Pakistan Day", description: "Lahore Resolution — March 23, 1940", date: "03-23", emoji: "🇵🇰", theme: { primary: "#16a34a", secondary: "#ffffff", gradient: "linear-gradient(135deg, #16a34a, #15803d)", bgPattern: "rgba(22,163,74,0.04)" }, isActive: true, autoDetectDaysBefore: 5, promotionalMessage: "Pakistan Day! 🇵🇰 Special Deals Today!", category: "national" },
  { id: "pk-sep06", name: "Youm-e-Difa", description: "Defense Day — honoring martyrs of 1965 war", date: "09-06", emoji: "🎖️", theme: { primary: "#16a34a", secondary: "#dc2626", gradient: "linear-gradient(135deg, #16a34a, #dc2626)", bgPattern: "rgba(22,163,74,0.04)" }, isActive: true, autoDetectDaysBefore: 3, promotionalMessage: "Defense Day — Salute to Our Heroes!", category: "national" },
  { id: "pk-mar23-labour", name: "Labour Day", description: "International Workers' Day", date: "05-01", emoji: "⚒️", theme: { primary: "#dc2626", secondary: "#f59e0b", gradient: "linear-gradient(135deg, #dc2626, #f59e0b)", bgPattern: "rgba(220,38,38,0.04)" }, isActive: true, autoDetectDaysBefore: 3, promotionalMessage: "Labour Day! ⚒️ Workers Appreciation Sale!", category: "national" },
  { id: "pk-mothers", name: "Mother's Day", description: "Celebrating mothers everywhere", date: "05-11", emoji: "💐", theme: { primary: "#ec4899", secondary: "#f472b6", gradient: "linear-gradient(135deg, #ec4899, #f472b6, #fce7f3)", bgPattern: "rgba(236,72,153,0.04)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "Happy Mother's Day! 💐 Mom Special — 20% off!", category: "cultural" },
  { id: "pk-fathers", name: "Father's Day", description: "Celebrating fathers everywhere", date: "06-15", emoji: "👔", theme: { primary: "#1e40af", secondary: "#64748b", gradient: "linear-gradient(135deg, #1e40af, #3b82f6, #64748b)", bgPattern: "rgba(30,64,175,0.04)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "Happy Father's Day! 👔 Dad Special — 20% off!", category: "cultural" },
  { id: "pk-winter", name: "Winter Sale", description: "End of year clearance and winter promotions", date: "12-20", emoji: "❄️", theme: { primary: "#0891b2", secondary: "#6366f1", gradient: "linear-gradient(135deg, #0891b2, #06b6d4, #6366f1)", bgPattern: "rgba(8,145,178,0.04)" }, isActive: true, autoDetectDaysBefore: 5, promotionalMessage: "Winter Wonderland Sale! ❄️ Up to 50% off!", category: "commercial" },
  { id: "pk-summer", name: "Summer Sale", description: "Hot summer deals and seasonal promotions", date: "06-15", emoji: "☀️", theme: { primary: "#ea580c", secondary: "#eab308", gradient: "linear-gradient(135deg, #ea580c, #f59e0b, #eab308)", bgPattern: "rgba(234,88,12,0.04)" }, isActive: true, autoDetectDaysBefore: 5, promotionalMessage: "Summer Sizzler Sale! ☀️ Hot deals await!", category: "commercial" },
  { id: "pk-newyear", name: "New Year", description: "New Year celebrations — new beginnings", date: "12-31", emoji: "🎆", theme: { primary: "#1e40af", secondary: "#f59e0b", gradient: "linear-gradient(135deg, #1e40af, #2563eb, #f59e0b)", bgPattern: "rgba(30,64,175,0.04)" }, isActive: true, autoDetectDaysBefore: 5, promotionalMessage: "Happy New Year! 🎆 Fresh Start Sale — 25% off!", category: "cultural" },
  { id: "pk-black-friday", name: "Black Friday", description: "The biggest shopping event of the year", date: "11-28", emoji: "🖤", theme: { primary: "#000000", secondary: "#D97706", gradient: "linear-gradient(135deg, #000000, #1c1917, #D97706)", bgPattern: "rgba(0,0,0,0.03)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "BLACK FRIDAY! 🖤 Up to 50% off EVERYTHING!", category: "commercial" },
];

const INDIA_EVENTS: RegionEvent[] = [
  { id: "in-diwali", name: "Diwali", description: "Festival of Lights — victory of light over darkness", date: "11-08", emoji: "🪔", theme: { primary: "#c2410c", secondary: "#EAB308", gradient: "linear-gradient(135deg, #c2410c, #ea580c, #EAB308)", bgPattern: "rgba(194,65,12,0.04)" }, isActive: true, autoDetectDaysBefore: 14, promotionalMessage: "Happy Diwali! 🪔 Festival of Lights Sale — 30% off!", category: "religious" },
  { id: "in-holi", name: "Holi", description: "Festival of Colors — joy, love, and spring", date: "03-10", emoji: "🎨", theme: { primary: "#e11d48", secondary: "#8b5cf6", gradient: "linear-gradient(135deg, #e11d48, #8b5cf6, #06b6d4)", bgPattern: "rgba(225,29,72,0.04)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "Happy Holi! 🎨 Color Festival Sale!", category: "religious" },
  { id: "in-navratri", name: "Navratri", description: "Nine nights of Goddess Durga worship", date: "10-01", emoji: "💃", theme: { primary: "#dc2626", secondary: "#f59e0b", gradient: "linear-gradient(135deg, #dc2626, #ef4444, #f59e0b)", bgPattern: "rgba(220,38,38,0.04)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "Happy Navratri! 💃 Garba Special Sale!", category: "religious" },
  { id: "in-dussehra", name: "Dussehra", description: "Victory of good over evil — Ramlila celebrations", date: "10-10", emoji: "🏹", theme: { primary: "#dc2626", secondary: "#f97316", gradient: "linear-gradient(135deg, #dc2626, #b91c1c, #f97316)", bgPattern: "rgba(220,38,38,0.04)" }, isActive: true, autoDetectDaysBefore: 5, promotionalMessage: "Happy Dussehra! 🏹 Victory Sale — 25% off!", category: "religious" },
  { id: "in-ganesh", name: "Ganesh Chaturthi", description: "Birthday of Lord Ganesha — remover of obstacles", date: "08-27", emoji: "🙏", theme: { primary: "#dc2626", secondary: "#f59e0b", gradient: "linear-gradient(135deg, #dc2626, #ea580c, #f59e0b)", bgPattern: "rgba(220,38,38,0.04)" }, isActive: true, autoDetectDaysBefore: 5, promotionalMessage: "Ganpati Bappa Morya! 🙏 Blessings Sale!", category: "religious" },
  { id: "in-aug15", name: "Independence Day", description: "India's Independence Day — August 15, 1947", date: "08-15", emoji: "🇮🇳", theme: { primary: "#f97316", secondary: "#ffffff", gradient: "linear-gradient(135deg, #f97316, #16a34a, #ffffff)", bgPattern: "rgba(249,115,22,0.04)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "Happy Independence Day! 🇮🇳 Swatantrata Sale!", category: "national" },
  { id: "in-jan26", name: "Republic Day", description: "Republic Day of India — January 26, 1950", date: "01-26", emoji: "🇮🇳", theme: { primary: "#f97316", secondary: "#16a34a", gradient: "linear-gradient(135deg, #f97316, #16a34a)", bgPattern: "rgba(249,115,22,0.04)" }, isActive: true, autoDetectDaysBefore: 5, promotionalMessage: "Republic Day! 🇮🇳 Gantantra Sale — 20% off!", category: "national" },
  { id: "in-christmas", name: "Christmas", description: "Celebration of the birth of Jesus Christ", date: "12-25", emoji: "🎄", theme: { primary: "#dc2626", secondary: "#16a34a", gradient: "linear-gradient(135deg, #dc2626, #b91c1c, #16a34a)", bgPattern: "rgba(220,38,38,0.04)" }, isActive: true, autoDetectDaysBefore: 14, promotionalMessage: "Merry Christmas! 🎄 Holiday Sale — Up to 30% off!", category: "religious" },
  { id: "in-eid-fitr", name: "Eid ul Fitr", description: "Festival of breaking the fast — celebrated across India", date: "dynamic", lunar: true, month: 4, emoji: "🎉", theme: { primary: "#065f46", secondary: "#D97706", gradient: "linear-gradient(135deg, #065f46, #059669, #D97706)", bgPattern: "rgba(6,95,70,0.04)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "Eid Mubarak! 🎉 Eid Special Sale — 20% off!", category: "religious" },
  { id: "in-pongal", name: "Pongal", description: "Tamil harvest festival — thanksgiving to nature", date: "01-14", emoji: "🌾", theme: { primary: "#f59e0b", secondary: "#16a34a", gradient: "linear-gradient(135deg, #f59e0b, #d97706, #16a34a)", bgPattern: "rgba(245,158,11,0.04)" }, isActive: true, autoDetectDaysBefore: 5, promotionalMessage: "Happy Pongal! 🌾 Harvest Festival Special!", category: "religious" },
  { id: "in-newyear", name: "New Year", description: "New Year celebrations", date: "12-31", emoji: "🎆", theme: { primary: "#1e40af", secondary: "#f59e0b", gradient: "linear-gradient(135deg, #1e40af, #2563eb, #f59e0b)", bgPattern: "rgba(30,64,175,0.04)" }, isActive: true, autoDetectDaysBefore: 5, promotionalMessage: "Happy New Year! 🎆 Fresh Start Sale!", category: "cultural" },
];

const UAE_EVENTS: RegionEvent[] = [
  { id: "ae-ramadan", name: "Ramadan", description: "Holy month of fasting, prayer and reflection", date: "dynamic", lunar: true, month: 3, emoji: "🌙", theme: { primary: "#581c87", secondary: "#D97706", gradient: "linear-gradient(135deg, #581c87, #7c3aed, #D97706)", bgPattern: "rgba(88,28,135,0.04)" }, isActive: true, autoDetectDaysBefore: 30, promotionalMessage: "Ramadan Kareem! 🌙 Up to 30% off!", category: "religious" },
  { id: "ae-eid-fitr", name: "Eid ul Fitr", description: "Festival of breaking the fast", date: "dynamic", lunar: true, month: 4, emoji: "🎉", theme: { primary: "#065f46", secondary: "#D97706", gradient: "linear-gradient(135deg, #065f46, #059669, #D97706)", bgPattern: "rgba(6,95,70,0.04)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "Eid Mubarak! 🎉 Eid Special Sale — 25% off!", category: "religious" },
  { id: "ae-eid-adha", name: "Eid ul Adha", description: "Festival of Sacrifice", date: "dynamic", lunar: true, month: 6, emoji: "🐑", theme: { primary: "#166534", secondary: "#D97706", gradient: "linear-gradient(135deg, #166534, #059669, #D97706)", bgPattern: "rgba(22,101,52,0.04)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "Eid ul Adha Mubarak! 🐑 Qurbani Special Deals!", category: "religious" },
  { id: "ae-national-day", name: "UAE National Day", description: "UAE National Day — December 2, 1971", date: "12-02", emoji: "🇦🇪", theme: { primary: "#16a34a", secondary: "#ffffff", gradient: "linear-gradient(135deg, #16a34a, #ffffff, #dc2626)", bgPattern: "rgba(22,163,74,0.04)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "Happy National Day! 🇦🇪 UAE Special Sale!", category: "national" },
  { id: "ae-commemoration", name: "Commemoration Day", description: "Honoring UAE martyrs", date: "11-30", emoji: "🕊️", theme: { primary: "#374151", secondary: "#f59e0b", gradient: "linear-gradient(135deg, #374151, #6b7280)", bgPattern: "rgba(55,65,81,0.03)" }, isActive: true, autoDetectDaysBefore: 3, promotionalMessage: "Commemoration Day — Special Collection", category: "national" },
  { id: "ae-ramadan-sale", name: "Ramadan Sale", description: "Special Ramadan shopping promotions", date: "dynamic", lunar: true, month: 3, emoji: "🕯️", theme: { primary: "#581c87", secondary: "#f59e0b", gradient: "linear-gradient(135deg, #581c87, #7c3aed, #f59e0b)", bgPattern: "rgba(88,28,135,0.04)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "Ramadan Mega Sale! 🕯️ Exclusive Deals!", category: "commercial" },
  { id: "ae-newyear", name: "New Year", description: "New Year celebrations", date: "12-31", emoji: "🎆", theme: { primary: "#1e40af", secondary: "#f59e0b", gradient: "linear-gradient(135deg, #1e40af, #2563eb, #f59e0b)", bgPattern: "rgba(30,64,175,0.04)" }, isActive: true, autoDetectDaysBefore: 5, promotionalMessage: "Happy New Year! 🎆 Fresh Start Sale!", category: "cultural" },
  { id: "ae-black-friday", name: "White Friday", description: "UAE's biggest shopping festival", date: "11-28", emoji: "⬜", theme: { primary: "#000000", secondary: "#D97706", gradient: "linear-gradient(135deg, #000000, #1c1917, #D97706)", bgPattern: "rgba(0,0,0,0.03)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "White Friday! ⬜ Up to 50% off!", category: "commercial" },
];

const SAUDI_EVENTS: RegionEvent[] = [
  { id: "sa-ramadan", name: "Ramadan", description: "Holy month of fasting, prayer and reflection", date: "dynamic", lunar: true, month: 3, emoji: "🌙", theme: { primary: "#581c87", secondary: "#D97706", gradient: "linear-gradient(135deg, #581c87, #7c3aed, #D97706)", bgPattern: "rgba(88,28,135,0.04)" }, isActive: true, autoDetectDaysBefore: 30, promotionalMessage: "Ramadan Kareem! 🌙 Up to 30% off!", category: "religious" },
  { id: "sa-eid-fitr", name: "Eid ul Fitr", description: "Festival of breaking the fast", date: "dynamic", lunar: true, month: 4, emoji: "🎉", theme: { primary: "#065f46", secondary: "#D97706", gradient: "linear-gradient(135deg, #065f46, #059669, #D97706)", bgPattern: "rgba(6,95,70,0.04)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "Eid Mubarak! 🎉 Eid Special Sale!", category: "religious" },
  { id: "sa-eid-adha", name: "Eid ul Adha", description: "Festival of Sacrifice", date: "dynamic", lunar: true, month: 6, emoji: "🐑", theme: { primary: "#166534", secondary: "#D97706", gradient: "linear-gradient(135deg, #166534, #059669, #D97706)", bgPattern: "rgba(22,101,52,0.04)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "Eid ul Adha Mubarak! 🐑 Special Deals!", category: "religious" },
  { id: "sa-national-day", name: "Saudi National Day", description: "Kingdom of Saudi Arabia National Day", date: "09-23", emoji: "🇸🇦", theme: { primary: "#16a34a", secondary: "#ffffff", gradient: "linear-gradient(135deg, #16a34a, #22c55e)", bgPattern: "rgba(22,163,74,0.04)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "Happy National Day! 🇸🇦 Special Deals!", category: "national" },
  { id: "sa-founding", name: "Saudi Founding Day", description: "Commemorating the founding of the First Saudi State", date: "02-22", emoji: "🏛️", theme: { primary: "#16a34a", secondary: "#f59e0b", gradient: "linear-gradient(135deg, #16a34a, #f59e0b)", bgPattern: "rgba(22,163,74,0.04)" }, isActive: true, autoDetectDaysBefore: 5, promotionalMessage: "Founding Day! 🏛️ Heritage Special Collection", category: "national" },
  { id: "sa-newyear", name: "New Year", description: "New Year celebrations", date: "12-31", emoji: "🎆", theme: { primary: "#1e40af", secondary: "#f59e0b", gradient: "linear-gradient(135deg, #1e40af, #2563eb, #f59e0b)", bgPattern: "rgba(30,64,175,0.04)" }, isActive: true, autoDetectDaysBefore: 5, promotionalMessage: "Happy New Year! 🎆 Fresh Start Sale!", category: "cultural" },
];

const USA_EVENTS: RegionEvent[] = [
  { id: "us-christmas", name: "Christmas", description: "Celebration of the birth of Jesus Christ", date: "12-25", emoji: "🎄", theme: { primary: "#dc2626", secondary: "#16a34a", gradient: "linear-gradient(135deg, #dc2626, #b91c1c, #16a34a)", bgPattern: "rgba(220,38,38,0.04)" }, isActive: true, autoDetectDaysBefore: 21, promotionalMessage: "Merry Christmas! 🎄 Holiday Sale — Up to 40% off!", category: "religious" },
  { id: "us-thanksgiving", name: "Thanksgiving", description: "American Thanksgiving — gratitude, family, and feasts", date: "11-27", emoji: "🦃", theme: { primary: "#b45309", secondary: "#dc2626", gradient: "linear-gradient(135deg, #b45309, #d97706, #dc2626)", bgPattern: "rgba(180,83,9,0.04)" }, isActive: true, autoDetectDaysBefore: 14, promotionalMessage: "Thanksgiving Sale! 🦃 Gratitude Deals — 30% off!", category: "cultural" },
  { id: "us-easter", name: "Easter", description: "Resurrection of Jesus Christ — celebration of new life", date: "04-05", emoji: "🥚", theme: { primary: "#a855f7", secondary: "#f59e0b", gradient: "linear-gradient(135deg, #a855f7, #c084fc, #f59e0b)", bgPattern: "rgba(168,85,247,0.04)" }, isActive: true, autoDetectDaysBefore: 14, promotionalMessage: "Happy Easter! 🥚 Easter Egg Hunt Sale!", category: "religious" },
  { id: "us-july4", name: "July 4th", description: "4th of July — American Independence Day", date: "07-04", emoji: "🇺🇸", theme: { primary: "#dc2626", secondary: "#1e40af", gradient: "linear-gradient(135deg, #dc2626, #1e40af, #ffffff)", bgPattern: "rgba(220,38,38,0.04)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "Happy 4th of July! 🇺🇸 Stars & Stripes Sale!", category: "national" },
  { id: "us-mothers", name: "Mother's Day", description: "Celebrating mothers everywhere", date: "05-11", emoji: "💐", theme: { primary: "#ec4899", secondary: "#f472b6", gradient: "linear-gradient(135deg, #ec4899, #f472b6, #fce7f3)", bgPattern: "rgba(236,72,153,0.04)" }, isActive: true, autoDetectDaysBefore: 14, promotionalMessage: "Happy Mother's Day! 💐 Mom Special — 25% off!", category: "cultural" },
  { id: "us-fathers", name: "Father's Day", description: "Celebrating fathers everywhere", date: "06-15", emoji: "👔", theme: { primary: "#1e40af", secondary: "#64748b", gradient: "linear-gradient(135deg, #1e40af, #3b82f6, #64748b)", bgPattern: "rgba(30,64,175,0.04)" }, isActive: true, autoDetectDaysBefore: 14, promotionalMessage: "Happy Father's Day! 👔 Dad Special — 20% off!", category: "cultural" },
  { id: "us-valentines", name: "Valentine's Day", description: "Day of love and romance", date: "02-14", emoji: "💕", theme: { primary: "#ec4899", secondary: "#dc2626", gradient: "linear-gradient(135deg, #ec4899, #f472b6, #dc2626)", bgPattern: "rgba(236,72,153,0.04)" }, isActive: true, autoDetectDaysBefore: 14, promotionalMessage: "Happy Valentine's! 💕 Love Special — 20% off!", category: "cultural" },
  { id: "us-halloween", name: "Halloween", description: "Spooky season — tricks, treats, and costumes", date: "10-31", emoji: "🎃", theme: { primary: "#ea580c", secondary: "#7c2d12", gradient: "linear-gradient(135deg, #ea580c, #c2410c, #7c2d12)", bgPattern: "rgba(234,88,12,0.04)" }, isActive: true, autoDetectDaysBefore: 14, promotionalMessage: "Halloween Sale! 🎃 Spooky Deals — 30% off!", category: "cultural" },
  { id: "us-black-friday", name: "Black Friday", description: "The biggest shopping day of the year", date: "11-28", emoji: "🖤", theme: { primary: "#000000", secondary: "#D97706", gradient: "linear-gradient(135deg, #000000, #1c1917, #D97706)", bgPattern: "rgba(0,0,0,0.03)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "BLACK FRIDAY! 🖤 Up to 60% off EVERYTHING!", category: "commercial" },
  { id: "us-newyear", name: "New Year", description: "New Year celebrations", date: "12-31", emoji: "🎆", theme: { primary: "#1e40af", secondary: "#f59e0b", gradient: "linear-gradient(135deg, #1e40af, #2563eb, #f59e0b)", bgPattern: "rgba(30,64,175,0.04)" }, isActive: true, autoDetectDaysBefore: 5, promotionalMessage: "Happy New Year! 🎆 Fresh Start Sale!", category: "cultural" },
];

const UK_EVENTS: RegionEvent[] = [
  { id: "gb-christmas", name: "Christmas", description: "Celebration of the birth of Jesus Christ", date: "12-25", emoji: "🎄", theme: { primary: "#dc2626", secondary: "#16a34a", gradient: "linear-gradient(135deg, #dc2626, #b91c1c, #16a34a)", bgPattern: "rgba(220,38,38,0.04)" }, isActive: true, autoDetectDaysBefore: 21, promotionalMessage: "Merry Christmas! 🎄 Holiday Sale — Up to 40% off!", category: "religious" },
  { id: "gb-easter", name: "Easter", description: "Resurrection of Jesus Christ", date: "04-05", emoji: "🥚", theme: { primary: "#a855f7", secondary: "#f59e0b", gradient: "linear-gradient(135deg, #a855f7, #c084fc, #f59e0b)", bgPattern: "rgba(168,85,247,0.04)" }, isActive: true, autoDetectDaysBefore: 14, promotionalMessage: "Happy Easter! 🥚 Easter Egg Hunt Sale!", category: "religious" },
  { id: "gb-valentines", name: "Valentine's Day", description: "Day of love and romance", date: "02-14", emoji: "💕", theme: { primary: "#ec4899", secondary: "#dc2626", gradient: "linear-gradient(135deg, #ec4899, #f472b6, #dc2626)", bgPattern: "rgba(236,72,153,0.04)" }, isActive: true, autoDetectDaysBefore: 14, promotionalMessage: "Happy Valentine's! 💕 Love Special — 20% off!", category: "cultural" },
  { id: "gb-halloween", name: "Halloween", description: "Spooky season — tricks, treats, and costumes", date: "10-31", emoji: "🎃", theme: { primary: "#ea580c", secondary: "#7c2d12", gradient: "linear-gradient(135deg, #ea580c, #c2410c, #7c2d12)", bgPattern: "rgba(234,88,12,0.04)" }, isActive: true, autoDetectDaysBefore: 14, promotionalMessage: "Halloween Sale! 🎃 Spooky Deals!", category: "cultural" },
  { id: "gb-mothers", name: "Mother's Day", description: "Celebrating mothers everywhere", date: "05-11", emoji: "💐", theme: { primary: "#ec4899", secondary: "#f472b6", gradient: "linear-gradient(135deg, #ec4899, #f472b6, #fce7f3)", bgPattern: "rgba(236,72,153,0.04)" }, isActive: true, autoDetectDaysBefore: 14, promotionalMessage: "Happy Mother's Day! 💐 Mom Special!", category: "cultural" },
  { id: "gb-fathers", name: "Father's Day", description: "Celebrating fathers everywhere", date: "06-15", emoji: "👔", theme: { primary: "#1e40af", secondary: "#64748b", gradient: "linear-gradient(135deg, #1e40af, #3b82f6, #64748b)", bgPattern: "rgba(30,64,175,0.04)" }, isActive: true, autoDetectDaysBefore: 14, promotionalMessage: "Happy Father's Day! 👔 Dad Special!", category: "cultural" },
  { id: "gb-black-friday", name: "Black Friday", description: "The biggest shopping day of the year", date: "11-28", emoji: "🖤", theme: { primary: "#000000", secondary: "#D97706", gradient: "linear-gradient(135deg, #000000, #1c1917, #D97706)", bgPattern: "rgba(0,0,0,0.03)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "BLACK FRIDAY! 🖤 Up to 60% off!", category: "commercial" },
  { id: "gb-newyear", name: "New Year", description: "New Year celebrations", date: "12-31", emoji: "🎆", theme: { primary: "#1e40af", secondary: "#f59e0b", gradient: "linear-gradient(135deg, #1e40af, #2563eb, #f59e0b)", bgPattern: "rgba(30,64,175,0.04)" }, isActive: true, autoDetectDaysBefore: 5, promotionalMessage: "Happy New Year! 🎆 Fresh Start Sale!", category: "cultural" },
  { id: "gb-bonfire", name: "Bonfire Night", description: "Guy Fawkes Night — fireworks and celebrations", date: "11-05", emoji: "🎇", theme: { primary: "#ea580c", secondary: "#f59e0b", gradient: "linear-gradient(135deg, #ea580c, #c2410c, #f59e0b)", bgPattern: "rgba(234,88,12,0.04)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "Bonfire Night! 🔇 Sparkler Special Deals!", category: "cultural" },
];

const BANGLADESH_EVENTS: RegionEvent[] = [
  { id: "bd-eid-fitr", name: "Eid ul Fitr", description: "Festival of breaking the fast — the biggest celebration in Bangladesh", date: "dynamic", lunar: true, month: 4, emoji: "🎉", theme: { primary: "#065f46", secondary: "#D97706", gradient: "linear-gradient(135deg, #065f46, #059669, #D97706)", bgPattern: "rgba(6,95,70,0.04)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "Eid Mubarak! 🎉 Eid Special Sale — 25% off!", category: "religious" },
  { id: "bd-eid-adha", name: "Eid ul Adha", description: "Festival of Sacrifice", date: "dynamic", lunar: true, month: 6, emoji: "🐑", theme: { primary: "#166534", secondary: "#D97706", gradient: "linear-gradient(135deg, #166534, #059669, #D97706)", bgPattern: "rgba(22,101,52,0.04)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "Eid ul Adha Mubarak! 🐑 Special Deals!", category: "religious" },
  { id: "bd-independence", name: "Independence Day", description: "Independence Day of Bangladesh — March 26, 1971", date: "03-26", emoji: "🇧🇩", theme: { primary: "#16a34a", secondary: "#dc2626", gradient: "linear-gradient(135deg, #16a34a, #dc2626)", bgPattern: "rgba(22,163,74,0.04)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "Happy Independence Day! 🇧🇩 Special Deals!", category: "national" },
  { id: "bd-mother-language", name: "Mother Language Day", description: "International Mother Language Day — February 21", date: "02-21", emoji: "📖", theme: { primary: "#dc2626", secondary: "#16a34a", gradient: "linear-gradient(135deg, #dc2626, #16a34a)", bgPattern: "rgba(220,38,38,0.04)" }, isActive: true, autoDetectDaysBefore: 5, promotionalMessage: "Ekushey February — আমাদের ভাষা, আমাদের অহংকার", category: "national" },
  { id: "bd-victory", name: "Victory Day", description: "Victory Day of Bangladesh — December 16, 1971", date: "12-16", emoji: "🏆", theme: { primary: "#16a34a", secondary: "#dc2626", gradient: "linear-gradient(135deg, #16a34a, #dc2626)", bgPattern: "rgba(22,163,74,0.04)" }, isActive: true, autoDetectDaysBefore: 5, promotionalMessage: "Victory Day! 🏆 Bijoy Dibosh Special!", category: "national" },
  { id: "bd-pohela-boishakh", name: "Pohela Boishakh", description: "Bengali New Year — first day of the Bengali calendar", date: "04-14", emoji: "🎨", theme: { primary: "#dc2626", secondary: "#f59e0b", gradient: "linear-gradient(135deg, #dc2626, #f59e0b, #eab308)", bgPattern: "rgba(220,38,38,0.04)" }, isActive: true, autoDetectDaysBefore: 5, promotionalMessage: "শুভ নববর্ষ! 🎨 Pohela Boishakh Special!", category: "cultural" },
  { id: "bd-newyear", name: "New Year", description: "New Year celebrations", date: "12-31", emoji: "🎆", theme: { primary: "#1e40af", secondary: "#f59e0b", gradient: "linear-gradient(135deg, #1e40af, #2563eb, #f59e0b)", bgPattern: "rgba(30,64,175,0.04)" }, isActive: true, autoDetectDaysBefore: 5, promotionalMessage: "Happy New Year! 🎆 Fresh Start Sale!", category: "cultural" },
];

const TURKEY_EVENTS: RegionEvent[] = [
  { id: "tr-ramadan", name: "Ramadan", description: "Holy month of fasting, prayer and reflection", date: "dynamic", lunar: true, month: 3, emoji: "🌙", theme: { primary: "#581c87", secondary: "#D97706", gradient: "linear-gradient(135deg, #581c87, #7c3aed, #D97706)", bgPattern: "rgba(88,28,135,0.04)" }, isActive: true, autoDetectDaysBefore: 30, promotionalMessage: "Ramazan Kareem! 🌙 Up to 30% off!", category: "religious" },
  { id: "tr-eid-fitr", name: "Eid ul Fitr", description: "Festival of breaking the fast — Ramazan Bayramı", date: "dynamic", lunar: true, month: 4, emoji: "🎉", theme: { primary: "#065f46", secondary: "#D97706", gradient: "linear-gradient(135deg, #065f46, #059669, #D97706)", bgPattern: "rgba(6,95,70,0.04)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "Ramazan Bayramı! 🎉 Bayram Özel!", category: "religious" },
  { id: "tr-eid-adha", name: "Eid ul Adha", description: "Festival of Sacrifice — Kurban Bayramı", date: "dynamic", lunar: true, month: 6, emoji: "🐑", theme: { primary: "#166534", secondary: "#D97706", gradient: "linear-gradient(135deg, #166534, #059669, #D97706)", bgPattern: "rgba(22,101,52,0.04)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "Kurban Bayramı! 🐑 Özel Fırsatlar!", category: "religious" },
  { id: "tr-republic", name: "Republic Day", description: "Republic Day of Turkey — October 29, 1923", date: "10-29", emoji: "🇹🇷", theme: { primary: "#dc2626", secondary: "#ffffff", gradient: "linear-gradient(135deg, #dc2626, #ffffff)", bgPattern: "rgba(220,38,38,0.04)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "Cumhuriyet Bayramı! 🇹🇷 Özel Kampanya!", category: "national" },
  { id: "tr-victory", name: "Victory Day", description: "Victory Day — August 30, Zafer Bayramı", date: "08-30", emoji: "🎖️", theme: { primary: "#dc2626", secondary: "#f59e0b", gradient: "linear-gradient(135deg, #dc2626, #f59e0b)", bgPattern: "rgba(220,38,38,0.04)" }, isActive: true, autoDetectDaysBefore: 5, promotionalMessage: "Zafer Bayramı! 🎖️ Özel Fırsatlar!", category: "national" },
  { id: "tr-sovereignty", name: "National Sovereignty Day", description: "National Sovereignty and Children's Day — April 23", date: "04-23", emoji: "🇹🇷", theme: { primary: "#dc2626", secondary: "#16a34a", gradient: "linear-gradient(135deg, #dc2626, #16a34a)", bgPattern: "rgba(220,38,38,0.04)" }, isActive: true, autoDetectDaysBefore: 5, promotionalMessage: "23 Nisan! 🇹🇷 Ulusal Egemenlik Çocuk Bayramı!", category: "national" },
  { id: "tr-newyear", name: "New Year", description: "New Year celebrations", date: "12-31", emoji: "🎆", theme: { primary: "#1e40af", secondary: "#f59e0b", gradient: "linear-gradient(135deg, #1e40af, #2563eb, #f59e0b)", bgPattern: "rgba(30,64,175,0.04)" }, isActive: true, autoDetectDaysBefore: 5, promotionalMessage: "Mutlu Yıllar! 🎆 Yeni Yıl İndirimi!", category: "cultural" },
];

const DEFAULT_EVENTS: RegionEvent[] = [
  { id: "def-newyear", name: "New Year", description: "New Year celebrations — new beginnings", date: "12-31", emoji: "🎆", theme: { primary: "#1e40af", secondary: "#f59e0b", gradient: "linear-gradient(135deg, #1e40af, #2563eb, #f59e0b)", bgPattern: "rgba(30,64,175,0.04)" }, isActive: true, autoDetectDaysBefore: 5, promotionalMessage: "Happy New Year! 🎆 Fresh Start Sale!", category: "cultural" },
  { id: "def-mothers", name: "Mother's Day", description: "Celebrating mothers everywhere", date: "05-11", emoji: "💐", theme: { primary: "#ec4899", secondary: "#f472b6", gradient: "linear-gradient(135deg, #ec4899, #f472b6, #fce7f3)", bgPattern: "rgba(236,72,153,0.04)" }, isActive: true, autoDetectDaysBefore: 14, promotionalMessage: "Happy Mother's Day! 💐 Mom Special — 20% off!", category: "cultural" },
  { id: "def-fathers", name: "Father's Day", description: "Celebrating fathers everywhere", date: "06-15", emoji: "👔", theme: { primary: "#1e40af", secondary: "#64748b", gradient: "linear-gradient(135deg, #1e40af, #3b82f6, #64748b)", bgPattern: "rgba(30,64,175,0.04)" }, isActive: true, autoDetectDaysBefore: 14, promotionalMessage: "Happy Father's Day! 👔 Dad Special — 20% off!", category: "cultural" },
  { id: "def-valentines", name: "Valentine's Day", description: "Day of love and romance", date: "02-14", emoji: "💕", theme: { primary: "#ec4899", secondary: "#dc2626", gradient: "linear-gradient(135deg, #ec4899, #f472b6, #dc2626)", bgPattern: "rgba(236,72,153,0.04)" }, isActive: true, autoDetectDaysBefore: 14, promotionalMessage: "Happy Valentine's! 💕 Love Special — 20% off!", category: "cultural" },
  { id: "def-black-friday", name: "Black Friday", description: "The biggest shopping day of the year", date: "11-28", emoji: "🖤", theme: { primary: "#000000", secondary: "#D97706", gradient: "linear-gradient(135deg, #000000, #1c1917, #D97706)", bgPattern: "rgba(0,0,0,0.03)" }, isActive: true, autoDetectDaysBefore: 7, promotionalMessage: "BLACK FRIDAY! 🖤 Up to 50% off EVERYTHING!", category: "commercial" },
  { id: "def-christmas", name: "Christmas", description: "Celebration of the birth of Jesus Christ", date: "12-25", emoji: "🎄", theme: { primary: "#dc2626", secondary: "#16a34a", gradient: "linear-gradient(135deg, #dc2626, #b91c1c, #16a34a)", bgPattern: "rgba(220,38,38,0.04)" }, isActive: true, autoDetectDaysBefore: 14, promotionalMessage: "Merry Christmas! 🎄 Holiday Sale — Up to 30% off!", category: "religious" },
];

// ============================================================================
// Country code normalization map
// ============================================================================

const COUNTRY_ALIASES: Record<string, string> = {
  PK: "PK", pak: "PK", pakistan: "PK", PAK: "PK",
  IN: "IN", ind: "IN", india: "IN", IND: "IN",
  AE: "AE", are: "AE", uae: "AE", UAE: "AE",
  SA: "SA", saudi: "SA", SAU: "SA", KSA: "SA",
  US: "US", usa: "US", USA: "US", united_states: "US",
  GB: "GB", gbr: "GB", uk: "GB", UK: "GB", united_kingdom: "GB",
  BD: "BD", bgd: "BD", bangladesh: "BD", BGD: "BD",
  TR: "TR", tur: "TR", turkey: "TR", TUR: "TR",
};

const RELIGION_ALIASES: Record<string, string> = {
  islam: "islam", muslim: "islam", muslimism: "islam", islamic: "islam",
  hinduism: "hinduism", hindu: "hinduism",
  christianity: "christianity", christian: "christianity", catholic: "christianity", protestant: "christianity",
  judaism: "judaism", jewish: "judaism",
  sikhism: "sikhism", sikh: "sikhism",
  buddhism: "buddhism", buddhist: "buddhism",
};

// ============================================================================
// Main lookup function
// ============================================================================

function normalizeCountry(input: string): string {
  if (!input) return "";
  return COUNTRY_ALIASES[input.trim().toLowerCase()] || input.trim().toUpperCase();
}

function normalizeReligion(input: string): string {
  if (!input) return "";
  return RELIGION_ALIASES[input.trim().toLowerCase()] || input.trim().toLowerCase();
}

const REGION_MAP: Record<string, Record<string, RegionEvent[]>> = {
  PK: { islam: PAKISTAN_EVENTS },
  IN: { hinduism: INDIA_EVENTS, islam: INDIA_EVENTS.filter(e => e.id === "in-eid-fitr"), default: INDIA_EVENTS },
  AE: { islam: UAE_EVENTS, default: UAE_EVENTS },
  SA: { islam: SAUDI_EVENTS, default: SAUDI_EVENTS },
  US: { christianity: USA_EVENTS, default: USA_EVENTS },
  GB: { christianity: UK_EVENTS, default: UK_EVENTS },
  BD: { islam: BANGLADESH_EVENTS, default: BANGLADESH_EVENTS },
  TR: { islam: TURKEY_EVENTS, default: TURKEY_EVENTS },
};

export function getEventsForRegion(country: string, religion: string): RegionEvent[] {
  const normCountry = normalizeCountry(country);
  const normReligion = normalizeReligion(religion);

  // Try exact country + religion match
  const countryEvents = REGION_MAP[normCountry];
  if (countryEvents) {
    if (normReligion && countryEvents[normReligion]) {
      return countryEvents[normReligion];
    }
    // Fall back to default for this country
    if (countryEvents.default) {
      return countryEvents.default;
    }
  }

  // For Islamic countries, use Islam-specific events
  const islamicCountries = ["PK", "AE", "SA", "BD", "TR", "IQ", "IR", "EG", "MY", "ID", "JO", "KW", "QA", "BH", "OM", "YE", "SY", "PS", "AF", "LB", "MA", "DZ", "TN"];
  if (islamicCountries.includes(normCountry) || normReligion === "islam") {
    // Return a generic Islamic events set
    return [...DEFAULT_EVENTS.filter(e => e.category === "cultural" || e.category === "commercial"), ...PAKISTAN_EVENTS.filter(e => e.category === "religious")];
  }

  // For Christian countries
  const christianCountries = ["US", "GB", "DE", "FR", "IT", "ES", "CA", "AU", "NZ", "NL", "SE", "NO", "DK", "FI", "IE", "PT", "GR", "AT", "BE", "CH", "PL", "BR", "MX", "AR", "CO", "CL", "PE", "ZA", "NG", "KE"];
  if (christianCountries.includes(normCountry) || normReligion === "christianity") {
    return [...DEFAULT_EVENTS.filter(e => e.category !== "religious"), ...USA_EVENTS.filter(e => e.category === "religious")];
  }

  // Default fallback
  return DEFAULT_EVENTS;
}

export function getCountryName(code: string): string {
  const names: Record<string, string> = {
    PK: "Pakistan", IN: "India", AE: "UAE", SA: "Saudi Arabia",
    US: "United States", GB: "United Kingdom", BD: "Bangladesh", TR: "Turkey",
  };
  return names[code] || code;
}

export function getCountryFlag(code: string): string {
  const flags: Record<string, string> = {
    PK: "🇵🇰", IN: "🇮🇳", AE: "🇦🇪", SA: "🇸🇦",
    US: "🇺🇸", GB: "🇬🇧", BD: "🇧🇩", TR: "🇹🇷",
  };
  return flags[code] || code;
}

export function getAllRegionCountries(): Array<{ code: string; name: string; flag: string }> {
  return [
    { code: "PK", name: "Pakistan", flag: "🇵🇰" },
    { code: "IN", name: "India", flag: "🇮🇳" },
    { code: "AE", name: "UAE", flag: "🇦🇪" },
    { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
    { code: "US", name: "United States", flag: "🇺🇸" },
    { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
    { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
    { code: "TR", name: "Turkey", flag: "🇹🇷" },
  ];
}
