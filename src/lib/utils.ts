import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  // Keep the '+' if it's there, remove all other non-digit characters
  const cleaned = phone.replace(/[^0-9+]/g, '');
  return cleaned;
}

export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  let sanitized = sanitizePhoneNumber(phone);

  if (sanitized.startsWith('+')) {
    // Number already has a country code
    const parts = sanitized.split('+');
    const number = parts[1];
    const countryCode = number.substring(0, 3);
    const restOfNumber = number.substring(3);
    return `+${countryCode} ${restOfNumber}`;
  }
  
  // Default to +507 if no country code is present
  return `+507 ${sanitized}`;
}

export function formatDate(date: string | number | Date): string {
  if (!date) return "";
  try {
    return format(new Date(date), "dd MMM, yyyy");
  } catch (error) {
    return "";
  }
}
