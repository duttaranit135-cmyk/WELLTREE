import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getMyProfile, updateMyProfile } from '../lib/services/profileService';
import { useAuth } from './useAuth';
import type { Profile, ProfileUpdateInput } from '../types';

export const useProfile = () => {
  const { isAuthenticated } = useAuth();

  return useQuery<Profile, Error>({
    queryKey: ['profile', 'me'],
    queryFn: getMyProfile,
    enabled: isAuthenticated,
    retry: false,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation<Profile, Error, ProfileUpdateInput>({
    mutationFn: updateMyProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      toast.success('Profile updated successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update profile.');
    },
  });
};
