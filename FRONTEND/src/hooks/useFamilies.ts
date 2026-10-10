import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  getFamilies,
  getFamily,
  createFamily,
  addFamilyMember,
  removeFamilyMember,
} from '../lib/services/familyService';
import type {
  Family,
  FamilyCreateInput,
  FamilyMember,
  FamilyMemberAddInput,
} from '../types';

export const useFamilies = () => {
  return useQuery<Family[], Error>({
    queryKey: ['families'],
    queryFn: getFamilies,
  });
};

export const useFamily = (familyId: string) => {
  return useQuery<Family, Error>({
    queryKey: ['families', familyId],
    queryFn: () => getFamily(familyId),
    enabled: Boolean(familyId),
  });
};

export const useCreateFamily = () => {
  const queryClient = useQueryClient();

  return useMutation<Family, Error, FamilyCreateInput>({
    mutationFn: createFamily,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      toast.success('Family created successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create family.');
    },
  });
};

export const useAddFamilyMember = (familyId: string) => {
  const queryClient = useQueryClient();

  return useMutation<FamilyMember, Error, FamilyMemberAddInput>({
    mutationFn: (data: FamilyMemberAddInput) => addFamilyMember(familyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId] });
      queryClient.invalidateQueries({ queryKey: ['families'] });
      toast.success('Member added successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add member to family.');
    },
  });
};

export const useRemoveFamilyMember = (familyId: string) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (userId: string) => removeFamilyMember(familyId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId] });
      queryClient.invalidateQueries({ queryKey: ['families'] });
      toast.success('Member removed successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove member.');
    },
  });
};
