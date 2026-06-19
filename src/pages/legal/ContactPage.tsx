import { LegalMarketingShell } from '@/components/legal/LegalMarketingShell';
import { Mail, Phone } from 'lucide-react';
import { CONTACT_EMAIL, SUPPORT_PHONE_NUMBERS } from '@/constants/legal';

export function ContactPage() {
  return (
    <LegalMarketingShell title="Contact Us" metaLine={false}>
      <p className="text-lg text-slate-800">
        Have questions about NeoEngine or need help with your account? Reach out — we&apos;re happy to
        help.
      </p>

      <div className="space-y-6 pt-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-2">
            <Mail className="h-5 w-5 text-primary" aria-hidden />
            Email
          </h2>
          <p>
            Contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary font-medium hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>

        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-2">
            <Phone className="h-5 w-5 text-primary" aria-hidden />
            Support
          </h2>
          <ul className="space-y-2">
            {SUPPORT_PHONE_NUMBERS.map((phone) => (
              <li key={phone.display}>
                <a href={`tel:${phone.tel}`} className="text-primary font-medium hover:underline">
                  {phone.display}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </LegalMarketingShell>
  );
}
