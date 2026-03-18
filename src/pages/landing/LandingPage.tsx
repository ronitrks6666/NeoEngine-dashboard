import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import {
  Clock,
  CheckSquare,
  DollarSign,
  BarChart3,
  Network,
  Smartphone,
  Play,
  ArrowRight,
  UtensilsCrossed,
  Store,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { NeoEngineLogo } from '@/components/NeoEngineLogo';
import { fetchLandingConfig, type LandingConfig, type LandingFeature } from '@/api/config';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const ICON_MAP: Record<string, LucideIcon> = {
  Clock,
  CheckSquare,
  DollarSign,
  BarChart3,
  Network,
  Smartphone,
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function FeatureIcon({ icon }: { icon: string }) {
  const Icon = ICON_MAP[icon] ?? BarChart3;
  return <Icon className="h-6 w-6" />;
}

const chartData = [
  { name: 'Mon', value: 72, tasks: 45 },
  { name: 'Tue', value: 85, tasks: 52 },
  { name: 'Wed', value: 78, tasks: 48 },
  { name: 'Thu', value: 92, tasks: 61 },
  { name: 'Fri', value: 88, tasks: 55 },
  { name: 'Sat', value: 95, tasks: 68 },
  { name: 'Sun', value: 82, tasks: 50 },
];

const fadeUp = { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } };
const stagger = { animate: { transition: { staggerChildren: 0.08 } } };

export function LandingPage() {
  const { token, role } = useAuth();
  const [config, setConfig] = useState<LandingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);

  useEffect(() => {
    fetchLandingConfig()
      .then((c) => {
        setConfig(c);
        setConfigError(false);
      })
      .catch(() => {
        setConfig(null);
        setConfigError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-100/50">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-emerald-100 bg-white/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <NeoEngineLogo size={36} />
            <span className="font-bold text-xl text-slate-900">NeoEngine</span>
          </Link>
          <div className="flex items-center gap-4">
            {token && role ? (
              <Link
                to={role === 'SUPER_ADMIN' ? '/super-admin/dashboard' : '/owner/dashboard'}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium transition-colors"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-16">
        {/* 1. Hero */}
        <section className="relative overflow-hidden px-4 sm:px-6 py-20 sm:py-32">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-emerald-400/5 to-transparent" />
          <div className="absolute top-1/4 right-0 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-0 w-64 h-64 bg-emerald-300/20 rounded-full blur-3xl" />
          <div className="relative max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-4xl mx-auto"
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 mb-6">
                Run your business
                <span className="block bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">
                  smarter, not harder
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
                NeoEngine automates operations, attendance, tasks, and payroll—so you can focus on what matters.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to={token && role ? (role === 'SUPER_ADMIN' ? '/super-admin/dashboard' : '/owner/dashboard') : '/login'}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold text-lg shadow-emerald-lg hover:from-emerald-700 hover:to-emerald-800 transition-all"
                >
                  {token && role ? 'Go to Dashboard' : 'Get Started'}
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <a
                  href="#demo"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border-2 border-emerald-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 font-semibold transition-colors"
                >
                  <Play className="h-5 w-5" />
                  Watch Demo
                </a>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mt-16 relative"
            >
              <div className="rounded-2xl overflow-hidden border border-emerald-100 shadow-emerald-lg bg-white backdrop-blur-sm">
                <div className="aspect-video bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-4 p-8">
                    {[1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
                        className="rounded-xl bg-white/90 p-4 shadow-lg border border-emerald-100"
                      >
                        <div className="h-3 w-20 bg-emerald-200 rounded mb-3" />
                        <div className="h-2 w-full bg-emerald-100 rounded mb-2" />
                        <div className="h-2 w-3/4 bg-emerald-100 rounded" />
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* 2. Trust */}
        <section className="px-4 sm:px-6 py-16 sm:py-24 border-y border-emerald-100 bg-white/70">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-6xl mx-auto"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {config?.trustStats && (
                <>
                  <div>
                    <p className="text-3xl sm:text-4xl font-bold text-primary">
                      {formatNumber(config.trustStats.businesses)}+
                    </p>
                    <p className="text-slate-600 mt-1">Businesses</p>
                  </div>
                  <div>
                    <p className="text-3xl sm:text-4xl font-bold text-primary">
                      {formatNumber(config.trustStats.staffManaged)}+
                    </p>
                    <p className="text-slate-600 mt-1">Staff Managed</p>
                  </div>
                  <div>
                    <p className="text-3xl sm:text-4xl font-bold text-primary">
                      {config.trustStats.tasksCompleted
                        ? `${formatNumber(config.trustStats.tasksCompleted)}+`
                        : '1M+'}
                    </p>
                    <p className="text-slate-600 mt-1">Tasks Completed</p>
                  </div>
                  <div>
                    <p className="text-3xl sm:text-4xl font-bold text-primary">
                      99.9%
                    </p>
                    <p className="text-slate-600 mt-1">Uptime</p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </section>

        {/* 3. Features (dynamic) */}
        <section className="px-4 sm:px-6 py-20 sm:py-32">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                Everything you need to run operations
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Built for restaurants, retail, and service businesses.
              </p>
            </motion.div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-48 rounded-2xl bg-emerald-100/50 animate-pulse"
                  />
                ))}
              </div>
            ) : configError ? (
              <div className="text-center py-12 text-slate-500">
                <p>Unable to load features. Please try again later.</p>
              </div>
            ) : config?.features?.length ? (
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                variants={stagger}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true, margin: '-60px' }}
              >
                {config.features.map((f: LandingFeature) => (
                  <motion.div
                    key={f.id}
                    variants={fadeUp}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="group p-6 rounded-2xl border border-emerald-100 bg-white hover:shadow-emerald-lg transition-shadow"
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                      <FeatureIcon icon={f.icon} />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      {f.title}
                    </h3>
                    <p className="text-slate-600">{f.description}</p>
                  </motion.div>
                ))}
              </motion.div>
            ) : null}
          </div>
        </section>

        {/* 4. Product Experience */}
        <section className="px-4 sm:px-6 py-20 sm:py-32 bg-emerald-50/50">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
                  From onboarding to insights
                </h2>
                <p className="text-lg text-slate-600 mb-10">
                  A simple workflow that scales with your business.
                </p>
                <div className="space-y-8">
                  {(config?.productSteps ?? [
                    { step: 1, title: 'Onboarding', description: 'Add outlets, roles, and staff in minutes.' },
                    { step: 2, title: 'Operations', description: 'Daily tasks, attendance, and real-time tracking.' },
                    { step: 3, title: 'Insights', description: 'Analytics and reports to optimize performance.' },
                  ]).map((s) => (
                    <div key={s.step} className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                        {s.step}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{s.title}</h3>
                        <p className="text-slate-600">{s.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="rounded-2xl overflow-hidden border border-emerald-100 bg-white shadow-emerald-lg"
              >
                <div className="p-6 border-b border-emerald-100">
                  <div className="flex gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-400" />
                    <span className="w-3 h-3 rounded-full bg-yellow-400" />
                    <span className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                </div>
                <div className="aspect-video bg-emerald-50 flex items-center justify-center p-8">
                  <div className="w-full h-full max-h-48 flex items-end gap-2">
                    {chartData.map((d, idx) => (
                      <motion.div
                        key={d.name}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${d.value}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.05, duration: 0.5 }}
                        className="flex-1 rounded-t bg-primary/80 min-h-[20%]"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 5. Use Cases */}
        <section className="px-4 sm:px-6 py-20 sm:py-32">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                Built for your industry
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                NeoEngine adapts to restaurants, retail, and service businesses.
              </p>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-6">
              {(
                config?.useCases ?? [
                  { id: 'restaurant', title: 'Restaurants & Cafes', impact: 'Streamline shift scheduling, attendance, and task delegation.' },
                  { id: 'retail', title: 'Retail & Stores', impact: 'Manage multi-location staff, track performance, and automate payroll.' },
                  { id: 'services', title: 'Service Businesses', impact: 'Field staff tracking, job assignments, and client-facing operations.' },
                ]
              ).map((uc, idx) => (
                <motion.div
                  key={uc.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-6 rounded-2xl border border-emerald-100 bg-white hover:shadow-emerald transition-shadow"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-primary flex items-center justify-center mb-4">
                    {uc.id === 'restaurant' && <UtensilsCrossed className="h-6 w-6" />}
                    {uc.id === 'retail' && <Store className="h-6 w-6" />}
                    {uc.id === 'services' && <Wrench className="h-6 w-6" />}
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {uc.title}
                  </h3>
                  <p className="text-slate-600">{uc.impact}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Analytics */}
        <section className="px-4 sm:px-6 py-20 sm:py-32 bg-emerald-50/50">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                Data-driven decisions
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Real-time dashboards and reports at your fingertips.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl overflow-hidden border border-emerald-100 bg-white shadow-emerald-lg p-6"
            >
              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                {[
                  { label: 'Attendance Rate', value: '94%', trend: '+2%' },
                  { label: 'Tasks Completed', value: '1,247', trend: '+18%' },
                  { label: 'Avg. Response', value: '4.2 min', trend: '-12%' },
                ].map((c) => (
                  <div
                    key={c.label}
                    className="p-4 rounded-xl bg-emerald-50"
                  >
                    <p className="text-sm text-slate-500">{c.label}</p>
                    <p className="text-2xl font-bold text-slate-900">{c.value}</p>
                    <p className="text-sm text-primary">{c.trend}</p>
                  </div>
                ))}
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-emerald-200" />
                    <XAxis dataKey="name" className="text-slate-500" />
                    <YAxis className="text-slate-500" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--tw-bg-opacity)',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        borderRadius: '12px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#059669"
                      strokeWidth={2}
                      dot={{ fill: '#059669' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="tasks"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={{ fill: '#10B981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        </section>

        {/* 7. Mobile + Web */}
        <section className="px-4 sm:px-6 py-20 sm:py-32">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                Mobile app + Web dashboard
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Staff use the app. Managers use the dashboard. Everyone stays in sync.
              </p>
            </motion.div>
            <div className="flex flex-col lg:flex-row items-center justify-center gap-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="w-[180px] h-[360px] sm:w-[200px] sm:h-[400px] rounded-[2rem] border-4 border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-1.5 rounded-full bg-slate-700" />
                  <div className="pt-8 px-3 pb-4 h-full bg-emerald-50">
                    <div className="rounded-xl bg-white p-4 shadow-inner border border-emerald-100">
                      <div className="h-3 w-3/4 bg-emerald-200 rounded mb-3" />
                      <div className="h-2 w-full bg-emerald-100 rounded mb-2" />
                      <div className="h-2 w-1/2 bg-emerald-100 rounded" />
                    </div>
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl overflow-hidden border border-emerald-100 shadow-emerald-lg w-full max-w-2xl"
              >
                <div className="bg-emerald-50 p-4 border-b border-emerald-100">
                  <div className="flex gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-400" />
                    <span className="w-3 h-3 rounded-full bg-yellow-400" />
                    <span className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                </div>
                <div className="aspect-video bg-emerald-50 flex items-center justify-center p-8">
                  <div className="w-full h-32 flex items-end gap-2">
                    {chartData.slice(0, 5).map((d) => (
                      <div
                        key={d.name}
                        className="flex-1 rounded-t bg-primary/70"
                        style={{ height: `${d.value}%` }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 8. CTA */}
        <section className="px-4 sm:px-6 py-20 sm:py-32 bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Start managing your business smarter
            </h2>
            <p className="text-lg text-emerald-100 mb-10">
              Join hundreds of businesses already using NeoEngine.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to={token && role ? (role === 'SUPER_ADMIN' ? '/super-admin/dashboard' : '/owner/dashboard') : '/login'}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white text-primary hover:bg-emerald-50 font-semibold text-lg transition-colors"
              >
                {token && role ? 'Go to Dashboard' : 'Get Started'}
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border-2 border-white/50 text-white hover:bg-white/10 font-semibold transition-colors"
              >
                Book Demo
              </a>
            </div>
          </motion.div>
        </section>

        {/* 9. Footer */}
        <footer className="px-4 sm:px-6 py-12 border-t border-emerald-100 bg-white">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
            <Link to="/" className="flex items-center gap-2">
              <NeoEngineLogo size={28} />
              <span className="font-bold text-slate-900">NeoEngine</span>
            </Link>
            <nav className="flex flex-wrap gap-6 text-slate-600">
              <a href="#product" className="hover:text-slate-900 transition-colors">
                Product
              </a>
              <a href="#pricing" className="hover:text-slate-900 transition-colors">
                Pricing
              </a>
              <a href="#contact" className="hover:text-slate-900 transition-colors">
                Contact
              </a>
              <a href="#privacy" className="hover:text-slate-900 transition-colors">
                Privacy
              </a>
            </nav>
          </div>
          <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-emerald-100 text-center text-sm text-slate-500">
            © {new Date().getFullYear()} NeoEngine. All rights reserved.
          </div>
        </footer>
      </main>
    </div>
  );
}
