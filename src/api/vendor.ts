import { api } from './client';

export type VendorIconKey =
  | 'construct'
  | 'water'
  | 'flash'
  | 'snow'
  | 'flame'
  | 'bug'
  | 'car'
  | 'medical'
  | 'storefront'
  | 'hammer'
  | 'call';

export interface VendorContact {
  _id: string;
  name: string;
  phones: string[];
  note?: string | null;
  vendorTypeId: string;
}

export interface VendorType {
  _id: string;
  name: string;
  iconKey: VendorIconKey;
  vendors: VendorContact[];
}

export const vendorApi = {
  async list(outletId: string) {
    const { data } = await api.get(`/vendor/outlet/${outletId}`);
    return data as { success: boolean; data: { types: VendorType[] } };
  },

  async createType(payload: { name: string; outletId: string; iconKey?: VendorIconKey }) {
    const { data } = await api.post('/vendor/types', payload);
    return data;
  },

  async updateType(typeId: string, payload: Partial<{ name: string; iconKey: VendorIconKey }>) {
    const { data } = await api.put(`/vendor/types/${typeId}`, payload);
    return data;
  },

  async deleteType(typeId: string) {
    const { data } = await api.delete(`/vendor/types/${typeId}`);
    return data;
  },

  async createContact(payload: {
    vendorTypeId: string;
    name: string;
    phones: string[];
    note?: string;
  }) {
    const { data } = await api.post('/vendor/contacts', payload);
    return data;
  },

  async updateContact(
    contactId: string,
    payload: Partial<{ name: string; phones: string[]; note: string | null }>
  ) {
    const { data } = await api.put(`/vendor/contacts/${contactId}`, payload);
    return data;
  },

  async deleteContact(contactId: string) {
    const { data } = await api.delete(`/vendor/contacts/${contactId}`);
    return data;
  },
};
