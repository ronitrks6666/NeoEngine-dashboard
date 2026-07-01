import { useCallback, useState, type FormEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Phone,
  Sparkles,
  User,
} from 'lucide-react';
import { publicApi, INTEREST_OPTIONS, type InterestOption } from '@/api/public';

type FormState = 'idle' | 'loading' | 'success' | 'error';

const inputBase =
  'w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3.5 text-sm text-white outline-none transition-[border-color,box-shadow,background-color] duration-150 focus:border-white/50 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.12)]';

type InterestBubblesProps = {
  value: InterestOption[];
  onToggle: (option: InterestOption) => void;
};

function InterestBubbles({ value, onToggle }: InterestBubblesProps) {
  return (
    <fieldset className="space-y-2.5">
      <legend className="text-sm font-medium text-white/80">
        What are you interested in? <span className="text-white/50">(select any)</span>
      </legend>
      <div className="flex flex-wrap gap-2" role="group" aria-label="What are you interested in?">
        {INTEREST_OPTIONS.map((option) => {
          const selected = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggle(option)}
              className={`inline-flex rounded-full border px-4 py-2 text-sm font-semibold transition-[transform,border-color,background-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                selected
                  ? 'border-white bg-white text-[#0A7A59] shadow-sm'
                  : 'border-white/25 bg-white/10 text-white/85 hover:border-white/40 hover:bg-white/15'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SalesLeadForm() {
  const reducedMotion = useReducedMotion();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [interests, setInterests] = useState<InterestOption[]>([]);
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const resetForm = useCallback(() => {
    setFormState('idle');
    setName('');
    setPhone('');
    setInterests([]);
  }, []);

  const handleInterestToggle = useCallback((option: InterestOption) => {
    setInterests((prev) =>
      prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option],
    );
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || interests.length === 0) return;

    setFormState('loading');
    setErrorMsg('');

    try {
      await publicApi.submitSalesLead({
        name: name.trim(),
        phone: phone.trim(),
        interest: interests,
      });
      setFormState('success');
    } catch {
      setFormState('error');
      setErrorMsg('Something went wrong. Please try again.');
    }
  };

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-48px' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="w-full rounded-[28px] border border-white/15 bg-white/10 p-7 shadow-[0_24px_64px_rgba(0,0,0,0.18)] backdrop-blur-sm sm:p-8"
    >
      <AnimatePresence mode="wait">
        {formState === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center py-8 text-center"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </span>
            <h3 className="mt-5 text-xl font-bold text-white">We'll be in touch!</h3>
            <p className="mt-2 text-sm text-white/75">
              Our team will call you shortly. Usually within a few hours.
            </p>
            <button
              type="button"
              onClick={resetForm}
              className="mt-6 rounded-xl border border-white/25 px-5 py-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
            >
              Submit another
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-white/70" aria-hidden="true" />
                  <h3 className="text-lg font-bold text-white sm:text-xl">Get a callback</h3>
                </div>
                <p className="text-sm text-white/70">
                  Leave your details. Our team will reach out within a few hours.
                </p>
              </div>

              <div className="relative">
                <User
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
                  aria-hidden="true"
                />
                <input
                  id="sales-name"
                  name="sales-lead-name"
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={`${inputBase} pl-11 placeholder:text-white/50`}
                  aria-label="Your name"
                />
              </div>

              <div className="relative">
                <Phone
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
                  aria-hidden="true"
                />
                <input
                  id="sales-phone"
                  name="sales-lead-phone"
                  type="tel"
                  autoComplete="off"
                  placeholder="Your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className={`${inputBase} pl-11 placeholder:text-white/50`}
                  aria-label="Phone number"
                />
              </div>

              <InterestBubbles value={interests} onToggle={handleInterestToggle} />

              {formState === 'error' && (
                <p className="rounded-xl border border-red-300/30 bg-red-400/15 px-4 py-2.5 text-sm text-red-100">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={
                  formState === 'loading' || !name.trim() || !phone.trim() || interests.length === 0
                }
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-[#0A7A59] transition-[transform,opacity] duration-200 hover:-translate-y-0.5 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {formState === 'loading' ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <>
                    Request callback
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-white/45">
                No spam. We only call once unless you ask us to follow up.
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
