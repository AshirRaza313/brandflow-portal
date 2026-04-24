// ============================================================================
// Currency System — Country-to-Currency Mapping
// BrandFlow uses PKR as default (Pakistani portal), but supports multi-currency
// ============================================================================

export interface CurrencyInfo {
  code: string;
  symbol: string;
  flag: string;
  name: string;
}

// Country code → Currency mapping (ISO 3166-1 alpha-2)
export const COUNTRY_CURRENCY: Record<string, CurrencyInfo> = {
  // South Asia
  PK: { code: "PKR", symbol: "Rs.", flag: "\u{1F1F5}\u{1F1F0}", name: "Pakistani Rupee" },
  IN: { code: "INR", symbol: "\u20B9", flag: "\u{1F1EE}\u{1F1F3}", name: "Indian Rupee" },
  BD: { code: "BDT", symbol: "\u09F3", flag: "\u{1F1E7}\u{1F1E9}", name: "Bangladeshi Taka" },
  NP: { code: "NPR", symbol: "Rs.", flag: "\u{1F1F3}\u{1F1F5}", name: "Nepalese Rupee" },
  LK: { code: "LKR", symbol: "Rs.", flag: "\u{1F1F1}\u{1F1F0}", name: "Sri Lankan Rupee" },
  AF: { code: "AFN", symbol: "\u060B", flag: "\u{1F1E6}\u{1F1EB}", name: "Afghan Afghani" },

  // Middle East
  AE: { code: "AED", symbol: "AED", flag: "\u{1F1E6}\u{1F1EA}", name: "UAE Dirham" },
  SA: { code: "SAR", symbol: "SAR", flag: "\u{1F1F8}\u{1F1E6}", name: "Saudi Riyal" },
  QA: { code: "QAR", symbol: "QR", flag: "\u{1F1F6}\u{1F1E6}", name: "Qatari Riyal" },
  KW: { code: "KWD", symbol: "KD", flag: "\u{1F1F0}\u{1F1FC}", name: "Kuwaiti Dinar" },
  BH: { code: "BHD", symbol: "BD", flag: "\u{1F1E7}\u{1F1ED}", name: "Bahraini Dinar" },
  OM: { code: "OMR", symbol: "OMR", flag: "\u{1F1F4}\u{1F1F2}", name: "Omani Rial" },
  IQ: { code: "IQD", symbol: "ID", flag: "\u{1F1EE}\u{1F1F6}", name: "Iraqi Dinar" },
  JO: { code: "JOD", symbol: "JD", flag: "\u{1F1EF}\u{1F1F4}", name: "Jordanian Dinar" },
  LB: { code: "LBP", symbol: "L.L.", flag: "\u{1F1F1}\u{1F1E7}", name: "Lebanese Pound" },
  EG: { code: "EGP", symbol: "E\u00A3", flag: "\u{1F1EA}\u{1F1EC}", name: "Egyptian Pound" },
  TR: { code: "TRY", symbol: "\u20BA", flag: "\u{1F1F9}\u{1F1F7}", name: "Turkish Lira" },
  IR: { code: "IRR", symbol: "IRR", flag: "\u{1F1EE}\u{1F1F7}", name: "Iranian Rial" },
  PS: { code: "ILS", symbol: "\u20AA", flag: "\u{1F1F5}\u{1F1F8}", name: "Israeli Shekel" },
  YE: { code: "YER", symbol: "YER", flag: "\u{1F1FE}\u{1F1EA}", name: "Yemeni Rial" },

  // East Asia
  CN: { code: "CNY", symbol: "\u00A5", flag: "\u{1F1E8}\u{1F1F3}", name: "Chinese Yuan" },
  JP: { code: "JPY", symbol: "\u00A5", flag: "\u{1F1EF}\u{1F1F5}", name: "Japanese Yen" },
  KR: { code: "KRW", symbol: "\u20A9", flag: "\u{1F1F0}\u{1F1F7}", name: "Korean Won" },
  TW: { code: "TWD", symbol: "NT$", flag: "\u{1F1F9}\u{1F1FC}", name: "Taiwan Dollar" },
  HK: { code: "HKD", symbol: "HK$", flag: "\u{1F1ED}\u{1F1F0}", name: "Hong Kong Dollar" },
  SG: { code: "SGD", symbol: "S$", flag: "\u{1F1F8}\u{1F1EC}", name: "Singapore Dollar" },
  MY: { code: "MYR", symbol: "RM", flag: "\u{1F1F2}\u{1F1FE}", name: "Malaysian Ringgit" },
  TH: { code: "THB", symbol: "\u0E3F", flag: "\u{1F1F9}\u{1F1ED}", name: "Thai Baht" },
  PH: { code: "PHP", symbol: "\u20B1", flag: "\u{1F1F5}\u{1F1ED}", name: "Philippine Peso" },
  ID: { code: "IDR", symbol: "Rp", flag: "\u{1F1EE}\u{1F1E9}", name: "Indonesian Rupiah" },
  VN: { code: "VND", symbol: "\u20AB", flag: "\u{1F1FB}\u{1F1F3}", name: "Vietnamese Dong" },

  // Europe
  GB: { code: "GBP", symbol: "\u00A3", flag: "\u{1F1EC}\u{1F1E7}", name: "British Pound" },
  DE: { code: "EUR", symbol: "\u20AC", flag: "\u{1F1E9}\u{1F1EA}", name: "Euro" },
  FR: { code: "EUR", symbol: "\u20AC", flag: "\u{1F1EB}\u{1F1F7}", name: "Euro" },
  IT: { code: "EUR", symbol: "\u20AC", flag: "\u{1F1EE}\u{1F1F9}", name: "Euro" },
  ES: { code: "EUR", symbol: "\u20AC", flag: "\u{1F1EA}\u{1F1F8}", name: "Euro" },
  NL: { code: "EUR", symbol: "\u20AC", flag: "\u{1F1F3}\u{1F1F1}", name: "Euro" },
  SE: { code: "SEK", symbol: "kr", flag: "\u{1F1F8}\u{1F1EA}", name: "Swedish Krona" },
  NO: { code: "NOK", symbol: "kr", flag: "\u{1F1F3}\u{1F1F4}", name: "Norwegian Krone" },
  DK: { code: "DKK", symbol: "kr", flag: "\u{1F1E9}\u{1F1F0}", name: "Danish Krone" },
  CH: { code: "CHF", symbol: "CHF", flag: "\u{1F1E8}\u{1F1ED}", name: "Swiss Franc" },
  PL: { code: "PLN", symbol: "z\u0142", flag: "\u{1F1F5}\u{1F1F1}", name: "Polish Zloty" },
  RU: { code: "RUB", symbol: "\u20BD", flag: "\u{1F1F7}\u{1F1FA}", name: "Russian Ruble" },
  UA: { code: "UAH", symbol: "\u20B4", flag: "\u{1F1FA}\u{1F1E6}", name: "Ukrainian Hryvnia" },
  IE: { code: "EUR", symbol: "\u20AC", flag: "\u{1F1EE}\u{1F1EA}", name: "Euro" },
  PT: { code: "EUR", symbol: "\u20AC", flag: "\u{1F1F5}\u{1F1F9}", name: "Euro" },

  // Americas
  US: { code: "USD", symbol: "$", flag: "\u{1F1FA}\u{1F1F8}", name: "US Dollar" },
  CA: { code: "CAD", symbol: "C$", flag: "\u{1F1E8}\u{1F1E6}", name: "Canadian Dollar" },
  MX: { code: "MXN", symbol: "MX$", flag: "\u{1F1F2}\u{1F1FD}", name: "Mexican Peso" },
  BR: { code: "BRL", symbol: "R$", flag: "\u{1F1E7}\u{1F1F7}", name: "Brazilian Real" },
  AR: { code: "ARS", symbol: "AR$", flag: "\u{1F1E6}\u{1F1F7}", name: "Argentine Peso" },
  CO: { code: "COP", symbol: "COL$", flag: "\u{1F1E8}\u{1F1F4}", name: "Colombian Peso" },
  CL: { code: "CLP", symbol: "CL$", flag: "\u{1F1E8}\u{1F1F1}", name: "Chilean Peso" },
  PE: { code: "PEN", symbol: "S/.", flag: "\u{1F1F5}\u{1F1EA}", name: "Peruvian Sol" },
  AU: { code: "AUD", symbol: "A$", flag: "\u{1F1E6}\u{1F1FA}", name: "Australian Dollar" },
  NZ: { code: "NZD", symbol: "NZ$", flag: "\u{1F1F3}\u{1F1FF}", name: "New Zealand Dollar" },

  // Africa
  ZA: { code: "ZAR", symbol: "R", flag: "\u{1F1FF}\u{1F1E6}", name: "South African Rand" },
  NG: { code: "NGN", symbol: "\u20A6", flag: "\u{1F1F3}\u{1F1EC}", name: "Nigerian Naira" },
  KE: { code: "KES", symbol: "KSh", flag: "\u{1F1F0}\u{1F1EA}", name: "Kenyan Shilling" },
  EG: { code: "EGP", symbol: "E\u00A3", flag: "\u{1F1EA}\u{1F1EC}", name: "Egyptian Pound" },
  MA: { code: "MAD", symbol: "MAD", flag: "\u{1F1F2}\u{1F1E6}", name: "Moroccan Dirham" },
};

/**
 * Get currency info for a country code
 * Defaults to PKR (Pakistani Rupee) if country not found
 */
export function getCurrencyForCountry(countryCode: string): CurrencyInfo {
  return COUNTRY_CURRENCY[countryCode] || COUNTRY_CURRENCY["PK"];
}

/**
 * Format amount with currency symbol
 * @param amount - The numeric amount
 * @param countryCode - ISO country code (defaults to PK)
 * @returns Formatted string like "Rs. 4,999" or "$100"
 */
export function formatCurrency(amount: number, countryCode: string = "PK"): string {
  const currency = getCurrencyForCountry(countryCode);
  return `${currency.symbol} ${amount.toLocaleString()}`;
}

/**
 * Get a small inline currency display element (for JSX)
 * Returns the flag emoji + symbol
 */
export function currencyDisplay(countryCode: string = "PK"): { flag: string; symbol: string; code: string } {
  const currency = getCurrencyForCountry(countryCode);
  return { flag: currency.flag, symbol: currency.symbol, code: currency.code };
}
