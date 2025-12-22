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
  let sanitized = phone.replace(/[^0-9]/g, ''); // Remove all non-digits

  // If it's a panamanian number (8 digits), format it.
  if (sanitized.length === 8) {
    return `+507 ${sanitized.slice(0, 4)}-${sanitized.slice(4)}`;
  }
  
  // If it includes country code, try to format
  if (sanitized.startsWith('507') && sanitized.length === 11) {
    const localNumber = sanitized.substring(3);
    return `+507 ${localNumber.slice(0, 4)}-${localNumber.slice(4)}`;
  }
  
  // Fallback for other numbers or if logic above fails
  if (!phone.startsWith('+')) {
     return `+507 ${sanitized}`;
  }

  return phone; // Return original if it doesn't fit expected patterns but has '+'
}


export function formatDate(date: string | number | Date): string {
  if (!date) return "";
  try {
    return format(new Date(date), "dd MMM, yyyy");
  } catch (error) {
    return "";
  }
}


export function getWhatsAppUrl(phoneNumber: string | undefined): string {
  if (!phoneNumber) {
    return '#';
  }
  const sanitizedNumber = phoneNumber.replace(/\D/g, '');
  return `https://wa.me/${sanitizedNumber}`;
}
