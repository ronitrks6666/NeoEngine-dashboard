import { api } from './client';

export type AssetCategory = 'uniform' | 'device' | 'accommodation' | 'other';
export type AssetStatus = 'active' | 'returned' | 'damaged';

export interface AssetRecord {
  _id: string;
  name: string;
  category: AssetCategory;
  valueInINR: number;
  assignedDate: string;
  status: AssetStatus;
  notes?: string | null;
  assignedTo?: { _id?: string; name?: string; phone?: string } | null;
  assignedBy?: { _id?: string; name?: string; email?: string; phone?: string } | null;
  outletId?: { _id?: string; name?: string } | null;
}

export interface UpsertAssetInput {
  name: string;
  category: AssetCategory;
  valueInINR: number;
  assignedTo: string;
  notes?: string;
}

export const assetsApi = {
  getOwnerAssets: async (params?: {
    employeeId?: string;
    outletId?: string;
    status?: AssetStatus;
    search?: string;
  }): Promise<AssetRecord[]> => {
    const { data } = await api.get<{ success: boolean; data: { assets: AssetRecord[] } }>(
      '/assets/owner',
      { params }
    );
    return data?.data?.assets || [];
  },

  createAsset: async (payload: UpsertAssetInput): Promise<AssetRecord> => {
    const { data } = await api.post<{ success: boolean; data: { asset: AssetRecord } }>(
      '/assets/assign',
      payload
    );
    return data.data.asset;
  },

  updateAsset: async (
    assetId: string,
    payload: Partial<UpsertAssetInput> & { status?: AssetStatus }
  ): Promise<AssetRecord> => {
    const { data } = await api.put<{ success: boolean; data: { asset: AssetRecord } }>(
      `/assets/${assetId}`,
      payload
    );
    return data.data.asset;
  },

  updateAssetStatus: async (
    assetId: string,
    status: AssetStatus,
    notes?: string
  ): Promise<AssetRecord> => {
    const { data } = await api.put<{ success: boolean; data: { asset: AssetRecord } }>(
      `/assets/${assetId}/status`,
      { status, notes }
    );
    return data.data.asset;
  },

  deleteAsset: async (assetId: string): Promise<void> => {
    await api.delete(`/assets/${assetId}`);
  },
};
