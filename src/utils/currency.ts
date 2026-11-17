import { useSyncExternalStore } from "react";

export const currencies = ["EUR", "USD", "GBP", "BRL", "CHF", "CAD", "AUD", "NZD", "JPY", "CNY", "INR", "SEK", "NOK", "DKK", "PLN", "MXN", "ZAR", "SGD", "AED"] as const;
export type Currency = typeof currencies[number];
export const CURRENCY_KEY = "savings-os-currency";
export const isCurrency = (value: unknown): value is Currency => currencies.some(code => code === value);
export function savedCurrency(): Currency {
  try { const code = localStorage.getItem(CURRENCY_KEY); return isCurrency(code) ? code : "EUR"; } catch { return "EUR"; }
}
let current: Currency = savedCurrency();
const listeners = new Set<() => void>();
export const getCurrency = (): Currency => typeof document === "undefined" ? "EUR" : current;
export function setCurrency(currency: Currency, persist = true) {
  current = currency;
  if (typeof document !== "undefined") document.documentElement.dataset.currency = currency;
  if (persist) { try { localStorage.setItem(CURRENCY_KEY, currency); } catch { /* Keep the session choice. */ } }
  listeners.forEach(listener => listener());
}
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function useCurrency() {
  const currency = useSyncExternalStore(subscribe, getCurrency, () => "EUR" as const);
  return { currency, setCurrency };
}
export function currencyLabel(label: string) {
  const currency = getCurrency();
  const symbol = new Intl.NumberFormat("en-GB", {style:"currency", currency}).formatToParts(0).find(part => part.type === "currency")?.value ?? currency;
  return label.replaceAll("€", symbol).replaceAll("EUR", currency);
}
