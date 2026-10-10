import api from '../api';
import type { HealthCheck } from '../../types';

export const checkHealth = async (): Promise<HealthCheck> => {
  const response = await api.get<HealthCheck>('/health');
  return response.data;
};
