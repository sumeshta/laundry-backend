import { prisma } from '../lib/prisma.js';
import { badRequest } from '../utils/errors.js';
import { DEFAULT_CURRENCY, isValidCurrency, SUPPORTED_CURRENCIES } from '../constants/currencies.js';

const SETTINGS_ID = 'default';

async function ensureSettings() {
  let settings = await prisma.platformSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!settings) {
    settings = await prisma.platformSettings.create({
      data: { id: SETTINGS_ID, currency: DEFAULT_CURRENCY },
    });
  }
  return settings;
}

export async function getPlatformSettings() {
  const settings = await ensureSettings();
  const meta = SUPPORTED_CURRENCIES.find((c) => c.code === settings.currency);
  return {
    currency: settings.currency,
    currencyLabel: meta?.label || settings.currency,
    currencySymbol: meta?.symbol || settings.currency,
    supportedCurrencies: SUPPORTED_CURRENCIES,
    updatedAt: settings.updatedAt,
  };
}

export async function updateCurrency(currency) {
  if (!isValidCurrency(currency)) {
    throw badRequest(`Unsupported currency. Choose one of: ${SUPPORTED_CURRENCIES.map((c) => c.code).join(', ')}`);
  }
  const settings = await prisma.platformSettings.upsert({
    where: { id: SETTINGS_ID },
    update: { currency },
    create: { id: SETTINGS_ID, currency },
  });
  const meta = SUPPORTED_CURRENCIES.find((c) => c.code === settings.currency);
  return {
    currency: settings.currency,
    currencyLabel: meta?.label,
    currencySymbol: meta?.symbol,
  };
}
