export const SUPPORTED_CURRENCIES = [
  { code: 'INR', label: 'Indian Rupee', symbol: '₹', locale: 'en-IN' },
  { code: 'USD', label: 'US Dollar', symbol: '$', locale: 'en-US' },
  { code: 'EUR', label: 'Euro', symbol: '€', locale: 'en-DE' },
  { code: 'GBP', label: 'British Pound', symbol: '£', locale: 'en-GB' },
  { code: 'AED', label: 'UAE Dirham', symbol: 'د.إ', locale: 'en-AE' },
  { code: 'SAR', label: 'Saudi Riyal', symbol: '﷼', locale: 'en-SA' },
  { code: 'SGD', label: 'Singapore Dollar', symbol: 'S$', locale: 'en-SG' },
  { code: 'MYR', label: 'Malaysian Ringgit', symbol: 'RM', locale: 'en-MY' },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$', locale: 'en-AU' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'C$', locale: 'en-CA' },
];

export const DEFAULT_CURRENCY = 'INR';

export function isValidCurrency(code) {
  return SUPPORTED_CURRENCIES.some((c) => c.code === code);
}
