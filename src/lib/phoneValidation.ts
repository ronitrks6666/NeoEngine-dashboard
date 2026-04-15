import { z } from 'zod';

export const PHONE_10_MESSAGE = 'Enter exactly 10 digits';

/** Indian-style 10-digit mobile validation (digits only, no country code). */
export const zPhone10 = z.string().regex(/^\d{10}$/, PHONE_10_MESSAGE);
