"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useBrandOnyxStore } from "@/store/brandflow-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Settings,
  Palette,
  Image,
  Save,
  Upload,
  Globe,
  Phone,
  Mail,
  DollarSign,
  Clock,
  MapPin,
  Calendar,
  Sparkles,
  Eye,
  Moon,
  Sun,
  Type,
  RectangleHorizontal,
  Search,
  X,
  FileImage,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================================
// INLINE FALLBACK DATA — Countries, Religions, Timezones
// ============================================================================

interface CountryData {
  name: string;
  code: string;
  continent: string;
}

const COUNTRIES_BY_CONTINENT: Record<string, CountryData[]> = {
  Africa: [
    { name: "Algeria", code: "DZ", continent: "Africa" },
    { name: "Angola", code: "AO", continent: "Africa" },
    { name: "Benin", code: "BJ", continent: "Africa" },
    { name: "Botswana", code: "BW", continent: "Africa" },
    { name: "Burkina Faso", code: "BF", continent: "Africa" },
    { name: "Burundi", code: "BI", continent: "Africa" },
    { name: "Cabo Verde", code: "CV", continent: "Africa" },
    { name: "Cameroon", code: "CM", continent: "Africa" },
    { name: "Central African Republic", code: "CF", continent: "Africa" },
    { name: "Chad", code: "TD", continent: "Africa" },
    { name: "Comoros", code: "KM", continent: "Africa" },
    { name: "Congo (Brazzaville)", code: "CG", continent: "Africa" },
    { name: "Congo (Kinshasa)", code: "CD", continent: "Africa" },
    { name: "Côte d'Ivoire", code: "CI", continent: "Africa" },
    { name: "Djibouti", code: "DJ", continent: "Africa" },
    { name: "Egypt", code: "EG", continent: "Africa" },
    { name: "Equatorial Guinea", code: "GQ", continent: "Africa" },
    { name: "Eritrea", code: "ER", continent: "Africa" },
    { name: "Eswatini", code: "SZ", continent: "Africa" },
    { name: "Ethiopia", code: "ET", continent: "Africa" },
    { name: "Gabon", code: "GA", continent: "Africa" },
    { name: "Gambia", code: "GM", continent: "Africa" },
    { name: "Ghana", code: "GH", continent: "Africa" },
    { name: "Guinea", code: "GN", continent: "Africa" },
    { name: "Guinea-Bissau", code: "GW", continent: "Africa" },
    { name: "Kenya", code: "KE", continent: "Africa" },
    { name: "Lesotho", code: "LS", continent: "Africa" },
    { name: "Liberia", code: "LR", continent: "Africa" },
    { name: "Libya", code: "LY", continent: "Africa" },
    { name: "Madagascar", code: "MG", continent: "Africa" },
    { name: "Malawi", code: "MW", continent: "Africa" },
    { name: "Mali", code: "ML", continent: "Africa" },
    { name: "Mauritania", code: "MR", continent: "Africa" },
    { name: "Mauritius", code: "MU", continent: "Africa" },
    { name: "Morocco", code: "MA", continent: "Africa" },
    { name: "Mozambique", code: "MZ", continent: "Africa" },
    { name: "Namibia", code: "NA", continent: "Africa" },
    { name: "Niger", code: "NE", continent: "Africa" },
    { name: "Nigeria", code: "NG", continent: "Africa" },
    { name: "Rwanda", code: "RW", continent: "Africa" },
    { name: "São Tomé and Príncipe", code: "ST", continent: "Africa" },
    { name: "Senegal", code: "SN", continent: "Africa" },
    { name: "Seychelles", code: "SC", continent: "Africa" },
    { name: "Sierra Leone", code: "SL", continent: "Africa" },
    { name: "Somalia", code: "SO", continent: "Africa" },
    { name: "South Africa", code: "ZA", continent: "Africa" },
    { name: "South Sudan", code: "SS", continent: "Africa" },
    { name: "Sudan", code: "SD", continent: "Africa" },
    { name: "Tanzania", code: "TZ", continent: "Africa" },
    { name: "Togo", code: "TG", continent: "Africa" },
    { name: "Tunisia", code: "TN", continent: "Africa" },
    { name: "Uganda", code: "UG", continent: "Africa" },
    { name: "Zambia", code: "ZM", continent: "Africa" },
    { name: "Zimbabwe", code: "ZW", continent: "Africa" },
  ],
  Asia: [
    { name: "Afghanistan", code: "AF", continent: "Asia" },
    { name: "Armenia", code: "AM", continent: "Asia" },
    { name: "Azerbaijan", code: "AZ", continent: "Asia" },
    { name: "Bahrain", code: "BH", continent: "Asia" },
    { name: "Bangladesh", code: "BD", continent: "Asia" },
    { name: "Bhutan", code: "BT", continent: "Asia" },
    { name: "Brunei", code: "BN", continent: "Asia" },
    { name: "Cambodia", code: "KH", continent: "Asia" },
    { name: "China", code: "CN", continent: "Asia" },
    { name: "Cyprus", code: "CY", continent: "Asia" },
    { name: "Georgia", code: "GE", continent: "Asia" },
    { name: "India", code: "IN", continent: "Asia" },
    { name: "Indonesia", code: "ID", continent: "Asia" },
    { name: "Iran", code: "IR", continent: "Asia" },
    { name: "Iraq", code: "IQ", continent: "Asia" },
    { name: "Israel", code: "IL", continent: "Asia" },
    { name: "Japan", code: "JP", continent: "Asia" },
    { name: "Jordan", code: "JO", continent: "Asia" },
    { name: "Kazakhstan", code: "KZ", continent: "Asia" },
    { name: "Kuwait", code: "KW", continent: "Asia" },
    { name: "Kyrgyzstan", code: "KG", continent: "Asia" },
    { name: "Laos", code: "LA", continent: "Asia" },
    { name: "Lebanon", code: "LB", continent: "Asia" },
    { name: "Malaysia", code: "MY", continent: "Asia" },
    { name: "Maldives", code: "MV", continent: "Asia" },
    { name: "Mongolia", code: "MN", continent: "Asia" },
    { name: "Myanmar", code: "MM", continent: "Asia" },
    { name: "Nepal", code: "NP", continent: "Asia" },
    { name: "North Korea", code: "KP", continent: "Asia" },
    { name: "Oman", code: "OM", continent: "Asia" },
    { name: "Pakistan", code: "PK", continent: "Asia" },
    { name: "Palestine", code: "PS", continent: "Asia" },
    { name: "Philippines", code: "PH", continent: "Asia" },
    { name: "Qatar", code: "QA", continent: "Asia" },
    { name: "Saudi Arabia", code: "SA", continent: "Asia" },
    { name: "Singapore", code: "SG", continent: "Asia" },
    { name: "South Korea", code: "KR", continent: "Asia" },
    { name: "Sri Lanka", code: "LK", continent: "Asia" },
    { name: "Syria", code: "SY", continent: "Asia" },
    { name: "Taiwan", code: "TW", continent: "Asia" },
    { name: "Tajikistan", code: "TJ", continent: "Asia" },
    { name: "Thailand", code: "TH", continent: "Asia" },
    { name: "Timor-Leste", code: "TL", continent: "Asia" },
    { name: "Turkey", code: "TR", continent: "Asia" },
    { name: "Turkmenistan", code: "TM", continent: "Asia" },
    { name: "United Arab Emirates", code: "AE", continent: "Asia" },
    { name: "Uzbekistan", code: "UZ", continent: "Asia" },
    { name: "Vietnam", code: "VN", continent: "Asia" },
    { name: "Yemen", code: "YE", continent: "Asia" },
  ],
  Europe: [
    { name: "Albania", code: "AL", continent: "Europe" },
    { name: "Andorra", code: "AD", continent: "Europe" },
    { name: "Austria", code: "AT", continent: "Europe" },
    { name: "Belarus", code: "BY", continent: "Europe" },
    { name: "Belgium", code: "BE", continent: "Europe" },
    { name: "Bosnia and Herzegovina", code: "BA", continent: "Europe" },
    { name: "Bulgaria", code: "BG", continent: "Europe" },
    { name: "Croatia", code: "HR", continent: "Europe" },
    { name: "Czech Republic", code: "CZ", continent: "Europe" },
    { name: "Denmark", code: "DK", continent: "Europe" },
    { name: "Estonia", code: "EE", continent: "Europe" },
    { name: "Finland", code: "FI", continent: "Europe" },
    { name: "France", code: "FR", continent: "Europe" },
    { name: "Germany", code: "DE", continent: "Europe" },
    { name: "Greece", code: "GR", continent: "Europe" },
    { name: "Hungary", code: "HU", continent: "Europe" },
    { name: "Iceland", code: "IS", continent: "Europe" },
    { name: "Ireland", code: "IE", continent: "Europe" },
    { name: "Italy", code: "IT", continent: "Europe" },
    { name: "Kosovo", code: "XK", continent: "Europe" },
    { name: "Latvia", code: "LV", continent: "Europe" },
    { name: "Liechtenstein", code: "LI", continent: "Europe" },
    { name: "Lithuania", code: "LT", continent: "Europe" },
    { name: "Luxembourg", code: "LU", continent: "Europe" },
    { name: "Malta", code: "MT", continent: "Europe" },
    { name: "Moldova", code: "MD", continent: "Europe" },
    { name: "Monaco", code: "MC", continent: "Europe" },
    { name: "Montenegro", code: "ME", continent: "Europe" },
    { name: "Netherlands", code: "NL", continent: "Europe" },
    { name: "North Macedonia", code: "MK", continent: "Europe" },
    { name: "Norway", code: "NO", continent: "Europe" },
    { name: "Poland", code: "PL", continent: "Europe" },
    { name: "Portugal", code: "PT", continent: "Europe" },
    { name: "Romania", code: "RO", continent: "Europe" },
    { name: "Russia", code: "RU", continent: "Europe" },
    { name: "San Marino", code: "SM", continent: "Europe" },
    { name: "Serbia", code: "RS", continent: "Europe" },
    { name: "Slovakia", code: "SK", continent: "Europe" },
    { name: "Slovenia", code: "SI", continent: "Europe" },
    { name: "Spain", code: "ES", continent: "Europe" },
    { name: "Sweden", code: "SE", continent: "Europe" },
    { name: "Switzerland", code: "CH", continent: "Europe" },
    { name: "Ukraine", code: "UA", continent: "Europe" },
    { name: "United Kingdom", code: "GB", continent: "Europe" },
    { name: "Vatican City", code: "VA", continent: "Europe" },
  ],
  "North America": [
    { name: "Antigua and Barbuda", code: "AG", continent: "North America" },
    { name: "Bahamas", code: "BS", continent: "North America" },
    { name: "Barbados", code: "BB", continent: "North America" },
    { name: "Belize", code: "BZ", continent: "North America" },
    { name: "Canada", code: "CA", continent: "North America" },
    { name: "Costa Rica", code: "CR", continent: "North America" },
    { name: "Cuba", code: "CU", continent: "North America" },
    { name: "Dominica", code: "DM", continent: "North America" },
    { name: "Dominican Republic", code: "DO", continent: "North America" },
    { name: "El Salvador", code: "SV", continent: "North America" },
    { name: "Grenada", code: "GD", continent: "North America" },
    { name: "Guatemala", code: "GT", continent: "North America" },
    { name: "Haiti", code: "HT", continent: "North America" },
    { name: "Honduras", code: "HN", continent: "North America" },
    { name: "Jamaica", code: "JM", continent: "North America" },
    { name: "Mexico", code: "MX", continent: "North America" },
    { name: "Nicaragua", code: "NI", continent: "North America" },
    { name: "Panama", code: "PA", continent: "North America" },
    { name: "Saint Kitts and Nevis", code: "KN", continent: "North America" },
    { name: "Saint Lucia", code: "LC", continent: "North America" },
    { name: "Saint Vincent and the Grenadines", code: "VC", continent: "North America" },
    { name: "Trinidad and Tobago", code: "TT", continent: "North America" },
    { name: "United States", code: "US", continent: "North America" },
  ],
  "South America": [
    { name: "Argentina", code: "AR", continent: "South America" },
    { name: "Bolivia", code: "BO", continent: "South America" },
    { name: "Brazil", code: "BR", continent: "South America" },
    { name: "Chile", code: "CL", continent: "South America" },
    { name: "Colombia", code: "CO", continent: "South America" },
    { name: "Ecuador", code: "EC", continent: "South America" },
    { name: "Guyana", code: "GY", continent: "South America" },
    { name: "Paraguay", code: "PY", continent: "South America" },
    { name: "Peru", code: "PE", continent: "South America" },
    { name: "Suriname", code: "SR", continent: "South America" },
    { name: "Uruguay", code: "UY", continent: "South America" },
    { name: "Venezuela", code: "VE", continent: "South America" },
  ],
  Oceania: [
    { name: "Australia", code: "AU", continent: "Oceania" },
    { name: "Fiji", code: "FJ", continent: "Oceania" },
    { name: "Kiribati", code: "KI", continent: "Oceania" },
    { name: "Marshall Islands", code: "MH", continent: "Oceania" },
    { name: "Micronesia", code: "FM", continent: "Oceania" },
    { name: "Nauru", code: "NR", continent: "Oceania" },
    { name: "New Zealand", code: "NZ", continent: "Oceania" },
    { name: "Palau", code: "PW", continent: "Oceania" },
    { name: "Papua New Guinea", code: "PG", continent: "Oceania" },
    { name: "Samoa", code: "WS", continent: "Oceania" },
    { name: "Solomon Islands", code: "SB", continent: "Oceania" },
    { name: "Tonga", code: "TO", continent: "Oceania" },
    { name: "Tuvalu", code: "TV", continent: "Oceania" },
    { name: "Vanuatu", code: "VU", continent: "Oceania" },
  ],
};

const ALL_COUNTRIES = Object.values(COUNTRIES_BY_CONTINENT).flat();

const RELIGIONS = [
  "Islam",
  "Christianity",
  "Hinduism",
  "Buddhism",
  "Judaism",
  "Sikhism",
  "Jainism",
  "Other",
];

interface TimezoneData {
  label: string;
  value: string;
  region: string;
}

const TIMEZONES: TimezoneData[] = [
  { label: "(UTC-12:00) Baker Island", value: "Etc/GMT+12", region: "Pacific" },
  { label: "(UTC-11:00) American Samoa", value: "Pacific/Pago_Pago", region: "Pacific" },
  { label: "(UTC-11:00) Niue", value: "Pacific/Niue", region: "Pacific" },
  { label: "(UTC-10:00) Hawaii", value: "Pacific/Honolulu", region: "America" },
  { label: "(UTC-10:00) Cook Islands", value: "Pacific/Rarotonga", region: "Pacific" },
  { label: "(UTC-10:00) Tahiti", value: "Pacific/Tahiti", region: "Pacific" },
  { label: "(UTC-09:30) Marquesas Islands", value: "Pacific/Marquesas", region: "Pacific" },
  { label: "(UTC-09:00) Alaska", value: "America/Anchorage", region: "America" },
  { label: "(UTC-09:00) Gambier Islands", value: "Pacific/Gambier", region: "Pacific" },
  { label: "(UTC-08:00) Pacific Time (US & Canada)", value: "America/Los_Angeles", region: "America" },
  { label: "(UTC-08:00) Tijuana", value: "America/Tijuana", region: "America" },
  { label: "(UTC-08:00) Pitcairn Islands", value: "Pacific/Pitcairn", region: "Pacific" },
  { label: "(UTC-07:00) Mountain Time (US & Canada)", value: "America/Denver", region: "America" },
  { label: "(UTC-07:00) Arizona", value: "America/Phoenix", region: "America" },
  { label: "(UTC-07:00) Chihuahua", value: "America/Chihuahua", region: "America" },
  { label: "(UTC-07:00) Mazatlan", value: "America/Mazatlan", region: "America" },
  { label: "(UTC-06:00) Central Time (US & Canada)", value: "America/Chicago", region: "America" },
  { label: "(UTC-06:00) Mexico City", value: "America/Mexico_City", region: "America" },
  { label: "(UTC-06:00) Central America", value: "America/Guatemala", region: "America" },
  { label: "(UTC-06:00) Saskatchewan", value: "America/Regina", region: "America" },
  { label: "(UTC-06:00) Easter Island", value: "Pacific/Easter", region: "Pacific" },
  { label: "(UTC-05:00) Eastern Time (US & Canada)", value: "America/New_York", region: "America" },
  { label: "(UTC-05:00) Bogota", value: "America/Bogota", region: "America" },
  { label: "(UTC-05:00) Lima", value: "America/Lima", region: "America" },
  { label: "(UTC-05:00) Quito", value: "America/Lima", region: "America" },
  { label: "(UTC-05:00) Havana", value: "America/Havana", region: "America" },
  { label: "(UTC-04:00) Atlantic Time (Canada)", value: "America/Halifax", region: "America" },
  { label: "(UTC-04:00) Caracas", value: "America/Caracas", region: "America" },
  { label: "(UTC-04:00) La Paz", value: "America/La_Paz", region: "America" },
  { label: "(UTC-04:00) Santiago", value: "America/Santiago", region: "America" },
  { label: "(UTC-04:00) Manaus", value: "America/Manaus", region: "America" },
  { label: "(UTC-04:00) Cuiaba", value: "America/Cuiaba", region: "America" },
  { label: "(UTC-04:00) Asuncion", value: "America/Asuncion", region: "America" },
  { label: "(UTC-04:00) Puerto Rico", value: "America/Puerto_Rico", region: "America" },
  { label: "(UTC-04:00) Georgetown", value: "America/Guyana", region: "America" },
  { label: "(UTC-03:30) Newfoundland", value: "America/St_Johns", region: "America" },
  { label: "(UTC-03:00) Buenos Aires", value: "America/Argentina/Buenos_Aires", region: "America" },
  { label: "(UTC-03:00) Sao Paulo", value: "America/Sao_Paulo", region: "America" },
  { label: "(UTC-03:00) Montevideo", value: "America/Montevideo", region: "America" },
  { label: "(UTC-03:00) Greenland", value: "America/Godthab", region: "America" },
  { label: "(UTC-03:00) Cayenne", value: "America/Cayenne", region: "America" },
  { label: "(UTC-02:00) Mid-Atlantic", value: "America/Noronha", region: "America" },
  { label: "(UTC-01:00) Azores", value: "Atlantic/Azores", region: "Atlantic" },
  { label: "(UTC-01:00) Cape Verde", value: "Atlantic/Cape_Verde", region: "Atlantic" },
  { label: "(UTC+00:00) London", value: "Europe/London", region: "Europe" },
  { label: "(UTC+00:00) Lisbon", value: "Europe/Lisbon", region: "Europe" },
  { label: "(UTC+00:00) Dublin", value: "Europe/Dublin", region: "Europe" },
  { label: "(UTC+00:00) Monrovia", value: "Africa/Monrovia", region: "Africa" },
  { label: "(UTC+00:00) Reykjavik", value: "Atlantic/Reykjavik", region: "Atlantic" },
  { label: "(UTC+00:00) Accra", value: "Africa/Accra", region: "Africa" },
  { label: "(UTC+01:00) Paris", value: "Europe/Paris", region: "Europe" },
  { label: "(UTC+01:00) Berlin", value: "Europe/Berlin", region: "Europe" },
  { label: "(UTC+01:00) Rome", value: "Europe/Rome", region: "Europe" },
  { label: "(UTC+01:00) Madrid", value: "Europe/Madrid", region: "Europe" },
  { label: "(UTC+01:00) Amsterdam", value: "Europe/Amsterdam", region: "Europe" },
  { label: "(UTC+01:00) Brussels", value: "Europe/Brussels", region: "Europe" },
  { label: "(UTC+01:00) Vienna", value: "Europe/Vienna", region: "Europe" },
  { label: "(UTC+01:00) Stockholm", value: "Europe/Stockholm", region: "Europe" },
  { label: "(UTC+01:00) Oslo", value: "Europe/Oslo", region: "Europe" },
  { label: "(UTC+01:00) Copenhagen", value: "Europe/Copenhagen", region: "Europe" },
  { label: "(UTC+01:00) Warsaw", value: "Europe/Warsaw", region: "Europe" },
  { label: "(UTC+01:00) Prague", value: "Europe/Prague", region: "Europe" },
  { label: "(UTC+01:00) Budapest", value: "Europe/Budapest", region: "Europe" },
  { label: "(UTC+01:00) Belgrade", value: "Europe/Belgrade", region: "Europe" },
  { label: "(UTC+01:00) Zurich", value: "Europe/Zurich", region: "Europe" },
  { label: "(UTC+01:00) Algiers", value: "Africa/Algiers", region: "Africa" },
  { label: "(UTC+01:00) Casablanca", value: "Africa/Casablanca", region: "Africa" },
  { label: "(UTC+01:00) Lagos", value: "Africa/Lagos", region: "Africa" },
  { label: "(UTC+01:00) Tunis", value: "Africa/Tunis", region: "Africa" },
  { label: "(UTC+01:00) West Central Africa", value: "Africa/Lagos", region: "Africa" },
  { label: "(UTC+02:00) Athens", value: "Europe/Athens", region: "Europe" },
  { label: "(UTC+02:00) Bucharest", value: "Europe/Bucharest", region: "Europe" },
  { label: "(UTC+02:00) Helsinki", value: "Europe/Helsinki", region: "Europe" },
  { label: "(UTC+02:00) Kyiv", value: "Europe/Kyiv", region: "Europe" },
  { label: "(UTC+02:00) Cairo", value: "Africa/Cairo", region: "Africa" },
  { label: "(UTC+02:00) Johannesburg", value: "Africa/Johannesburg", region: "Africa" },
  { label: "(UTC+02:00) Khartoum", value: "Africa/Khartoum", region: "Africa" },
  { label: "(UTC+02:00) Istanbul", value: "Europe/Istanbul", region: "Europe" },
  { label: "(UTC+02:00) Jerusalem", value: "Asia/Jerusalem", region: "Asia" },
  { label: "(UTC+02:00) Amman", value: "Asia/Amman", region: "Asia" },
  { label: "(UTC+02:00) Beirut", value: "Asia/Beirut", region: "Asia" },
  { label: "(UTC+02:00) Damascus", value: "Asia/Damascus", region: "Asia" },
  { label: "(UTC+03:00) Moscow", value: "Europe/Moscow", region: "Europe" },
  { label: "(UTC+03:00) Riyadh", value: "Asia/Riyadh", region: "Asia" },
  { label: "(UTC+03:00) Dubai", value: "Asia/Dubai", region: "Asia" },
  { label: "(UTC+03:00) Abu Dhabi", value: "Asia/Dubai", region: "Asia" },
  { label: "(UTC+03:00) Doha", value: "Asia/Qatar", region: "Asia" },
  { label: "(UTC+03:00) Kuwait", value: "Asia/Kuwait", region: "Asia" },
  { label: "(UTC+03:00) Manama", value: "Asia/Bahrain", region: "Asia" },
  { label: "(UTC+03:00) Baghdad", value: "Asia/Baghdad", region: "Asia" },
  { label: "(UTC+03:00) Nairobi", value: "Africa/Nairobi", region: "Africa" },
  { label: "(UTC+03:00) Addis Ababa", value: "Africa/Addis_Ababa", region: "Africa" },
  { label: "(UTC+03:00) Tehran", value: "Asia/Tehran", region: "Asia" },
  { label: "(UTC+03:30) Tehran", value: "Asia/Tehran", region: "Asia" },
  { label: "(UTC+04:00) Baku", value: "Asia/Baku", region: "Asia" },
  { label: "(UTC+04:00) Tbilisi", value: "Asia/Tbilisi", region: "Asia" },
  { label: "(UTC+04:00) Yerevan", value: "Asia/Yerevan", region: "Asia" },
  { label: "(UTC+04:00) Muscat", value: "Asia/Muscat", region: "Asia" },
  { label: "(UTC+04:00) Tashkent", value: "Asia/Tashkent", region: "Asia" },
  { label: "(UTC+04:30) Kabul", value: "Asia/Kabul", region: "Asia" },
  { label: "(UTC+05:00) Karachi", value: "Asia/Karachi", region: "Asia" },
  { label: "(UTC+05:00) Tashkent", value: "Asia/Tashkent", region: "Asia" },
  { label: "(UTC+05:00) Male", value: "Indian/Maldives", region: "Asia" },
  { label: "(UTC+05:30) Chennai", value: "Asia/Kolkata", region: "Asia" },
  { label: "(UTC+05:30) Mumbai", value: "Asia/Kolkata", region: "Asia" },
  { label: "(UTC+05:30) New Delhi", value: "Asia/Kolkata", region: "Asia" },
  { label: "(UTC+05:30) Colombo", value: "Asia/Colombo", region: "Asia" },
  { label: "(UTC+05:45) Kathmandu", value: "Asia/Kathmandu", region: "Asia" },
  { label: "(UTC+06:00) Dhaka", value: "Asia/Dhaka", region: "Asia" },
  { label: "(UTC+06:00) Almaty", value: "Asia/Almaty", region: "Asia" },
  { label: "(UTC+06:00) Omsk", value: "Asia/Omsk", region: "Asia" },
  { label: "(UTC+06:30) Yangon", value: "Asia/Yangon", region: "Asia" },
  { label: "(UTC+07:00) Bangkok", value: "Asia/Bangkok", region: "Asia" },
  { label: "(UTC+07:00) Hanoi", value: "Asia/Ho_Chi_Minh", region: "Asia" },
  { label: "(UTC+07:00) Jakarta", value: "Asia/Jakarta", region: "Asia" },
  { label: "(UTC+07:00) Krasnoyarsk", value: "Asia/Krasnoyarsk", region: "Asia" },
  { label: "(UTC+07:00) Phnom Penh", value: "Asia/Phnom_Penh", region: "Asia" },
  { label: "(UTC+08:00) Shanghai", value: "Asia/Shanghai", region: "Asia" },
  { label: "(UTC+08:00) Hong Kong", value: "Asia/Hong_Kong", region: "Asia" },
  { label: "(UTC+08:00) Singapore", value: "Asia/Singapore", region: "Asia" },
  { label: "(UTC+08:00) Kuala Lumpur", value: "Asia/Kuala_Lumpur", region: "Asia" },
  { label: "(UTC+08:00) Taipei", value: "Asia/Taipei", region: "Asia" },
  { label: "(UTC+08:00) Perth", value: "Australia/Perth", region: "Australia" },
  { label: "(UTC+08:00) Manila", value: "Asia/Manila", region: "Asia" },
  { label: "(UTC+08:00) Irkutsk", value: "Asia/Irkutsk", region: "Asia" },
  { label: "(UTC+08:00) Makassar", value: "Asia/Makassar", region: "Asia" },
  { label: "(UTC+09:00) Tokyo", value: "Asia/Tokyo", region: "Asia" },
  { label: "(UTC+09:00) Seoul", value: "Asia/Seoul", region: "Asia" },
  { label: "(UTC+09:00) Pyongyang", value: "Asia/Pyongyang", region: "Asia" },
  { label: "(UTC+09:00) Yakutsk", value: "Asia/Yakutsk", region: "Asia" },
  { label: "(UTC+09:30) Adelaide", value: "Australia/Adelaide", region: "Australia" },
  { label: "(UTC+09:30) Darwin", value: "Australia/Darwin", region: "Australia" },
  { label: "(UTC+10:00) Sydney", value: "Australia/Sydney", region: "Australia" },
  { label: "(UTC+10:00) Melbourne", value: "Australia/Melbourne", region: "Australia" },
  { label: "(UTC+10:00) Brisbane", value: "Australia/Brisbane", region: "Australia" },
  { label: "(UTC+10:00) Guam", value: "Pacific/Guam", region: "Pacific" },
  { label: "(UTC+10:00) Vladivostok", value: "Asia/Vladivostok", region: "Asia" },
  { label: "(UTC+10:30) Lord Howe Island", value: "Australia/Lord_Howe", region: "Australia" },
  { label: "(UTC+11:00) Solomon Islands", value: "Pacific/Guadalcanal", region: "Pacific" },
  { label: "(UTC+11:00) Noumea", value: "Pacific/Noumea", region: "Pacific" },
  { label: "(UTC+11:00) Magadan", value: "Asia/Magadan", region: "Asia" },
  { label: "(UTC+12:00) Auckland", value: "Pacific/Auckland", region: "Pacific" },
  { label: "(UTC+12:00) Wellington", value: "Pacific/Auckland", region: "Pacific" },
  { label: "(UTC+12:00) Fiji", value: "Pacific/Fiji", region: "Pacific" },
  { label: "(UTC+12:00) Marshall Islands", value: "Pacific/Majuro", region: "Pacific" },
  { label: "(UTC+12:00) Petropavlovsk-Kamchatsky", value: "Asia/Kamchatka", region: "Asia" },
  { label: "(UTC+12:45) Chatham Islands", value: "Pacific/Chatham", region: "Pacific" },
  { label: "(UTC+13:00) Nuku'alofa", value: "Pacific/Tongatapu", region: "Pacific" },
  { label: "(UTC+13:00) Samoa", value: "Pacific/Apia", region: "Pacific" },
  { label: "(UTC+14:00) Kiritimati Island", value: "Pacific/Kiritimati", region: "Pacific" },
];

// Group timezones by region
const TIMEZONES_BY_REGION: Record<string, TimezoneData[]> = {};
for (const tz of TIMEZONES) {
  if (!TIMEZONES_BY_REGION[tz.region]) {
    TIMEZONES_BY_REGION[tz.region] = [];
  }
  TIMEZONES_BY_REGION[tz.region].push(tz);
}

// ============================================================================
// Sample Events for Event Theming Tab
// ============================================================================

const SAMPLE_ACTIVE_EVENTS = [
  { id: 1, name: "Eid al-Fitr", type: "Islamic", color: "#059669", icon: "🌙", status: "active" },
  { id: 2, name: "Diwali Festival of Lights", type: "Hindu", color: "#D97706", icon: "🪔", status: "active" },
];

const SAMPLE_UPCOMING_EVENTS = [
  { id: 3, name: "Eid al-Adha", type: "Islamic", color: "#059669", icon: "🐑", date: "Jul 07, 2025", daysAway: 42 },
  { id: 4, name: "Christmas", type: "Christian", color: "#DC2626", icon: "🎄", date: "Dec 25, 2025", daysAway: 203 },
  { id: 5, name: "Holi", type: "Hindu", color: "#E11D48", icon: "🎨", date: "Mar 14, 2026", daysAway: 282 },
  { id: 6, name: "Vesak", type: "Buddhist", color: "#7C3AED", icon: "🪷", date: "May 12, 2025", daysAway: 15 },
  { id: 7, name: "Hanukkah", type: "Judaism", color: "#2563EB", icon: "🕎", date: "Dec 15, 2025", daysAway: 193 },
  { id: 8, name: "Navratri", type: "Hindu", color: "#DB2777", icon: "🙏", date: "Sep 29, 2025", daysAway: 145 },
  { id: 9, name: "Chinese New Year", type: "Cultural", color: "#DC2626", icon: "🐉", date: "Feb 17, 2026", daysAway: 258 },
];

// ============================================================================
// Preset Colors
// ============================================================================

const presetColors = [
  { name: "Emerald", value: "#059669" },
  { name: "Blue", value: "#2563eb" },
  { name: "Purple", value: "#7c3aed" },
  { name: "Rose", value: "#e11d48" },
  { name: "Amber", value: "#d97706" },
  { name: "Cyan", value: "#0891b2" },
  { name: "Slate", value: "#475569" },
  { name: "Pink", value: "#db2777" },
  { name: "Orange", value: "#ea580c" },
  { name: "Teal", value: "#0d9488" },
  { name: "Indigo", value: "#4f46e5" },
  { name: "Lime", value: "#65a30d" },
];

// ============================================================================
// Sub-tabs
// ============================================================================

const subTabs = [
  { id: "general", label: "General", icon: Settings },
  { id: "theme", label: "Theme & Colors", icon: Palette },
  { id: "branding", label: "Logo & Branding", icon: Image },
  { id: "events", label: "Event Theming", icon: Calendar },
];

// ============================================================================
// Animation Variants
// ============================================================================

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

// ============================================================================
// Main Component
// ============================================================================

export function SettingsPage() {
  const {
    brandColor, setBrandColor, brandGradient, setBrandGradient, organization,
    setBrandName, setBrandLogo, setSelectedCountry, setSelectedReligion, setOrganization,
    appTheme, setAppTheme, brandName, setBrandTagline, setBrandConfigured,
  } = useBrandOnyxStore();
  const [activeTab, setActiveTab] = useState("general");

  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";

  // ── Loading State ───────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dbLoaded, setDbLoaded] = useState(false);

  // ── General State ────────────────────────────────────────────────────────
  const [businessInfo, setBusinessInfo] = useState({
    name: brandName || organization?.name || "",
    email: organization?.email || "",
    phone: organization?.phone || "",
    website: organization?.website || "",
    country: organization?.country || "",
    religion: organization?.religion || "",
    timezone: organization?.timezone || "",
    currency: organization?.currency || "USD",
    address: "",
    taxId: "",
    slogan: "",
    description: "",
  });

  // ── Theme State ──────────────────────────────────────────────────────────
  const [customColor, setCustomColor] = useState(brandColor);
  const [secondaryColor, setSecondaryColor] = useState("#D97706");
  const [darkMode, setDarkMode] = useState(appTheme !== "light");
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");
  const [borderRadius, setBorderRadius] = useState<"rounded" | "sharp" | "pill">("rounded");

  // ── Branding State ───────────────────────────────────────────────────────
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [brandSlogan, setBrandSlogan] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [logoDragOver, setLogoDragOver] = useState(false);
  const [faviconDragOver, setFaviconDragOver] = useState(false);
  // Track if logo/favicon were changed (need upload) vs loaded from DB (already base64)
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);

  // ── Event Theming State ──────────────────────────────────────────────────
  const [dynamicTheming, setDynamicTheming] = useState(true);
  const [floatingIcons, setFloatingIcons] = useState(true);
  const [autoCampaigns, setAutoCampaigns] = useState(false);

  // ── Country Search ───────────────────────────────────────────────────────
  const [countrySearch, setCountrySearch] = useState("");
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);

  // ── Timezone Search ──────────────────────────────────────────────────────
  const [timezoneSearch, setTimezoneSearch] = useState("");
  const [timezoneDropdownOpen, setTimezoneDropdownOpen] = useState(false);

  // ── Helper: Get country name from code ───────────────────────────────────
  const getCountryName = useCallback((code: string) => {
    return ALL_COUNTRIES.find((c) => c.code === code)?.name || code;
  }, []);

  // ── Helper: Get timezone label from value ────────────────────────────────
  const getTimezoneLabel = useCallback((value: string) => {
    return TIMEZONES.find((tz) => tz.value === value)?.label || value;
  }, []);

  // ── Load settings from database on mount ────────────────────────────────
  useEffect(() => {
    const orgId = organization?.id;
    if (!orgId || dbLoaded) return;

    const loadSettings = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/settings?orgId=${orgId}`);
        if (!res.ok) {
          console.warn("Failed to load settings from DB:", res.status);
          return;
        }
        const data = await res.json();

        // Populate businessInfo from DB
        setBusinessInfo(prev => ({
          ...prev,
          name: data.name || prev.name,
          email: data.email || prev.email,
          phone: data.phone || prev.phone,
          website: data.website || prev.website,
          country: data.country || prev.country,
          religion: data.religion || prev.religion,
          timezone: data.timezone || prev.timezone,
          currency: data.currency || prev.currency,
          address: data.address || "",
          taxId: data.taxId || "",
          slogan: data.brandTagline || "",
          description: data.brandDescription || "",
        }));

        // Set branding from DB
        if (data.brandTagline) setBrandSlogan(data.brandTagline);
        if (data.brandDescription) setBrandDescription(data.brandDescription);
        if (data.logo) {
          setLogoPreview(data.logo); // Already base64 data URL from DB
          setBrandLogo(data.logo);
        }
        if (data.favicon) setFaviconPreview(data.favicon);
        if (data.brandColor) {
          setCustomColor(data.brandColor);
          setBrandColor(data.brandColor);
        }
        if (data.secondaryBrandColor) setSecondaryColor(data.secondaryBrandColor);
        if (data.country) setSelectedCountry(data.country);
        if (data.religion) setSelectedReligion(data.religion);
        if (data.name) setBrandName(data.name);
        if (data.brandTagline) setBrandTagline(data.brandTagline);

        // Update organization in store
        setOrganization({
          id: data.id,
          name: data.name,
          slug: data.slug,
          logo: data.logo,
          website: data.website,
          phone: data.phone,
          email: data.email,
          currency: data.currency,
          timezone: data.timezone,
          plan: data.plan,
          country: data.country,
          religion: data.religion,
          brandLogo: data.logo,
        });

        setDbLoaded(true);
      } catch (err) {
        console.warn("Settings load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [organization?.id, dbLoaded]);

  // ── Helper: Upload file to base64 via API ───────────────────────────────
  const uploadFileToBase64 = useCallback(async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        toast.error("Failed to upload file");
        return null;
      }
      const data = await res.json();
      return data.dataUrl; // base64 data URL
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Upload failed");
      return null;
    }
  }, []);

  // ── File Upload Handlers ─────────────────────────────────────────────────
  const handleFileSelect = useCallback(
    (file: File, type: "logo" | "favicon") => {
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File size must be less than 2MB");
        return;
      }
      if (!["image/png", "image/jpeg", "image/svg+xml", "image/webp"].includes(file.type)) {
        toast.error("Please upload SVG, PNG, JPG, or WebP files");
        return;
      }
      // Create preview URL for display (temporary)
      const previewUrl = URL.createObjectURL(file);
      if (type === "logo") {
        setLogoPreview(previewUrl);
        setLogoFile(file); // Store file for upload on save
        toast.success("Logo selected! Click Save to apply.");
      } else {
        setFaviconPreview(previewUrl);
        setFaviconFile(file); // Store file for upload on save
        toast.success("Favicon selected! Click Save to apply.");
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, type: "logo" | "favicon") => {
      e.preventDefault();
      if (type === "logo") setLogoDragOver(false);
      else setFaviconDragOver(false);
      const file = e.dataTransfer.files[0];
      handleFileSelect(file, type);
    },
    [handleFileSelect]
  );

  // ── Gradient Builder ─────────────────────────────────────────────────────
  const gradientString = `linear-gradient(135deg, ${customColor} 0%, ${secondaryColor} 100%)`;

  const updateGradient = useCallback(() => {
    const newGradient = `linear-gradient(135deg, ${customColor} 0%, ${secondaryColor} 100%)`;
    setBrandGradient(newGradient);
    setBrandColor(customColor);
  }, [customColor, secondaryColor, setBrandGradient, setBrandColor]);

  // ── Border Radius Helper ─────────────────────────────────────────────────
  const getRadiusClass = () => {
    switch (borderRadius) {
      case "sharp":
        return "rounded-none";
      case "pill":
        return "rounded-full";
      default:
        return "rounded-xl";
    }
  };

  const getRadiusValue = () => {
    switch (borderRadius) {
      case "sharp":
        return "0px";
      case "pill":
        return "9999px";
      default:
        return "12px";
    }
  };

  const getFontSizeValue = () => {
    switch (fontSize) {
      case "small":
        return "13px";
      case "large":
        return "17px";
      default:
        return "15px";
    }
  };

  // ── Save Handlers ────────────────────────────────────────────────────────
  const saveGeneral = async () => {
    const orgId = organization?.id;
    if (!orgId) {
      toast.error("No organization found. Please log in again.");
      return;
    }

    setSaving(true);
    try {
      // Upload logo if a new file was selected
      let logoDataUrl = organization?.logo || null;
      if (logoFile) {
        const uploaded = await uploadFileToBase64(logoFile);
        if (uploaded) {
          logoDataUrl = uploaded;
          setLogoPreview(uploaded);
          setBrandLogo(uploaded);
          setLogoFile(null); // Clear pending file
        }
      }

      // Upload favicon if a new file was selected
      let faviconDataUrl: string | null | undefined = undefined; // undefined = don't update
      if (faviconFile) {
        const uploaded = await uploadFileToBase64(faviconFile);
        if (uploaded) {
          faviconDataUrl = uploaded;
          setFaviconPreview(uploaded);
          setFaviconFile(null);
        } else {
          faviconDataUrl = undefined; // upload failed, don't wipe
        }
      }

      // Save to database
      const payload: Record<string, any> = {
        id: orgId,
        name: businessInfo.name,
        email: businessInfo.email,
        phone: businessInfo.phone,
        website: businessInfo.website,
        country: businessInfo.country,
        religion: businessInfo.religion,
        timezone: businessInfo.timezone,
        currency: businessInfo.currency,
        address: businessInfo.address,
        taxId: businessInfo.taxId,
        brandTagline: brandSlogan || businessInfo.slogan,
        brandDescription: brandDescription || businessInfo.description,
        logo: logoDataUrl,
        brandColor: customColor,
        secondaryBrandColor: secondaryColor,
      };
      if (faviconDataUrl !== undefined) payload.favicon = faviconDataUrl;

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Failed to save settings to database");
        return;
      }

      // Also update local Zustand store
      setBrandName(businessInfo.name);
      if (brandSlogan) setBrandTagline(brandSlogan);
      if (logoDataUrl) setBrandLogo(logoDataUrl);
      setSelectedCountry(businessInfo.country);
      setSelectedReligion(businessInfo.religion);
      setOrganization({
        id: orgId,
        name: businessInfo.name,
        slug: businessInfo.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "my-brand",
        logo: logoDataUrl || organization?.logo,
        website: businessInfo.website,
        phone: businessInfo.phone,
        email: businessInfo.email,
        currency: businessInfo.currency,
        timezone: businessInfo.timezone,
        plan: organization?.plan || "free",
        country: businessInfo.country,
        religion: businessInfo.religion,
        brandLogo: logoDataUrl || organization?.brandLogo,
      });
      setBrandConfigured(true);
      toast.success("General settings saved!");
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const saveThemeSettings = async () => {
    const orgId = organization?.id;
    if (!orgId) {
      toast.error("No organization found.");
      return;
    }

    setSaving(true);
    try {
      // Save theme colors to DB
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: orgId,
          brandColor: customColor,
          secondaryBrandColor: secondaryColor,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Failed to save theme settings to database");
        return;
      }

      if (darkMode) {
        setAppTheme(appTheme === "premium-dark" ? "premium-dark" : "dark");
      } else {
        setAppTheme("light");
      }
      toast.success("Theme settings saved!");
    } catch (err) {
      console.error("Save theme error:", err);
      toast.error("Failed to save theme");
    } finally {
      setSaving(false);
    }
  };

  const saveBranding = async () => {
    const orgId = organization?.id;
    if (!orgId) {
      toast.error("No organization found.");
      return;
    }

    setSaving(true);
    try {
      // Upload logo if a new file was selected
      let logoDataUrl = organization?.logo || null;
      if (logoFile) {
        const uploaded = await uploadFileToBase64(logoFile);
        if (uploaded) {
          logoDataUrl = uploaded;
          setLogoPreview(uploaded);
          setLogoFile(null);
        }
      }

      // Upload favicon if a new file was selected
      let faviconDataUrl: string | null | undefined = undefined;
      if (faviconFile) {
        const uploaded = await uploadFileToBase64(faviconFile);
        if (uploaded) {
          faviconDataUrl = uploaded;
          setFaviconPreview(uploaded);
          setFaviconFile(null);
        } else {
          faviconDataUrl = undefined; // upload failed, don't wipe
        }
      }

      // Save to database
      const brandingPayload: Record<string, any> = {
        id: orgId,
        logo: logoDataUrl,
        brandTagline: brandSlogan,
        brandDescription: brandDescription,
        brandColor: customColor,
        secondaryBrandColor: secondaryColor,
      };
      if (faviconDataUrl !== undefined) brandingPayload.favicon = faviconDataUrl;

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brandingPayload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Failed to save branding to database");
        return;
      }

      if (logoDataUrl) setBrandLogo(logoDataUrl);
      if (brandSlogan) setBrandTagline(brandSlogan);
      setBrandConfigured(true);
      toast.success("Branding settings saved! Your brand identity is now active across the portal.");
    } catch (err) {
      console.error("Save branding error:", err);
      toast.error("Failed to save branding");
    } finally {
      setSaving(false);
    }
  };

  // ── Filtered Countries ───────────────────────────────────────────────────
  const filteredCountries = countrySearch
    ? ALL_COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase())
      )
    : ALL_COUNTRIES;

  const filteredCountriesByContinent: Record<string, CountryData[]> = {};
  for (const c of filteredCountries) {
    if (!filteredCountriesByContinent[c.continent]) {
      filteredCountriesByContinent[c.continent] = [];
    }
    filteredCountriesByContinent[c.continent].push(c);
  }

  // ── Filtered Timezones ───────────────────────────────────────────────────
  const filteredTimezones = timezoneSearch
    ? TIMEZONES.filter(
        (tz) =>
          tz.label.toLowerCase().includes(timezoneSearch.toLowerCase()) ||
          tz.value.toLowerCase().includes(timezoneSearch.toLowerCase())
      )
    : TIMEZONES;

  const filteredTimezonesByRegion: Record<string, TimezoneData[]> = {};
  for (const tz of filteredTimezones) {
    if (!filteredTimezonesByRegion[tz.region]) {
      filteredTimezonesByRegion[tz.region] = [];
    }
    filteredTimezonesByRegion[tz.region].push(tz);
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>Brand Settings</h1>
        <p className={cn("text-sm mt-1", isDark ? "text-slate-400" : "text-slate-500")}>
          Customize your brand experience and portal appearance
        </p>
      </div>

      {/* Sub-tabs */}
      <div className={cn("flex gap-1 border-b overflow-x-auto", isDark ? "border-white/[0.06]" : "border-slate-200")}>
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? isGold
                  ? "border-amber-400 text-amber-400"
                  : isDark
                    ? "border-emerald-400 text-emerald-400"
                    : "border-emerald-600 text-emerald-600"
                : isDark
                  ? "border-transparent text-slate-500 hover:text-slate-300"
                  : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ================================================================ */}
        {/* TAB 1: GENERAL                                                  */}
        {/* ================================================================ */}
        {activeTab === "general" && (
          <motion.div
            key="general"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            <Card className={cn("max-w-3xl", isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200")}>
              <CardHeader>
                <CardTitle className={cn("text-base", isDark ? "text-white" : "")}>Business Information</CardTitle>
                <CardDescription className={isDark ? "text-slate-400" : ""}>
                  Basic details about your business. These will appear on invoices and communications.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Row 1: Name, Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className={cn("mb-1.5 block text-sm font-medium", isDark ? "text-slate-300" : "")}>
                      Business Name
                    </Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={businessInfo.name}
                        onChange={(e) =>
                          setBusinessInfo({ ...businessInfo, name: e.target.value })
                        }
                        className="pl-9"
                        placeholder="Your business name"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className={cn("mb-1.5 block text-sm font-medium", isDark ? "text-slate-300" : "")}>Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        value={businessInfo.email}
                        onChange={(e) =>
                          setBusinessInfo({ ...businessInfo, email: e.target.value })
                        }
                        className="pl-9"
                        placeholder="hello@company.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2: Phone, Website */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className={cn("mb-1.5 block text-sm font-medium", isDark ? "text-slate-300" : "")}>Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={businessInfo.phone}
                        onChange={(e) =>
                          setBusinessInfo({ ...businessInfo, phone: e.target.value })
                        }
                        className="pl-9"
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className={cn("mb-1.5 block text-sm font-medium", isDark ? "text-slate-300" : "")}>Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={businessInfo.website}
                        onChange={(e) =>
                          setBusinessInfo({ ...businessInfo, website: e.target.value })
                        }
                        className="pl-9"
                        placeholder="www.example.com"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Row 3: Country Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <Label className={cn("mb-1.5 block text-sm font-medium", isDark ? "text-slate-300" : "")}>
                      Country
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <button
                        type="button"
                        onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                        className="w-full flex items-center justify-between border rounded-md bg-transparent px-3 py-2 pl-9 text-sm h-9 shadow-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span>{getCountryName(businessInfo.country)}</span>
                        <svg
                          className={`h-4 w-4 opacity-50 transition-transform ${countryDropdownOpen ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Country Dropdown */}
                      {countryDropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-80 overflow-hidden">
                          {/* Search Input */}
                          <div className="p-2 border-b">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                              <input
                                type="text"
                                value={countrySearch}
                                onChange={(e) => setCountrySearch(e.target.value)}
                                placeholder="Search countries..."
                                className="w-full h-8 pl-8 pr-3 text-sm border rounded-md bg-transparent outline-none focus:ring-2 focus:ring-ring"
                                autoFocus
                              />
                            </div>
                          </div>
                          {/* Scrollable List */}
                          <ScrollArea className="h-60">
                            {Object.entries(filteredCountriesByContinent).map(
                              ([continent, countries]) => (
                                <div key={continent}>
                                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                                    {continent}
                                  </div>
                                  {countries.map((c) => (
                                    <button
                                      key={c.code}
                                      onClick={() => {
                                        setBusinessInfo({ ...businessInfo, country: c.code });
                                        setCountryDropdownOpen(false);
                                        setCountrySearch("");
                                      }}
                                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors flex items-center justify-between ${
                                        businessInfo.country === c.code
                                          ? "bg-accent text-accent-foreground"
                                          : ""
                                      }`}
                                    >
                                      <span>{c.name}</span>
                                      {businessInfo.country === c.code && (
                                        <Check className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )
                            )}
                            {filteredCountries.length === 0 && (
                              <div className="px-3 py-4 text-sm text-center text-muted-foreground">
                                No countries found
                              </div>
                            )}
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Religion Selector */}
                  <div>
                    <Label className={cn("mb-1.5 block text-sm font-medium", isDark ? "text-slate-300" : "")}>
                      Religion
                    </Label>
                    <Select
                      value={businessInfo.religion}
                      onValueChange={(val) =>
                        setBusinessInfo({ ...businessInfo, religion: val })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select religion" />
                      </SelectTrigger>
                      <SelectContent>
                        {RELIGIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 4: Timezone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <Label className={cn("mb-1.5 block text-sm font-medium", isDark ? "text-slate-300" : "")}>
                      Timezone
                    </Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <button
                        type="button"
                        onClick={() => setTimezoneDropdownOpen(!timezoneDropdownOpen)}
                        className="w-full flex items-center justify-between border rounded-md bg-transparent px-3 py-2 pl-9 text-sm h-9 shadow-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="truncate">
                          {getTimezoneLabel(businessInfo.timezone)}
                        </span>
                        <svg
                          className={`h-4 w-4 opacity-50 transition-transform shrink-0 ml-2 ${timezoneDropdownOpen ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Timezone Dropdown */}
                      {timezoneDropdownOpen && (
                        <div className="absolute z-50 mt-1 w-80 bg-popover border rounded-md shadow-lg max-h-80 overflow-hidden">
                          <div className="p-2 border-b">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                              <input
                                type="text"
                                value={timezoneSearch}
                                onChange={(e) => setTimezoneSearch(e.target.value)}
                                placeholder="Search timezones..."
                                className="w-full h-8 pl-8 pr-3 text-sm border rounded-md bg-transparent outline-none focus:ring-2 focus:ring-ring"
                                autoFocus
                              />
                            </div>
                          </div>
                          <ScrollArea className="h-60">
                            {Object.entries(filteredTimezonesByRegion).map(
                              ([region, tzones]) => (
                                <div key={region}>
                                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                                    {region}
                                  </div>
                                  {tzones.map((tz) => (
                                    <button
                                      key={tz.value + tz.label}
                                      onClick={() => {
                                        setBusinessInfo({ ...businessInfo, timezone: tz.value });
                                        setTimezoneDropdownOpen(false);
                                        setTimezoneSearch("");
                                      }}
                                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors flex items-center justify-between ${
                                        businessInfo.timezone === tz.value
                                          ? "bg-accent text-accent-foreground"
                                          : ""
                                      }`}
                                    >
                                      <span className="truncate">{tz.label}</span>
                                      {businessInfo.timezone === tz.value && (
                                        <Check className="h-3.5 w-3.5 shrink-0" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )
                            )}
                            {filteredTimezones.length === 0 && (
                              <div className="px-3 py-4 text-sm text-center text-muted-foreground">
                                No timezones found
                              </div>
                            )}
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Currency */}
                  <div>
                    <Label className={cn("mb-1.5 block text-sm font-medium", isDark ? "text-slate-300" : "")}>Currency</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={businessInfo.currency}
                        onChange={(e) =>
                          setBusinessInfo({ ...businessInfo, currency: e.target.value })
                        }
                        className="pl-9"
                        placeholder="AED"
                      />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <Label className={cn("mb-1.5 block text-sm font-medium", isDark ? "text-slate-300" : "")}>Address</Label>
                  <Textarea
                    value={businessInfo.address}
                    onChange={(e) =>
                      setBusinessInfo({ ...businessInfo, address: e.target.value })
                    }
                    placeholder="Full business address"
                    rows={3}
                  />
                </div>

                {/* Tax ID */}
                <div className="max-w-sm">
                  <Label className={cn("mb-1.5 block text-sm font-medium", isDark ? "text-slate-300" : "")}>Tax ID</Label>
                  <Input
                    value={businessInfo.taxId}
                    onChange={(e) =>
                      setBusinessInfo({ ...businessInfo, taxId: e.target.value })
                    }
                    placeholder="Tax registration number"
                  />
                </div>

                {/* Save Button */}
                <div className="pt-2">
                  <Button
                    onClick={saveGeneral}
                    disabled={saving}
                    className={cn(
                      isGold
                        ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black hover:shadow-[0_4px_20px_rgba(212,160,23,0.3)]"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    )}
                  >
                    {saving ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ================================================================ */}
        {/* TAB 2: THEME & COLORS                                           */}
        {/* ================================================================ */}
        {activeTab === "theme" && (
          <motion.div
            key="theme"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
              {/* Left Column: Controls */}
              <div className="space-y-6">
                {/* Preset Colors */}
                <Card className={cn(isDark ? "bg-white/[0.03] border-white/[0.06]" : "")}>
                  <CardHeader className="pb-3">
                    <CardTitle className={cn("text-base", isDark ? "text-white" : "")}>Brand Color</CardTitle>
                    <CardDescription className={isDark ? "text-slate-400" : ""}>
                      Choose a preset brand color for your portal
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex flex-wrap gap-2.5">
                      {presetColors.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => {
                            setCustomColor(c.value);
                            updateGradient();
                          }}
                          className={`group flex flex-col items-center gap-1 p-1.5 rounded-lg border-2 transition-all ${
                            brandColor === c.value
                              ? "border-slate-900 bg-slate-50"
                              : "border-transparent hover:border-slate-200"
                          }`}
                        >
                          <div
                            className="h-9 w-9 rounded-full shadow-md group-hover:scale-110 transition-transform"
                            style={{ backgroundColor: c.value }}
                          />
                          <span className="text-[10px] font-medium">{c.name}</span>
                        </button>
                      ))}
                    </div>

                    <Separator />

                    {/* Custom Color */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Or enter a custom primary color
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={customColor}
                          onChange={(e) => {
                            setCustomColor(e.target.value);
                            updateGradient();
                          }}
                          className="h-9 w-9 rounded-lg border cursor-pointer"
                        />
                        <Input
                          value={customColor}
                          onChange={(e) => {
                            setCustomColor(e.target.value);
                            updateGradient();
                          }}
                          className="w-28 font-mono text-sm"
                          placeholder="#059669"
                        />
                        <div
                          className="h-9 px-3 rounded-lg text-white font-medium text-sm flex items-center"
                          style={{ backgroundColor: brandColor }}
                        >
                          Preview
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Brand Gradient Preview */}
                    <div>
                      <p className="text-sm font-medium mb-2">Brand Gradient</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Set your primary and secondary colors for the gradient
                      </p>
                      <div className="flex items-center gap-4 mb-3">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">
                            Primary
                          </Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={customColor}
                              onChange={(e) => {
                                setCustomColor(e.target.value);
                                updateGradient();
                              }}
                              className="h-8 w-8 rounded border cursor-pointer"
                            />
                            <span className="text-xs font-mono text-muted-foreground">
                              {customColor}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center pt-4">
                          <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">
                            Secondary
                          </Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={secondaryColor}
                              onChange={(e) => {
                                setSecondaryColor(e.target.value);
                                updateGradient();
                              }}
                              className="h-8 w-8 rounded border cursor-pointer"
                            />
                            <span className="text-xs font-mono text-muted-foreground">
                              {secondaryColor}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Gradient Preview Bar */}
                      <div
                        className="h-10 rounded-lg shadow-inner"
                        style={{ background: gradientString }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Appearance Settings */}
                <Card className={cn(isDark ? "bg-white/[0.03] border-white/[0.06]" : "")}>
                  <CardHeader className="pb-3">
                    <CardTitle className={cn("text-base", isDark ? "text-white" : "")}>Appearance</CardTitle>
                    <CardDescription className={isDark ? "text-slate-400" : ""}>
                      Fine-tune the look and feel of your portal
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Dark Mode */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {darkMode ? (
                          <Moon className="h-4 w-4 text-slate-700" />
                        ) : (
                          <Sun className="h-4 w-4 text-amber-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium">Dark Mode</p>
                          <p className="text-xs text-muted-foreground">
                            Switch to dark theme for your portal
                          </p>
                        </div>
                      </div>
                      <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                    </div>

                    {/* Theme Selector */}
                    {darkMode && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Theme Variant</p>
                        <div className="flex gap-2">
                          {([
                            { value: "premium-dark" as const, label: "Premium Dark (Gold)", icon: "✨" },
                            { value: "dark" as const, label: "Dark (Green)", icon: "🌙" },
                          ]).map((t) => (
                            <button
                              key={t.value}
                              onClick={() => setAppTheme(t.value)}
                              className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                                appTheme === t.value
                                  ? t.value === "premium-dark"
                                    ? "border-amber-500 bg-amber-50 text-amber-700"
                                    : "border-emerald-600 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 hover:border-slate-300 text-slate-600"
                              }`}
                            >
                              <span>{t.icon}</span>
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Font Size */}
                    <div>
                      <p className="text-sm font-medium mb-3">Font Size</p>
                      <div className="flex gap-2">
                        {(["small", "medium", "large"] as const).map((size) => (
                          <button
                            key={size}
                            onClick={() => setFontSize(size)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                              fontSize === size
                                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 hover:border-slate-300 text-slate-600"
                            }`}
                          >
                            <Type
                              className={`h-3.5 w-3.5 ${
                                size === "small" ? "h-2.5 w-2.5" : size === "large" ? "h-4.5 w-4.5" : ""
                              }`}
                            />
                            {size.charAt(0).toUpperCase() + size.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Border Radius */}
                    <div>
                      <p className="text-sm font-medium mb-3">Border Radius</p>
                      <div className="flex gap-2">
                        {(["rounded", "sharp", "pill"] as const).map((style) => (
                          <button
                            key={style}
                            onClick={() => setBorderRadius(style)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                              borderRadius === style
                                ? style === "sharp"
                                  ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                                  : style === "pill"
                                    ? "border-emerald-600 bg-emerald-50 text-emerald-700 rounded-full"
                                    : "border-emerald-600 bg-emerald-50 text-emerald-700 rounded-lg"
                                : "border-slate-200 hover:border-slate-300 text-slate-600"
                            }`}
                            style={
                              borderRadius !== style
                                ? {
                                    borderRadius: style === "sharp" ? "0px" : style === "pill" ? "9999px" : "8px",
                                  }
                                : undefined
                            }
                          >
                            <RectangleHorizontal className="h-3.5 w-3.5" />
                            {style.charAt(0).toUpperCase() + style.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Theme Save Button */}
                <div className="pt-2">
                  <Button
                    onClick={saveThemeSettings}
                    disabled={saving}
                    className={cn(
                      isGold
                        ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black hover:shadow-[0_4px_20px_rgba(212,160,23,0.3)]"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    )}
                  >
                    {saving ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="mr-2 h-4 w-4" /> Save Theme Settings</>
                    )}
                  </Button>
                </div>
              </div>

              {/* Right Column: Live Preview */}
              <div>
                <Card className={cn("sticky top-6", isDark ? "bg-white/[0.03] border-white/[0.06]" : "")}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className={cn("text-base", isDark ? "text-white" : "")}>Live Preview</CardTitle>
                    </div>
                    <CardDescription className={isDark ? "text-slate-400" : ""}>
                      See how your portal looks with the current theme
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`border overflow-hidden ${getRadiusClass()} ${darkMode ? "bg-slate-900" : "bg-white"}`}
                      style={{ fontSize: getFontSizeValue() }}
                    >
                      {/* Portal Header */}
                      <div
                        className="p-4 flex items-center gap-3"
                        style={{ background: gradientString }}
                      >
                        <div
                          className={`w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-sm ${getRadiusClass()}`}
                        >
                          {logoPreview ? (
                            <img
                              src={logoPreview}
                              alt="Logo"
                              className="w-6 h-6 object-contain"
                            />
                          ) : (
                            <span className="text-white font-bold text-sm">BF</span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">
                            {businessInfo.name}
                          </p>
                          <p className="text-white/70 text-xs">{brandSlogan}</p>
                        </div>
                      </div>

                      {/* Portal Body */}
                      <div className={`p-4 space-y-4 ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                        {/* Stats Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {[
                            { label: "Orders", value: "248" },
                            { label: "Revenue", value: `${businessInfo.currency} 12.4K` },
                            { label: "Customers", value: "1,032" },
                          ].map((stat) => (
                            <div
                              key={stat.label}
                              className={`p-3 text-center border ${darkMode ? "border-slate-700 bg-slate-800" : "border-slate-100 bg-slate-50"} ${getRadiusClass()}`}
                            >
                              <p className="font-bold text-sm">{stat.value}</p>
                              <p className={`text-xs ${darkMode ? "text-slate-400" : "text-muted-foreground"}`}>
                                {stat.label}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Sample Button */}
                        <div className="flex gap-2">
                          <button
                            className={`px-4 py-2 text-white text-sm font-medium ${getRadiusClass()}`}
                            style={{ backgroundColor: customColor }}
                          >
                            Primary Action
                          </button>
                          <button
                            className={`px-4 py-2 text-sm font-medium border ${getRadiusClass()}`}
                            style={{
                              borderColor: customColor,
                              color: customColor,
                            }}
                          >
                            Secondary
                          </button>
                          {borderRadius === "pill" ? (
                            <button
                              className="px-4 py-2 text-white text-sm font-medium rounded-full"
                              style={{ background: gradientString }}
                            >
                              Gradient Pill
                            </button>
                          ) : null}
                        </div>

                        {/* Sample Card */}
                        <div
                          className={`p-3 border ${darkMode ? "border-slate-700 bg-slate-800" : "border-slate-100"} ${getRadiusClass()}`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className={`w-8 h-8 flex items-center justify-center text-white text-xs font-bold ${getRadiusClass()}`}
                              style={{ backgroundColor: customColor }}
                            >
                              A+
                            </div>
                            <div>
                              <p className="font-medium text-sm">Ahmed Ali</p>
                              <p className={`text-xs ${darkMode ? "text-slate-400" : "text-muted-foreground"}`}>
                                VIP Customer
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge
                              style={{
                                backgroundColor: customColor + "15",
                                color: customColor,
                              }}
                              className={`text-xs ${getRadiusClass()}`}
                            >
                              Active
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {businessInfo.currency} 2,450 spent
                            </span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs ${darkMode ? "text-slate-400" : "text-muted-foreground"}`}>
                              Monthly Target
                            </span>
                            <span className="text-xs font-medium" style={{ color: customColor }}>
                              78%
                            </span>
                          </div>
                          <div
                            className={`h-2 ${darkMode ? "bg-slate-700" : "bg-slate-100"} ${getRadiusClass()}`}
                            style={{ borderRadius: getRadiusValue() }}
                          >
                            <div
                              className="h-full"
                              style={{
                                width: "78%",
                                background: gradientString,
                                borderRadius: getRadiusValue(),
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        )}

        {/* ================================================================ */}
        {/* TAB 3: LOGO & BRANDING                                          */}
        {/* ================================================================ */}
        {activeTab === "branding" && (
          <motion.div
            key="branding"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
              <div className="space-y-6">
                {/* Logo Upload */}
                <Card className={cn(isDark ? "bg-white/[0.03] border-white/[0.06]" : "")}>
                  <CardHeader className="pb-3">
                    <CardTitle className={cn("text-base", isDark ? "text-white" : "")}>Business Logo</CardTitle>
                    <CardDescription className={isDark ? "text-slate-400" : ""}>
                      Upload your business logo. It will appear in the header and on communications.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file, "logo");
                      }}
                    />
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setLogoDragOver(true);
                      }}
                      onDragLeave={() => setLogoDragOver(false)}
                      onDrop={(e) => handleDrop(e, "logo")}
                      onClick={() => logoInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                        logoDragOver
                          ? "border-emerald-500 bg-emerald-50/50"
                          : logoPreview
                            ? "border-slate-200 hover:border-emerald-300"
                            : "border-slate-200 hover:border-emerald-300"
                      }`}
                    >
                      {logoPreview ? (
                        <div className="space-y-3">
                          <div className="mx-auto w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center border p-2">
                            <img
                              src={logoPreview}
                              alt="Logo preview"
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                          <p className="text-sm font-medium text-slate-700">
                            Logo uploaded
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Click or drag to replace
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="mx-auto w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              Drop your logo here or click to upload
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              SVG, PNG, JPG, or WebP (max 2MB)
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    {logoPreview && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-3 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLogoPreview(null);
                          toast.info("Logo removed");
                        }}
                      >
                        <X className="mr-1 h-3.5 w-3.5" /> Remove Logo
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Favicon Upload */}
                <Card className={cn(isDark ? "bg-white/[0.03] border-white/[0.06]" : "")}>
                  <CardHeader className="pb-3">
                    <CardTitle className={cn("text-base", isDark ? "text-white" : "")}>Favicon</CardTitle>
                    <CardDescription className={isDark ? "text-slate-400" : ""}>
                      The small icon displayed in browser tabs. 32x32 or 64x64 recommended.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <input
                      ref={faviconInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file, "favicon");
                      }}
                    />
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setFaviconDragOver(true);
                      }}
                      onDragLeave={() => setFaviconDragOver(false)}
                      onDrop={(e) => handleDrop(e, "favicon")}
                      onClick={() => faviconInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                        faviconDragOver
                          ? "border-emerald-500 bg-emerald-50/50"
                          : faviconPreview
                            ? "border-slate-200 hover:border-emerald-300"
                            : "border-slate-200 hover:border-emerald-300"
                      }`}
                    >
                      {faviconPreview ? (
                        <div className="space-y-2 flex flex-col items-center">
                          <div className="w-12 h-12 bg-slate-50 rounded-lg border flex items-center justify-center p-1">
                            <img
                              src={faviconPreview}
                              alt="Favicon preview"
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                          <p className="text-sm font-medium text-slate-700">
                            Favicon uploaded
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Click or drag to replace
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <FileImage className="h-7 w-7 text-muted-foreground mx-auto" />
                          <p className="text-sm font-medium">Upload favicon</p>
                          <p className="text-xs text-muted-foreground">
                            32x32 or 64x64 recommended
                          </p>
                        </div>
                      )}
                    </div>
                    {faviconPreview && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFaviconPreview(null);
                          toast.info("Favicon removed");
                        }}
                      >
                        <X className="mr-1 h-3.5 w-3.5" /> Remove Favicon
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Save Button */}
                <Button
                  onClick={saveBranding}
                  disabled={saving}
                  className={cn(
                    isGold
                      ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black hover:shadow-[0_4px_20px_rgba(212,160,23,0.3)]"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  )}
                >
                  {saving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" /> Save Branding</>
                  )}
                </Button>
              </div>

              {/* Right Column: Brand Text */}
              <div className="space-y-6">
                <Card className={cn(isDark ? "bg-white/[0.03] border-white/[0.06]" : "")}>
                  <CardHeader className="pb-3">
                    <CardTitle className={cn("text-base", isDark ? "text-white" : "")}>Brand Identity</CardTitle>
                    <CardDescription className={isDark ? "text-slate-400" : ""}>
                      Define your brand voice and messaging
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className={cn("mb-1.5 block text-sm font-medium", isDark ? "text-slate-300" : "")}>
                        Brand Slogan
                      </Label>
                      <Input
                        value={brandSlogan}
                        onChange={(e) => setBrandSlogan(e.target.value)}
                        placeholder="A short catchy tagline for your brand"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        This appears below your logo in the portal header
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <Label className={cn("mb-1.5 block text-sm font-medium", isDark ? "text-slate-300" : "")}>
                        Brand Description
                      </Label>
                      <Textarea
                        value={brandDescription}
                        onChange={(e) => setBrandDescription(e.target.value)}
                        placeholder="Describe your brand, mission, and values..."
                        rows={5}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Used in your public-facing store page and meta descriptions
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Branding Preview Card */}
                <Card className={cn(isDark ? "bg-white/[0.03] border-white/[0.06]" : "")}>
                  <CardHeader className="pb-3">
                    <CardTitle className={cn("text-base flex items-center gap-2", isDark ? "text-white" : "")}>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      Branding Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`border overflow-hidden ${getRadiusClass()} ${darkMode ? "bg-slate-900" : "bg-white"}`}
                    >
                      <div className="p-4 flex items-center gap-3" style={{ background: gradientString }}>
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/20 backdrop-blur-sm">
                          {logoPreview ? (
                            <img src={logoPreview} alt="Logo" className="w-6 h-6 object-contain" />
                          ) : (
                            <span className="text-white font-bold text-sm">BF</span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{businessInfo.name}</p>
                          {brandSlogan && (
                            <p className="text-white/70 text-xs">{brandSlogan}</p>
                          )}
                        </div>
                        {faviconPreview && (
                          <img
                            src={faviconPreview}
                            alt="Favicon"
                            className="ml-auto w-4 h-4 object-contain rounded"
                          />
                        )}
                      </div>
                      <div className={`p-4 ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                        <p className="text-xs leading-relaxed" style={{ fontSize: getFontSizeValue() }}>
                          {brandDescription || "Your brand description will appear here..."}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        )}

        {/* ================================================================ */}
        {/* TAB 4: EVENT THEMING                                           */}
        {/* ================================================================ */}
        {activeTab === "events" && (
          <motion.div
            key="events"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
              {/* Left Column: Settings */}
              <div className="space-y-6">
                {/* Location & Religion Context */}
                <Card className={cn(isDark ? "bg-white/[0.03] border-white/[0.06]" : "")}>
                  <CardHeader className="pb-3">
                    <CardTitle className={cn("text-base flex items-center gap-2", isDark ? "text-white" : "")}>
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Region Context
                    </CardTitle>
                    <CardDescription className={isDark ? "text-slate-400" : ""}>
                      Event theming adapts to your location and cultural preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-slate-50 border">
                        <p className="text-xs text-muted-foreground mb-0.5">Country</p>
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5" />
                          {getCountryName(businessInfo.country)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 border">
                        <p className="text-xs text-muted-foreground mb-0.5">Religion</p>
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5" />
                          {businessInfo.religion}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Toggles */}
                <Card className={cn(isDark ? "bg-white/[0.03] border-white/[0.06]" : "")}>
                  <CardHeader className="pb-3">
                    <CardTitle className={cn("text-base flex items-center gap-2", isDark ? "text-white" : "")}>
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                      Dynamic Event Controls
                    </CardTitle>
                    <CardDescription className={isDark ? "text-slate-400" : ""}>
                      Control how events affect your portal appearance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Enable Dynamic Event Theming */}
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50/50">
                      <div className="flex-1 mr-4">
                        <p className="text-sm font-medium">Dynamic Event Theming</p>
                        <p className="text-xs text-muted-foreground">
                          Automatically update portal colors and decorations for active events
                        </p>
                      </div>
                      <Switch checked={dynamicTheming} onCheckedChange={setDynamicTheming} />
                    </div>

                    {/* Show Floating Event Icons */}
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50/50">
                      <div className="flex-1 mr-4">
                        <p className="text-sm font-medium">Floating Event Icons</p>
                        <p className="text-xs text-muted-foreground">
                          Display decorative event icons floating on the portal
                        </p>
                      </div>
                      <Switch checked={floatingIcons} onCheckedChange={setFloatingIcons} />
                    </div>

                    {/* Auto-create Event Campaigns */}
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50/50">
                      <div className="flex-1 mr-4">
                        <p className="text-sm font-medium">Auto-create Event Campaigns</p>
                        <p className="text-xs text-muted-foreground">
                          Automatically generate marketing campaigns for upcoming events
                        </p>
                      </div>
                      <Switch checked={autoCampaigns} onCheckedChange={setAutoCampaigns} />
                    </div>
                  </CardContent>
                </Card>

                {/* Active Events Today */}
                <Card className={cn(isDark ? "bg-white/[0.03] border-white/[0.06]" : "")}>
                  <CardHeader className="pb-3">
                    <CardTitle className={cn("text-base flex items-center gap-2", isDark ? "text-white" : "")}>
                      <Calendar className="h-4 w-4 text-emerald-600" />
                      Active Events Today
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {SAMPLE_ACTIVE_EVENTS.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {SAMPLE_ACTIVE_EVENTS.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No active events today
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {SAMPLE_ACTIVE_EVENTS.map((event) => (
                          <div
                            key={event.id}
                            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 transition-colors"
                          >
                            <span className="text-2xl">{event.icon}</span>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{event.name}</p>
                              <p className="text-xs text-muted-foreground">{event.type}</p>
                            </div>
                            <Badge
                              style={{
                                backgroundColor: event.color + "15",
                                color: event.color,
                              }}
                              className="text-xs"
                            >
                              Active
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Upcoming Events */}
                <Card className={cn(isDark ? "bg-white/[0.03] border-white/[0.06]" : "")}>
                  <CardHeader className="pb-3">
                    <CardTitle className={cn("text-base flex items-center gap-2", isDark ? "text-white" : "")}>
                      <Calendar className="h-4 w-4 text-amber-500" />
                      Upcoming Events (Next 30 Days)
                      <Badge variant="outline" className="ml-auto text-xs">
                        {SAMPLE_UPCOMING_EVENTS.filter((e) => e.daysAway <= 30).length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-72">
                      <div className="space-y-2">
                        {SAMPLE_UPCOMING_EVENTS.filter((e) => e.daysAway <= 30).length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No events in the next 30 days
                          </p>
                        ) : (
                          SAMPLE_UPCOMING_EVENTS
                            .filter((e) => e.daysAway <= 30)
                            .sort((a, b) => a.daysAway - b.daysAway)
                            .map((event) => (
                              <div
                                key={event.id}
                                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 transition-colors"
                              >
                                <span className="text-2xl">{event.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{event.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {event.date} &middot; {event.type}
                                  </p>
                                </div>
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {event.daysAway}d away
                                </Badge>
                              </div>
                            ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Event Theme Preview */}
              <div className="space-y-6">
                <Card className={cn("sticky top-6", isDark ? "bg-white/[0.03] border-white/[0.06]" : "")}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className={cn("text-base", isDark ? "text-white" : "")}>Event Theme Preview</CardTitle>
                    </div>
                    <CardDescription className={isDark ? "text-slate-400" : ""}>
                      Preview how your portal looks with the current event theme
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dynamicTheming && SAMPLE_ACTIVE_EVENTS.length > 0 ? (
                      <div className="space-y-4">
                        {/* Event Banner */}
                        <div
                          className="p-4 rounded-xl text-white text-center relative overflow-hidden"
                          style={{
                            background: `linear-gradient(135deg, ${SAMPLE_ACTIVE_EVENTS[0].color}, ${SAMPLE_ACTIVE_EVENTS[0].color}99)`,
                            borderRadius: getRadiusValue(),
                          }}
                        >
                          {floatingIcons && (
                            <div className="absolute top-2 right-3 text-3xl opacity-30 animate-pulse">
                              {SAMPLE_ACTIVE_EVENTS[0].icon}
                            </div>
                          )}
                          <span className="text-3xl mb-2 block">
                            {SAMPLE_ACTIVE_EVENTS[0].icon}
                          </span>
                          <p className="font-bold text-lg">
                            {SAMPLE_ACTIVE_EVENTS[0].name}
                          </p>
                          <p className="text-sm text-white/80">
                            Special event theme is active
                          </p>
                        </div>

                        {/* Themed Portal Preview */}
                        <div
                          className={`border overflow-hidden ${getRadiusClass()} ${darkMode ? "bg-slate-900" : "bg-white"}`}
                        >
                          {/* Header with Event Colors */}
                          <div
                            className="p-3 flex items-center gap-2"
                            style={{
                              background: `linear-gradient(135deg, ${SAMPLE_ACTIVE_EVENTS[0].color}20, ${SAMPLE_ACTIVE_EVENTS[0].color}08)`,
                            }}
                          >
                            <span className="text-lg">{SAMPLE_ACTIVE_EVENTS[0].icon}</span>
                            <div className="flex-1">
                              <p className={`font-medium text-xs ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                                {SAMPLE_ACTIVE_EVENTS[0].name} Special
                              </p>
                              <p className={`text-[10px] ${darkMode ? "text-slate-400" : "text-muted-foreground"}`}>
                                Limited time offers available
                              </p>
                            </div>
                          </div>

                          {/* Sample Product Cards */}
                          <div className={`p-3 ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                            <p className="text-xs font-semibold mb-2">Featured Products</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {[
                                { name: "Festival Gift Set", price: `${businessInfo.currency} 199` },
                                { name: "Special Edition Box", price: `${businessInfo.currency} 349` },
                              ].map((product) => (
                                <div
                                  key={product.name}
                                  className={`border p-2 ${darkMode ? "border-slate-700 bg-slate-800" : "border-slate-100 bg-slate-50"} ${getRadiusClass()}`}
                                >
                                  <div
                                    className="w-full h-14 mb-2"
                                    style={{
                                      background: `linear-gradient(135deg, ${SAMPLE_ACTIVE_EVENTS[0].color}15, ${SAMPLE_ACTIVE_EVENTS[0].color}30)`,
                                      borderRadius: getRadiusValue(),
                                    }}
                                  />
                                  <p className="text-xs font-medium truncate">{product.name}</p>
                                  <p className="text-xs" style={{ color: SAMPLE_ACTIVE_EVENTS[0].color }}>
                                    {product.price}
                                  </p>
                                </div>
                              ))}
                            </div>

                            {/* CTA Button */}
                            <button
                              className="w-full mt-3 py-2 text-white text-sm font-medium"
                              style={{
                                backgroundColor: SAMPLE_ACTIVE_EVENTS[0].color,
                                borderRadius: getRadiusValue(),
                              }}
                            >
                              Shop {SAMPLE_ACTIVE_EVENTS[0].name} Collection
                            </button>
                          </div>
                        </div>

                        {SAMPLE_ACTIVE_EVENTS.length > 1 && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary" className="text-[10px]">
                              +{SAMPLE_ACTIVE_EVENTS.length - 1} more
                            </Badge>
                            <span>event(s) active today</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 space-y-3">
                        <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center">
                          <Calendar className="h-7 w-7 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-600">
                            {dynamicTheming
                              ? "No Active Events"
                              : "Dynamic Theming is Disabled"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                            {dynamicTheming
                              ? "When events are active, a live preview of the themed portal will appear here."
                              : "Enable Dynamic Event Theming to see event-themed previews of your portal."}
                          </p>
                        </div>
                        {!dynamicTheming && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDynamicTheming(true)}
                          >
                            Enable Dynamic Theming
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
