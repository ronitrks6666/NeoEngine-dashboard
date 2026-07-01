import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface SalesLeadPayload {
  name: string;
  phone: string;
  interest: string | string[];
}

export const publicApi = {
  submitSalesLead: async (payload: SalesLeadPayload): Promise<{ success: boolean }> => {
    const { data } = await axios.post(`${API_BASE_URL}/public/sales-lead`, payload);
    return data;
  },
};

export const INTEREST_OPTIONS = [
  'Product Demo',
  'Pricing & Plans',
  'Free Trial',
  'Partnership',
  'General Enquiry',
] as const;

export type InterestOption = (typeof INTEREST_OPTIONS)[number];
