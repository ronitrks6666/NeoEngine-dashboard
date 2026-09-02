/**
 * Public legal / store-listing contact. Override via VITE_LEGAL_CONTACT_EMAIL in .env if needed.
 */
export const LEGAL_CONTACT_EMAIL =
  import.meta.env.VITE_LEGAL_CONTACT_EMAIL || 'neolab@neuoptic.in';

export const LEGAL_COMPANY_NAME = 'Neuoptic Private Limited';

/** Shown on Privacy Policy, Terms, and other default legal page headers. */
export const LEGAL_LAST_UPDATED = 'September 2, 2026';

export const CONTACT_EMAIL =
  import.meta.env.VITE_CONTACT_EMAIL || 'contact@neuoptic.in';

export const SUPPORT_PHONE_NUMBERS = [
  { display: '+91 93197 81148', tel: '+919319781148' },
  { display: '+91 97424 55177', tel: '+919742455177' },
] as const;
