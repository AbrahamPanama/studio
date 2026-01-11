
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format as formatDateFns, fromUnixTime } from "date-fns"

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


export function formatDate(date: string | number | Date | { seconds: number, nanoseconds: number }): string {
  if (!date) return "";
  try {
    let dateObj: Date;
    if (typeof date === 'object' && 'seconds' in date && 'nanoseconds' in date) {
      dateObj = fromUnixTime(date.seconds);
    } else {
      dateObj = new Date(date);
    }
    return formatDateFns(dateObj, "dd MMM, yyyy");
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

/**
 * Compresses and resizes an image file to a specified maximum dimension.
 * Defaults to 1024px width/height and 0.7 JPEG quality.
 */
export async function compressImage(file: File, maxWidth = 1024, quality = 0.7): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to JPEG blob
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          // Create new File object
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        }, 'image/jpeg', quality);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
