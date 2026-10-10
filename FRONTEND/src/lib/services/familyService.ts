import api from '../api';
import type {
  Family,
  FamilyCreateInput,
  FamilyMember,
  FamilyMemberAddInput,
} from '../../types';

export const getFamilies = async (): Promise<Family[]> => {
  const response = await api.get<Family[]>('/families');
  return response.data;
};

export const getFamily = async (familyId: string): Promise<Family> => {
  const response = await api.get<Family>(`/families/${familyId}`);
  return response.data;
};

export const createFamily = async (
  data: FamilyCreateInput
): Promise<Family> => {
  const response = await api.post<Family>('/families', data);
  return response.data;
};

export const addFamilyMember = async (
  familyId: string,
  data: FamilyMemberAddInput
): Promise<FamilyMember> => {
  const response = await api.post<FamilyMember>(
    `/families/${familyId}/members`,
    data
  );
  return response.data;
};

export const removeFamilyMember = async (
  familyId: string,
  userId: string
): Promise<void> => {
  await api.delete(`/families/${familyId}/members/${userId}`);
};
