import { motion } from 'framer-motion';
import {
  Bot,
  Building2,
  Calendar,
  Clock,
  FileQuestion,
  Lightbulb,
  Sparkles,
} from 'lucide-react';
import type { GenericCardData } from '../types';
import { formatGenericInsight } from '../formatGenericInsight';
import { formatRelativeTime } from '../utils';

type Props = {
  data: GenericCardData;
  meta?: string;
  updatedAt?: string;
  onSuggestionSelect?: (prompt: string) => void;
  showFollowUps?: boolean;
};

const MEDALS = ['🥇', '🥈', '🥉'];

const kpiAccent: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-800 border-emerald-100',
  amber: 'bg-amber-50 text-amber-800 border-amber-100',
  rose: 'bg-rose-50 text-rose-800 border-rose-100',
  sky: 'bg-sky-50 text-sky-800 border-sky-100',
  violet: 'bg-violet-50 text-violet-800 border-violet-100',
  gray: 'bg-gray-50 text-gray-700 border-gray-100',
};

export function GenericCard({
  data,
  meta,
  updatedAt,
  onSuggestionSelect,
  showFollowUps = true,
}: Props) {
  const insight = formatGenericInsight(data, meta);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      className="w-full max-w-2xl rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-emerald overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 sm:px-8 pt-6 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center border border-emerald-100">
                <Bot className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-900">AI Insight</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  <Sparkles className="h-3 w-3" />
                  {insight.category}
                </span>
              </div>
            </div>
          </div>
        </div>

        <h2 className="mt-5 text-2xl font-bold text-gray-900 tracking-tight leading-tight">
          {insight.title}
        </h2>
      </div>

      {/* Main content */}
      <div className="px-6 sm:px-8 pb-6 space-y-6">
        {insight.isClarification ? (
          <div className="space-y-4">
            {insight.clarificationPrompt && (
              <p className="text-[15px] leading-relaxed text-gray-600">{insight.clarificationPrompt}</p>
            )}
            <p className="text-lg font-semibold text-gray-900">Did you mean</p>
            <div className="flex flex-wrap gap-2">
              {insight.clarificationOptions.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onSuggestionSelect?.(`attendance for ${name} today`)}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100 hover:-translate-y-0.5 transition-all duration-200"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        ) : insight.emptyState ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-6 py-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <FileQuestion className="h-7 w-7 text-gray-400" />
            </div>
            <p className="text-lg font-semibold text-gray-900">{insight.emptyState.title}</p>
            <p className="text-sm font-medium text-gray-500 mt-3 mb-2">Possible reasons</p>
            <ul className="text-sm text-gray-600 space-y-1.5 text-left max-w-sm mx-auto">
              {insight.emptyState.reasons.map((r) => (
                <li key={r} className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            {insight.rankings.length > 0 && (
              <div className="space-y-3">
                {insight.rankings.map((row) => (
                  <motion.div
                    key={`${row.rank}-${row.name}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: row.rank * 0.06 }}
                    className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gradient-to-r from-white to-emerald-50/30 px-4 py-3.5"
                  >
                    <span className="text-2xl w-8 text-center shrink-0">{MEDALS[row.rank - 1] || `${row.rank}.`}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-gray-900 truncate">{row.name}</p>
                      {row.subtitle && (
                        <p className="text-sm text-emerald-700 font-medium mt-0.5">{row.subtitle}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {insight.kpis.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {insight.kpis.map((kpi) => (
                  <div
                    key={`${kpi.label}-${kpi.value}`}
                    className={`rounded-2xl border px-4 py-4 ${kpiAccent[kpi.accent] || kpiAccent.emerald}`}
                  >
                    <p className="text-xs font-medium opacity-75">{kpi.label}</p>
                    <p className="text-2xl sm:text-3xl font-bold mt-1 tabular-nums tracking-tight">{kpi.value}</p>
                  </div>
                ))}
              </div>
            )}

            {insight.bullets.length > 0 && insight.rankings.length === 0 && (
              <ul className="space-y-3">
                {insight.bullets.map((bullet) => {
                  const dashIdx = bullet.indexOf(' — ');
                  const hasSection = dashIdx > 0;
                  return (
                    <li
                      key={bullet}
                      className="flex items-start gap-3 text-[15px] leading-relaxed"
                    >
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>
                        {hasSection ? (
                          <>
                            <span className="font-semibold text-gray-900">{bullet.slice(0, dashIdx)}</span>
                            <span className="text-gray-600">{bullet.slice(dashIdx)}</span>
                          </>
                        ) : (
                          <span className="text-gray-700">{bullet}</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            {insight.badges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {insight.badges.map((b) => (
                  <span
                    key={b.label}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${kpiAccent[b.tone] || kpiAccent.gray}`}
                  >
                    {b.label}
                  </span>
                ))}
              </div>
            )}
          </>
        )}

        {/* AI Insight section */}
        {!insight.isClarification && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border border-emerald-100 px-5 py-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/80 border border-emerald-100 flex items-center justify-center shrink-0">
                <Lightbulb className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">AI Insight</p>
                <p className="text-[15px] leading-relaxed text-gray-700">{insight.aiInsight}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Metadata chips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="px-6 sm:px-8 pb-4 flex flex-wrap gap-2"
      >
        {data.context?.outlet && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
            <Building2 className="h-3.5 w-3.5 text-gray-500" />
            {data.context.outlet}
          </span>
        )}
        {(data.context?.period || insight.dateChips[0]) && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
            <Calendar className="h-3.5 w-3.5 text-gray-500" />
            {insight.dateChips[0] || data.context?.period}
          </span>
        )}
        {insight.dateChips.slice(1).map((d) => (
          <span
            key={d}
            className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700"
          >
            <Calendar className="h-3.5 w-3.5 text-gray-500" />
            {d}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
          <Clock className="h-3.5 w-3.5 text-gray-500" />
          Updated {formatRelativeTime(updatedAt)}
        </span>
      </motion.div>

      {/* Follow-ups */}
      {showFollowUps && insight.followUps.length > 0 && onSuggestionSelect && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="px-6 sm:px-8 py-5 border-t border-emerald-50 bg-emerald-50/20"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
            You may also ask
          </p>
          <div className="flex flex-wrap gap-2">
            {insight.followUps.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSuggestionSelect(s)}
                className="rounded-full border border-emerald-100 bg-white px-3.5 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-50 hover:border-emerald-200 hover:-translate-y-0.5 transition-all duration-200 shadow-sm"
              >
                {s}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
