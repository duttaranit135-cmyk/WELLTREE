import api from '../api';
import type {
  DiabetesPredictionRequest,
  DiabetesPredictionResponse,
  HypertensionPredictionRequest,
  HypertensionPredictionResponse,
  SymptomCheckerRequest,
  SymptomCheckerResponse,
  PredictionTrendsResponse,
  BiometricPrefill,
} from '../../types';

export const predictionService = {
  // Diabetes
  getDiabetesMetadata: async (): Promise<any> => {
    const res = await api.get('/predictions/diabetes/metadata');
    return res.data;
  },

  predictDiabetes: async (data: DiabetesPredictionRequest): Promise<DiabetesPredictionResponse> => {
    const res = await api.post<DiabetesPredictionResponse>('/predictions/diabetes', data);
    return res.data;
  },

  // Hypertension
  getHypertensionMetadata: async (): Promise<any> => {
    const res = await api.get('/predictions/hypertension/metadata');
    return res.data;
  },

  predictHypertension: async (data: HypertensionPredictionRequest): Promise<HypertensionPredictionResponse> => {
    const res = await api.post<HypertensionPredictionResponse>('/predictions/hypertension', data);
    return res.data;
  },

  // Symptoms & Multi-Disease
  getSymptoms: async (): Promise<{ total_symptoms: number; symptoms: string[] }> => {
    const res = await api.get('/predictions/symptoms');
    return res.data;
  },

  getDiseases: async (): Promise<{ total_diseases: number; diseases: Record<string, { description: string; precautions: string[] }> }> => {
    const res = await api.get('/predictions/diseases');
    return res.data;
  },

  checkSymptoms: async (data: SymptomCheckerRequest): Promise<SymptomCheckerResponse> => {
    const res = await api.post<SymptomCheckerResponse>('/predictions/symptom-checker', data);
    return res.data;
  },

  // Trends & History
  getTrends: async (familyMemberId?: string, predictionType?: string): Promise<PredictionTrendsResponse> => {
    const params: Record<string, any> = {};
    if (familyMemberId) params.family_member_id = familyMemberId;
    if (predictionType) params.prediction_type = predictionType;
    const res = await api.get<PredictionTrendsResponse>('/predictions/trends', { params });
    return res.data;
  },

  getHistory: async (familyMemberId?: string, limit = 50): Promise<any[]> => {
    const params: Record<string, any> = { limit };
    if (familyMemberId) params.family_member_id = familyMemberId;
    const res = await api.get('/predictions/history', { params });
    return res.data;
  },

  deleteHistoryRecord: async (recordId: string): Promise<void> => {
    await api.delete(`/predictions/history/${recordId}`);
  },

  // Prefill
  getPrefill: async (familyMemberId: string): Promise<BiometricPrefill> => {
    const res = await api.get<BiometricPrefill>(`/predictions/prefill/${familyMemberId}`);
    return res.data;
  },
};
