import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

/** Strip non-digit chars from a phone number for wa.me links. */
function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Open a WhatsApp conversation with the given phone number and optional pre-filled text.
 * Uses Capacitor Browser on native; falls back to window.open on web.
 */
export async function openWhatsApp(phone: string, text?: string): Promise<void> {
  const digits = digitsOnly(phone);
  const url = text
    ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${digits}`;

  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
