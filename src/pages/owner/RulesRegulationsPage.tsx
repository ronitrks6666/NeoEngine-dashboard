import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { ownerApi } from '@/api/owner';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { RichTextEditor } from '@/components/RichTextEditor';
import { BookOpen, Save, Undo2 } from 'lucide-react';

export function RulesRegulationsPage() {
  const { selectedOutletId } = useOutletStore();
  const [text, setText] = useState('');
  const [savedText, setSavedText] = useState('');
  const [saveMsg, setSaveMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['outlet-rules', selectedOutletId],
    queryFn: () => ownerApi.getOutletRules(selectedOutletId!),
    enabled: !!selectedOutletId,
  });

  useEffect(() => {
    if (data) {
      const body = data.rulesAndRegulations ?? '';
      setText(body);
      setSavedText(body);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => ownerApi.updateOutletRules(selectedOutletId!, text),
    onSuccess: () => {
      setSavedText(text);
      setSaveMsg({ type: 'ok', text: 'Rules saved. Staff will see the updated version in the app.' });
    },
    onError: (e) => setSaveMsg({ type: 'err', text: getApiErrorMessage(e) }),
  });

  const dirty = text !== savedText;

  if (!selectedOutletId) {
    return <div className="p-6 text-amber-600">Select an outlet in the header first.</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-emerald-600" />
            Rules &amp; Regulations
          </h1>
          <p className="text-gray-500 mt-1">
            Outlet policies shown to staff in the mobile app
            {data?.outletName ? (
              <>
                {' '}
                — <span className="font-medium text-gray-700">{data.outletName}</span>
              </>
            ) : null}
          </p>
          {data?.rulesVersion != null && (
            <p className="text-xs text-gray-400 mt-1">Version {data.rulesVersion}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            disabled={!dirty || saveMutation.isPending}
            onClick={() => {
              setText(savedText);
              setSaveMsg(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <Undo2 className="h-4 w-4" />
            Reset
          </button>
          <button
            type="button"
            disabled={!dirty || saveMutation.isPending}
            onClick={() => {
              setSaveMsg(null);
              saveMutation.mutate();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {saveMsg && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            saveMsg.type === 'ok'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {saveMsg.text}
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-3">
            <p className="text-sm text-gray-600">
              Write clear, outlet-specific rules (dress code, break policy, safety, etc.). Use headings (H1–H5),
              bold, links, strikethrough, and lists — click the same heading again to return to normal text.
            </p>
          </div>
          <RichTextEditor
            value={text}
            onChange={setText}
            placeholder="Enter rules and regulations for this outlet…"
            minHeight={420}
          />
        </div>
      )}
    </div>
  );
}
