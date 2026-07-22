import { useOutletStore } from '@/stores/outletStore';
import { NeoNotesPanel } from '@/components/neoNotes/NeoNotesPanel';

export function NeoNotesPage() {
  const { selectedOutletId } = useOutletStore();

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-emerald-900">Neo Notes</h1>
        <p className="text-emerald-700 mt-0.5 font-medium">
          Personal daily notes — share with your outlet when you choose
        </p>
      </div>
      <NeoNotesPanel outletId={selectedOutletId} />
    </div>
  );
}
