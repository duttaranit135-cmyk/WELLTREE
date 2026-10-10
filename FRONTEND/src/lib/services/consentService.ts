import api from '../api';
import type {
  Consent,
  ConsentCreateInput,
  ConsentUpdateInput,
} from '../../types';

export const getConsents = async (): Promise<Consent[]> => {
  const response = await api.get<Consent[]>('/consents');
  return response.data;
};

export const createConsent = async (
  data: ConsentCreateInput
): Promise<Consent> => {
  const response = await api.post<Consent>('/consents', data);
  return response.data;
};

export const updateConsent = async (
  consentId: string,
  data: ConsentUpdateInput
): Promise<Consent> => {
  const response = await api.patch<Consent>(`/consents/${consentId}`, data);
  return response.data;
};
