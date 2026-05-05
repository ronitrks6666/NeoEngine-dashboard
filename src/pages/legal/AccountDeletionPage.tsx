import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { LegalMarketingShell } from '@/components/legal/LegalMarketingShell';
import { LegalSection } from '@/components/legal/LegalSection';
import { LEGAL_CONTACT_EMAIL } from '@/constants/legal';

const MAIL_SUBJECT = 'NeoEngine — Account & personal data deletion request';

type AccountRole = 'staff' | 'owner' | 'other';

function buildEmailBody(fields: {
  fullName: string;
  phone: string;
  email: string;
  role: AccountRole;
  outletOrBusiness: string;
  notes: string;
}): string {
  return [
    'Please process the following account / data deletion request:',
    '',
    `Full name: ${fields.fullName || '(not provided)'}`,
    `Registered phone (10-digit, if applicable): ${fields.phone || '(not provided)'}`,
    `Email (if used for login): ${fields.email || '(not provided)'}`,
    `Account type: ${fields.role}`,
    `Outlet / business name (if staff): ${fields.outletOrBusiness || '(not provided)'}`,
    '',
    'Additional notes:',
    fields.notes || '(none)',
    '',
    '— Sent from NeoEngine account deletion web form',
  ].join('\n');
}

export function AccountDeletionPage() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AccountRole>('staff');
  const [outletOrBusiness, setOutletOrBusiness] = useState('');
  const [notes, setNotes] = useState('');
  const [submittedHint, setSubmittedHint] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const body = buildEmailBody({
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      role,
      outletOrBusiness: outletOrBusiness.trim(),
      notes: notes.trim(),
    });
    const mailto = `mailto:${LEGAL_CONTACT_EMAIL}?subject=${encodeURIComponent(MAIL_SUBJECT)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setSubmittedHint(true);
  }

  return (
    <LegalMarketingShell
      title="Delete your account & data"
      metaLine="Request deletion of your NeoEngine account and associated personal data. We verify requests before processing."
    >
      <LegalSection title="Overview">
        <p>
          NeoEngine is used by businesses to manage staff and operations. Depending on your relationship
          with us, deletion may be handled by your employer (for staff accounts) or by our team after we
          confirm your identity (for business owner accounts).
        </p>
        <p>
          Use the form below to send a signed email request to{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-primary font-medium hover:underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
          . You can also email us directly with the same details if your device does not open a mail app.
        </p>
        <p>
          See also our{' '}
          <Link to="/privacy-policy" className="text-primary font-medium hover:underline">
            Privacy Policy
          </Link>{' '}
          for how we process personal data.
        </p>
      </LegalSection>

      <LegalSection title="What happens next">
        <ul className="list-disc pl-5 space-y-2 marker:text-primary text-[15px] leading-relaxed">
          <li>We may reply to confirm your identity or ask for clarifying information.</li>
          <li>
            Staff accounts are often controlled by the outlet owner; we may coordinate with them where
            required by contract or law.
          </li>
          <li>
            Some records may be retained where required for legal, tax, payroll, or dispute resolution
            purposes, as described in our Privacy Policy.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Request form">
        <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
          <div>
            <label htmlFor="del-full-name" className="block text-sm font-medium text-slate-800 mb-1">
              Full name <span className="text-red-600">*</span>
            </label>
            <input
              id="del-full-name"
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(ev) => setFullName(ev.target.value)}
              className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>
          <div>
            <label htmlFor="del-phone" className="block text-sm font-medium text-slate-800 mb-1">
              Registered phone (staff login)
            </label>
            <input
              id="del-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="10-digit number used in the app"
              value={phone}
              onChange={(ev) => setPhone(ev.target.value)}
              className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>
          <div>
            <label htmlFor="del-email" className="block text-sm font-medium text-slate-800 mb-1">
              Email (owner login or contact)
            </label>
            <input
              id="del-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>
          <div>
            <span className="block text-sm font-medium text-slate-800 mb-2">Account type</span>
            <div className="flex flex-col gap-2">
              {(
                [
                  ['staff', 'Staff / employee account'],
                  ['owner', 'Business owner (dashboard) account'],
                  ['other', 'Other / unsure'],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer text-[15px]">
                  <input
                    type="radio"
                    name="role"
                    value={value}
                    checked={role === value}
                    onChange={() => setRole(value)}
                    className="text-primary border-emerald-300 focus:ring-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="del-outlet" className="block text-sm font-medium text-slate-800 mb-1">
              Outlet or business name
            </label>
            <input
              id="del-outlet"
              type="text"
              value={outletOrBusiness}
              onChange={(ev) => setOutletOrBusiness(ev.target.value)}
              placeholder="Helps us locate your tenant"
              className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>
          <div>
            <label htmlFor="del-notes" className="block text-sm font-medium text-slate-800 mb-1">
              Additional details (optional)
            </label>
            <textarea
              id="del-notes"
              rows={4}
              value={notes}
              onChange={(ev) => setNotes(ev.target.value)}
              className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 resize-y min-h-[100px]"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 font-semibold text-white shadow-emerald hover:bg-primary-dark transition-colors"
          >
            Open email app with request
          </button>
          {submittedHint && (
            <p className="text-sm text-slate-600">
              If nothing opened, copy the details above and send them manually to{' '}
              <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-primary font-medium hover:underline">
                {LEGAL_CONTACT_EMAIL}
              </a>{' '}
              with subject &quot;{MAIL_SUBJECT}&quot;.
            </p>
          )}
        </form>
      </LegalSection>
    </LegalMarketingShell>
  );
}
