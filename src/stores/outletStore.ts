import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Outlet {
  _id: string;
  name: string;
}

interface OutletStore {
  selectedOutletId: string | null;
  outlets: Outlet[];
  setOutlets: (outlets: Outlet[]) => void;
  setSelectedOutlet: (id: string | null) => void;
  clear: () => void;
}

export const useOutletStore = create<OutletStore>()(
  persist(
    (set) => ({
      selectedOutletId: null,
      outlets: [],
      setOutlets: (outlets) => set((s) => ({
        outlets,
        selectedOutletId: s.selectedOutletId && outlets.some((o) => o._id === s.selectedOutletId)
          ? s.selectedOutletId
          : outlets[0]?._id ?? null,
      })),
      setSelectedOutlet: (id) => set({ selectedOutletId: id }),
      clear: () => set({ selectedOutletId: null, outlets: [] }),
    }),
    { name: 'neoengine-outlet' }
  )
);
