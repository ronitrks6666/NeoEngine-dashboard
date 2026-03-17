import { api } from './client';

export interface PlacePrediction {
  description: string;
  place_id: string;
  structured_formatting?: { main_text: string; secondary_text?: string };
}

export interface PlaceDetails {
  name: string | null;
  formatted_address: string | null;
  lat: number | null;
  lng: number | null;
  address_components?: unknown[];
}

export const mapsApi = {
  getPlacePredictions: async (input: string): Promise<{ predictions: PlacePrediction[] }> => {
    const { data } = await api.get<{ predictions: PlacePrediction[] }>('/maps/places/autocomplete', {
      params: { input: input.trim() },
    });
    return data;
  },

  getPlaceDetails: async (placeId: string): Promise<PlaceDetails> => {
    const { data } = await api.get<PlaceDetails>('/maps/places/details', {
      params: { place_id: placeId },
    });
    return data;
  },
};
