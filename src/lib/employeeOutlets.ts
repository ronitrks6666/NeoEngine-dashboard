import { ownerApi } from '@/api/owner';
import { useOutletStore } from '@/stores/outletStore';

/** Load delegated staff outlets from API (supports multi-outlet metadata). */
export async function syncEmployeeOutletStore(fallback?: {
  outletId?: string;
  outletName?: string;
}) {
  try {
    const outlets = await ownerApi.getOutlets();
    if (outlets.length > 0) {
      useOutletStore.getState().setOutlets(
        outlets.map((o) => ({ _id: String(o._id), name: o.name }))
      );
      return;
    }
  } catch {
    // fall through to single-outlet fallback from login payload
  }

  if (fallback?.outletId) {
    useOutletStore
      .getState()
      .setEmployeeOutlet(fallback.outletId, fallback.outletName || 'My outlet');
  }
}
