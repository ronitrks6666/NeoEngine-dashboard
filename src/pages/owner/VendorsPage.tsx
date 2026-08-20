import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { useAuth } from '@/hooks/useAuth';
import { vendorApi, type VendorContact, type VendorIconKey, type VendorType } from '@/api/vendor';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ListSearchBar } from '@/components/ListSearchBar';
import { filterVendorTypes } from '@/lib/filterVendors';
import { CopyVendorsToOutletModal } from '@/components/CopyVendorsToOutletModal';
import {
  normalizeIndianPhoneInput,
  normalizePhonesForSave,
  phoneFieldFromStored,
} from '@/lib/normalizeIndianPhone';
import {
  Phone,
  Plus,
  X,
  Droplets,
  Zap,
  Snowflake,
  Flame,
  Bug,
  Car,
  Stethoscope,
  Store,
  Hammer,
  Wrench,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  UserPlus,
  Copy,
} from 'lucide-react';

const ICON_OPTIONS: Array<{ key: VendorIconKey; label: string; Icon: typeof Wrench; bg: string; fg: string }> = [
  { key: 'water', label: 'Plumber', Icon: Droplets, bg: '#E0F2FE', fg: '#0369A1' },
  { key: 'flash', label: 'Electrician', Icon: Zap, bg: '#FEF3C7', fg: '#B45309' },
  { key: 'snow', label: 'AC', Icon: Snowflake, bg: '#E0E7FF', fg: '#4338CA' },
  { key: 'flame', label: 'Gas', Icon: Flame, bg: '#FFEDD5', fg: '#C2410C' },
  { key: 'bug', label: 'Pest', Icon: Bug, bg: '#DCFCE7', fg: '#15803D' },
  { key: 'car', label: 'Transport', Icon: Car, bg: '#F3E8FF', fg: '#7E22CE' },
  { key: 'medical', label: 'Medical', Icon: Stethoscope, bg: '#FFE4E6', fg: '#BE123C' },
  { key: 'storefront', label: 'Supplier', Icon: Store, bg: '#CCFBF1', fg: '#0F766E' },
  { key: 'hammer', label: 'Carpenter', Icon: Hammer, bg: '#FEF9C3', fg: '#A16207' },
  { key: 'construct', label: 'General', Icon: Wrench, bg: '#F1F5F9', fg: '#475569' },
];

function resolveTypeIconAndName(name: string, selectedIcon: VendorIconKey): { name: string; iconKey: VendorIconKey } {
  const trimmed = name.trim();
  const byName = ICON_OPTIONS.find((o) => o.label.toLowerCase() === trimmed.toLowerCase());
  if (byName) return { name: trimmed, iconKey: byName.key };
  if (trimmed) return { name: trimmed, iconKey: 'construct' };
  const byIcon = ICON_OPTIONS.find((o) => o.key === selectedIcon);
  if (byIcon) return { name: byIcon.label, iconKey: byIcon.key };
  return { name: trimmed, iconKey: 'construct' };
}

function iconKeyForTypeName(name: string): VendorIconKey | null {
  const matched = ICON_OPTIONS.find((o) => o.label.toLowerCase() === name.trim().toLowerCase());
  return matched?.key ?? null;
}

function iconMeta(key?: string) {
  return ICON_OPTIONS.find((o) => o.key === key) || ICON_OPTIONS[9];
}

function formatPhone(raw: string) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    const local = digits.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return digits ? `+${digits}` : '';
}

function telHref(raw: string) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  return `tel:+${normalized}`;
}

function waHref(raw: string) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${normalized}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

type ModalMode = 'type-create' | 'type-edit' | 'contact-create' | 'contact-edit' | null;

type DeleteTarget =
  | { kind: 'type'; id: string; name: string }
  | { kind: 'contact'; id: string; name: string };

export function VendorsPage() {
  const { selectedOutletId } = useOutletStore();
  const { role, featurePermissions } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [activeType, setActiveType] = useState<VendorType | null>(null);
  const [activeContact, setActiveContact] = useState<VendorContact | null>(null);
  const [typeName, setTypeName] = useState('');
  const [typeIcon, setTypeIcon] = useState<VendorIconKey>('construct');
  const [vendorName, setVendorName] = useState('');
  const [vendorNote, setVendorNote] = useState('');
  const [phones, setPhones] = useState<string[]>(['']);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);

  const canEdit = role === 'OWNER' || !!featurePermissions?.webVendors || !!featurePermissions?.managerVendors;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['vendors', selectedOutletId],
    queryFn: () => vendorApi.list(selectedOutletId!),
    enabled: !!selectedOutletId,
  });

  const allTypes = data?.data?.types ?? [];
  const types = useMemo(() => filterVendorTypes(allTypes, search), [allTypes, search]);
  const totalContacts = useMemo(
    () => allTypes.reduce((sum, t) => sum + (t.vendors?.length || 0), 0),
    [allTypes]
  );

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['vendors', selectedOutletId] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOutletId) throw new Error('Select an outlet');
      if (modalMode === 'type-create') {
        const resolved = resolveTypeIconAndName(typeName, typeIcon);
        if (!resolved.name) throw new Error('Pick an icon or enter a type name');
        const res = await vendorApi.createType({
          name: resolved.name,
          outletId: selectedOutletId,
          iconKey: resolved.iconKey,
        });
        return { next: 'contact-create' as const, type: res.data?.type as VendorType };
      }
      if (modalMode === 'type-edit' && activeType) {
        const resolved = resolveTypeIconAndName(typeName, typeIcon);
        if (!resolved.name) throw new Error('Type name is required');
        await vendorApi.updateType(activeType._id, {
          name: resolved.name,
          iconKey: resolved.iconKey,
        });
        return { next: 'close' as const };
      }
      if (modalMode === 'contact-create' && activeType) {
        const normalized = normalizePhonesForSave(phones);
        if (!vendorName.trim()) throw new Error('Vendor name is required');
        if (!normalized.length) throw new Error('Add at least one valid 10-digit phone number');
        await vendorApi.createContact({
          vendorTypeId: activeType._id,
          name: vendorName.trim(),
          phones: normalized,
          note: vendorNote.trim() || undefined,
        });
        return { next: 'close' as const };
      }
      if (modalMode === 'contact-edit' && activeContact) {
        const normalized = normalizePhonesForSave(phones);
        if (!vendorName.trim()) throw new Error('Vendor name is required');
        if (!normalized.length) throw new Error('Add at least one valid 10-digit phone number');
        await vendorApi.updateContact(activeContact._id, {
          name: vendorName.trim(),
          phones: normalized,
          note: vendorNote.trim() || null,
        });
        return { next: 'close' as const };
      }
      return { next: 'close' as const };
    },
    onSuccess: async (result) => {
      await invalidate();
      if (result?.next === 'contact-create' && result.type) {
        setActiveType({ ...result.type, vendors: [] });
        setVendorName('');
        setVendorNote('');
        setPhones(['']);
        setModalMode('contact-create');
        return;
      }
      setModalMode(null);
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: (id: string) => vendorApi.deleteType(id),
    onSuccess: async () => {
      setDeleteTarget(null);
      setModalMode(null);
      await invalidate();
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id: string) => vendorApi.deleteContact(id),
    onSuccess: async () => {
      setDeleteTarget(null);
      await invalidate();
    },
  });

  const requestDeleteType = (type: VendorType) => {
    setDeleteTarget({ kind: 'type', id: type._id, name: type.name });
  };

  const requestDeleteContact = (contact: VendorContact) => {
    setDeleteTarget({ kind: 'contact', id: contact._id, name: contact.name });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'type') {
      deleteTypeMutation.mutate(deleteTarget.id);
      return;
    }
    deleteContactMutation.mutate(deleteTarget.id);
  };

  const openTypeCreate = () => {
    setTypeName('');
    setTypeIcon('construct');
    setActiveType(null);
    setModalMode('type-create');
  };

  const openTypeEdit = (type: VendorType) => {
    setActiveType(type);
    setTypeName(type.name);
    setTypeIcon(type.iconKey || 'construct');
    setModalMode('type-edit');
  };

  const openContactCreate = (type: VendorType) => {
    setActiveType(type);
    setActiveContact(null);
    setVendorName('');
    setVendorNote('');
    setPhones(['']);
    setModalMode('contact-create');
  };

  const openContactEdit = (type: VendorType, contact: VendorContact) => {
    setActiveType(type);
    setActiveContact(contact);
    setVendorName(contact.name);
    setVendorNote(contact.note || '');
    setPhones(contact.phones?.length ? contact.phones.map(phoneFieldFromStored) : ['']);
    setModalMode('contact-edit');
  };

  if (!selectedOutletId) {
    return <div className="p-6 text-amber-600">Select an outlet first.</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Phone className="h-5 w-5" />
            </span>
            Vendors
          </h1>
          <p className="text-gray-500 mt-2 max-w-xl">
            Emergency contacts by category — plumbers, electricians, and more. Staff can call or WhatsApp from the mobile app.
          </p>
        </div>
        {canEdit && (
          <div className="flex shrink-0 flex-row flex-wrap items-center justify-start gap-2 sm:justify-end">
            {totalContacts > 0 ? (
              <button
                type="button"
                onClick={() => setShowCopyModal(true)}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-sm hover:bg-emerald-50"
              >
                <Copy className="h-4 w-4 shrink-0" />
                <span>Copy to outlet</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={openTypeCreate}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Add vendor type</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700/80">Types</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{allTypes.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contacts</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalContacts}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Access</p>
          <p className="text-sm font-semibold text-slate-800 mt-2">{canEdit ? 'Manage' : 'View only'}</p>
        </div>
      </div>

      <ListSearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search plumber, vendor name, phone…"
        className="mb-5"
      />

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : allTypes.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl bg-white">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Phone className="h-7 w-7" />
          </div>
          <p className="text-gray-900 font-semibold">No vendors yet</p>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            {canEdit
              ? 'Create categories like Plumber or Electrician, then add vendor names with up to 5 phone numbers each.'
              : 'No vendor directory has been set up for this outlet.'}
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={openTypeCreate}
              className="mt-5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add vendor type
            </button>
          )}
        </div>
      ) : types.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl bg-white">
          <p className="text-gray-900 font-semibold">No matches</p>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            Try another vendor type, name, or phone number.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {isFetching && !isLoading && (
            <p className="text-xs text-emerald-700 font-medium">Refreshing…</p>
          )}
          {types.map((type) => {
            const meta = iconMeta(type.iconKey);
            const Icon = meta.Icon;
            const isCollapsed = !!collapsed[type._id];
            return (
              <section key={type._id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50/80 border-b border-slate-100">
                  <button
                    type="button"
                    className="flex flex-1 items-center gap-3 text-left min-w-0"
                    onClick={() => setCollapsed((c) => ({ ...c, [type._id]: !c[type._id] }))}
                  >
                    <span
                      className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: meta.bg, color: meta.fg }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-gray-900 truncate">{type.name}</span>
                      <span className="block text-xs text-gray-500 mt-0.5">
                        {type.vendors?.length || 0} vendor{(type.vendors?.length || 0) === 1 ? '' : 's'}
                      </span>
                    </span>
                    {isCollapsed ? (
                      <ChevronDown className="h-5 w-5 text-slate-400 ml-auto shrink-0" />
                    ) : (
                      <ChevronUp className="h-5 w-5 text-slate-400 ml-auto shrink-0" />
                    )}
                  </button>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        title="Add vendor"
                        onClick={() => openContactCreate(type)}
                        className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-700"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Edit type"
                        onClick={() => openTypeEdit(type)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {!isCollapsed && (
                  <div className="divide-y divide-slate-100">
                    {(type.vendors?.length || 0) === 0 ? (
                      <div className="px-4 py-6 text-sm text-slate-500">
                        No vendors in this category.
                        {canEdit && (
                          <button
                            type="button"
                            className="ml-2 text-emerald-700 font-semibold hover:underline"
                            onClick={() => openContactCreate(type)}
                          >
                            Add first vendor
                          </button>
                        )}
                      </div>
                    ) : (
                      type.vendors.map((vendor) => (
                        <div key={vendor._id} className="px-4 py-4">
                          <div className="flex items-start gap-3">
                            <span
                              className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                              style={{ backgroundColor: meta.bg, color: meta.fg }}
                            >
                              {initials(vendor.name)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-semibold text-gray-900">{vendor.name}</p>
                                  {vendor.note && (
                                    <p className="text-sm text-gray-500 mt-1">{vendor.note}</p>
                                  )}
                                </div>
                                {canEdit && (
                                  <div className="flex gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => openContactEdit(type, vendor)}
                                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => requestDeleteContact(vendor)}
                                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="mt-3 space-y-2">
                                {(vendor.phones || []).map((phone, idx) => (
                                  <div
                                    key={`${vendor._id}-${idx}`}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2"
                                  >
                                    <span className="text-sm font-medium text-slate-800">{formatPhone(phone)}</span>
                                    <div className="flex gap-2">
                                      <a
                                        href={telHref(phone)}
                                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                                      >
                                        <Phone className="h-3.5 w-3.5" /> Call
                                      </a>
                                      <a
                                        href={waHref(phone)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                                      >
                                        WhatsApp
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {modalMode && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col relative">
            <button
              type="button"
              onClick={() => setModalMode(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="p-6 overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4 pr-8">
                {modalMode === 'type-create' && 'New vendor type'}
                {modalMode === 'type-edit' && 'Edit vendor type'}
                {modalMode === 'contact-create' && `Add vendor · ${activeType?.name || ''}`}
                {modalMode === 'contact-edit' && 'Edit vendor'}
              </h2>

              {(modalMode === 'type-create' || modalMode === 'type-edit') && (
                <>
                  <p className="text-sm text-gray-500 mb-3">Tap an icon to set the vendor type name</p>
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {ICON_OPTIONS.map((opt) => {
                      const O = opt.Icon;
                      const selected = typeIcon === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            setTypeIcon(opt.key);
                            setTypeName(opt.label);
                          }}
                          className={`rounded-xl p-2 border text-center ${selected ? 'border-emerald-500 bg-emerald-50' : 'border-transparent hover:bg-slate-50'}`}
                        >
                          <span
                            className="mx-auto mb-1 flex h-9 w-9 items-center justify-center rounded-lg"
                            style={{ backgroundColor: opt.bg, color: opt.fg }}
                          >
                            <O className="h-4 w-4" />
                          </span>
                          <span className="block text-[10px] font-medium text-slate-600">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type name</label>
                  <input
                    value={typeName}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTypeName(value);
                      setTypeIcon(iconKeyForTypeName(value) ?? 'construct');
                    }}
                    placeholder="Custom name uses generic icon"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 mb-3"
                  />
                  {modalMode === 'type-edit' && activeType && (
                    <button
                      type="button"
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100"
                      onClick={() => requestDeleteType(activeType)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete vendor type
                    </button>
                  )}
                </>
              )}

              {(modalMode === 'contact-create' || modalMode === 'contact-edit') && (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor / company name</label>
                  <input
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="e.g. Raju Plumbing"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 mb-4"
                  />
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone numbers (up to 5)</label>
                  <div className="space-y-2 mb-4">
                    {phones.map((phone, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <div className="flex flex-1 overflow-hidden rounded-xl border border-gray-200 bg-slate-50">
                          <span className="flex items-center border-r border-gray-200 bg-slate-100 px-3 text-sm font-semibold text-slate-600">
                            +91
                          </span>
                          <input
                            value={phone}
                            onChange={(e) =>
                              setPhones((prev) =>
                                prev.map((p, i) =>
                                  i === index ? normalizeIndianPhoneInput(e.target.value) : p
                                )
                              )
                            }
                            onPaste={(e) => {
                              e.preventDefault();
                              const text = e.clipboardData.getData('text');
                              setPhones((prev) =>
                                prev.map((p, i) => (i === index ? normalizeIndianPhoneInput(text) : p))
                              );
                            }}
                            inputMode="numeric"
                            maxLength={10}
                            placeholder="9876543210"
                            className="flex-1 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none"
                          />
                        </div>
                        {phones.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setPhones((prev) => prev.filter((_, i) => i !== index))}
                            className="px-3 text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {phones.length < 5 && (
                      <button
                        type="button"
                        onClick={() => setPhones((prev) => [...prev, ''])}
                        className="text-sm text-emerald-700 font-semibold"
                      >
                        + Add another number
                      </button>
                    )}
                  </div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                  <textarea
                    value={vendorNote}
                    onChange={(e) => setVendorNote(e.target.value)}
                    placeholder="Only Mon–Sat, ask for Suresh…"
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200"
                  />
                </>
              )}

              {saveMutation.isError && (
                <p className="text-red-600 text-sm mt-3">{getApiErrorMessage(saveMutation.error)}</p>
              )}
            </div>
            <div className="border-t border-slate-100 p-4 flex gap-3">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-medium disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Saving…' : modalMode === 'type-create' ? 'Continue' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              {deleteTarget.kind === 'type' ? 'Delete vendor type?' : 'Delete vendor?'}
            </h3>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">
              {deleteTarget.kind === 'type' ? (
                <>
                  Are you sure you want to delete the vendor type{' '}
                  <span className="font-semibold text-gray-900">&quot;{deleteTarget.name}&quot;</span>? All
                  vendors inside it will also be removed.
                </>
              ) : (
                <>
                  Are you sure you want to delete{' '}
                  <span className="font-semibold text-gray-900">&quot;{deleteTarget.name}&quot;</span>?
                </>
              )}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteTypeMutation.isPending || deleteContactMutation.isPending}
                onClick={confirmDelete}
                className="flex-1 rounded-xl bg-red-600 py-2.5 font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <CopyVendorsToOutletModal
        open={showCopyModal}
        sourceOutletId={selectedOutletId}
        types={allTypes}
        onClose={() => setShowCopyModal(false)}
        onSuccess={invalidate}
      />
    </div>
  );
}
