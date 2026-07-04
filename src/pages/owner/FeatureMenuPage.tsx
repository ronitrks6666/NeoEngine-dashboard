import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GripVertical, LayoutGrid, Smartphone, Save } from 'lucide-react';
import { ownerApi, type FeatureMenuPrefRow, type FeatureMenuSection } from '@/api/owner';
import { LoadingSpinner } from '@/components/LoadingSpinner';

type TabId = 'web' | 'mobile';

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${checked ? 'bg-emerald-600' : 'bg-gray-200'}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function SortableFeatureRow({
  id,
  label,
  enabled,
  locked,
  onToggle,
}: {
  id: string;
  label: string;
  enabled: boolean;
  locked?: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: locked,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 ${
        isDragging ? 'border-emerald-400 shadow-md' : 'border-emerald-100'
      }`}
    >
      <button
        type="button"
        className={`touch-none text-emerald-600 ${locked ? 'cursor-not-allowed opacity-30' : ''}`}
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
        disabled={locked}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{label}</p>
        {locked ? (
          <p className="text-xs text-emerald-600">Always visible</p>
        ) : (
          <p className="text-xs text-gray-500">{enabled ? 'Shown in menu' : 'Hidden'}</p>
        )}
      </div>
      <Toggle checked={enabled} onChange={onToggle} disabled={locked} />
    </div>
  );
}

function FeatureListEditor({
  section,
  rows,
  onChange,
}: {
  section: FeatureMenuSection;
  rows: FeatureMenuPrefRow[];
  onChange: (rows: FeatureMenuPrefRow[]) => void;
}) {
  const catalogMap = useMemo(
    () => new Map(section.catalog.map((c) => [c.key, c])),
    [section.catalog]
  );
  const lockedKeys = useMemo(
    () => new Set(section.catalog.filter((c) => c.locked).map((c) => c.key)),
    [section.catalog]
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = rows.findIndex((r) => r.key === active.id);
      const newIndex = rows.findIndex((r) => r.key === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      onChange(arrayMove(rows, oldIndex, newIndex));
    },
    [rows, onChange]
  );

  const toggle = (key: string, enabled: boolean) => {
    onChange(rows.map((r) => (r.key === key ? { ...r, enabled } : r)));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={rows.map((r) => r.key)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {rows.map((row) => {
            const meta = catalogMap.get(row.key);
            return (
              <SortableFeatureRow
                key={row.key}
                id={row.key}
                label={meta?.label || row.key}
                enabled={row.enabled}
                locked={lockedKeys.has(row.key)}
                onToggle={(v) => toggle(row.key, v)}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function FeatureMenuPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabId>('web');
  const [webRows, setWebRows] = useState<FeatureMenuPrefRow[]>([]);
  const [mobileRows, setMobileRows] = useState<FeatureMenuPrefRow[]>([]);
  const [dirty, setDirty] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['owner-feature-menu'],
    queryFn: () => ownerApi.getFeatureMenu(),
  });

  useEffect(() => {
    if (!data) return;
    setWebRows(data.webNav.items);
    setMobileRows(data.mobileMore.items);
    setDirty(false);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      ownerApi.updateFeatureMenu({
        webNav: webRows,
        mobileMore: mobileRows,
      }),
    onSuccess: (next) => {
      queryClient.setQueryData(['owner-feature-menu'], next);
      setWebRows(next.webNav.items);
      setMobileRows(next.mobileMore.items);
      setDirty(false);
    },
  });

  const markDirty = () => setDirty(true);

  if (isLoading || !data) {
    return <LoadingSpinner />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Features</h1>
        <p className="mt-1 text-sm text-gray-600">
          Choose which features appear in the web sidebar and the mobile app More menu. Drag to
          reorder.
        </p>
      </div>

      <div className="flex gap-2 rounded-xl bg-emerald-50 p-1">
        <button
          type="button"
          onClick={() => setTab('web')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
            tab === 'web' ? 'bg-white text-emerald-800 shadow-sm' : 'text-emerald-700'
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          Web dashboard
        </button>
        <button
          type="button"
          onClick={() => setTab('mobile')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
            tab === 'mobile' ? 'bg-white text-emerald-800 shadow-sm' : 'text-emerald-700'
          }`}
        >
          <Smartphone className="h-4 w-4" />
          Mobile app More
        </button>
      </div>

      {tab === 'web' ? (
        <FeatureListEditor
          section={data.webNav}
          rows={webRows}
          onChange={(rows) => {
            setWebRows(rows);
            markDirty();
          }}
        />
      ) : (
        <FeatureListEditor
          section={data.mobileMore}
          rows={mobileRows}
          onChange={(rows) => {
            setMobileRows(rows);
            markDirty();
          }}
        />
      )}

      <button
        type="button"
        disabled={!dirty || saveMutation.isPending}
        onClick={() => saveMutation.mutate()}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saveMutation.isPending ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}
