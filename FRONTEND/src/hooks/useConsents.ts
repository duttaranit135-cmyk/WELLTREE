import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  getConsents,
  createConsent,
  updateConsent,
} from '../lib/services/consentService';
import type {
  Consent,
  ConsentCreateInput,
  ConsentUpdateInput,
} from '../types';

export const useConsents = () => {
  return useQuery<Consent[], Error>({
    queryKey: ['consents'],
    queryFn: getConsents,
  });
};

export const useCreateConsent = () => {
  const queryClient = useQueryClient();

  return useMutation<Consent, Error, ConsentCreateInput>({
    mutationFn: createConsent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consents'] });
      toast.success('Consent request sent successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create consent request.');
    },
  });
};

export interface UpdateConsentVariables {
  consentId: string;
  data: ConsentUpdateInput;
}

export const useUpdateConsent = () => {
  const queryClient = useQueryClient();

  return useMutation<Consent, Error, UpdateConsentVariables>({
    mutationFn: ({ consentId, data }: UpdateConsentVariables) =>
      updateConsent(consentId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consents'] });
      if (variables.data.status === 'ACTIVE') {
        toast.success('Consent accepted successfully!');
      } else if (variables.data.status === 'DENIED') {
        toast.success('Consent request denied.');
      } else if (variables.data.status === 'REVOKED') {
        toast.success('Consent revoked successfully.');
      } else {
        toast.success('Consent updated successfully!');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update consent status.');
    },
  });
};
