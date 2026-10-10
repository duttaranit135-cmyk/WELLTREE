import api from '../api';
import type { Profile, ProfileUpdateInput } from '../../types';

export const getMyProfile = async (): Promise<Profile> => {
  const response = await api.get<Profile>('/profiles/me');
  return response.data;
};

export const updateMyProfile = async (
  data: ProfileUpdateInput
): Promise<Profile> => {
  const response = await api.put<Profile>('/profiles/me', data);
  return response.data;
};
