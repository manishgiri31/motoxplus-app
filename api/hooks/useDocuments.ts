import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import { documentService, type UploadableFile } from '../services/documentService';
import type { DealerDocumentType } from '../types';

export function useDealerDocuments() {
  return useQuery({
    queryKey: queryKeys.dealer.documents(),
    queryFn: documentService.list,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentType, file }: { documentType: DealerDocumentType; file: UploadableFile }) =>
      documentService.upload(documentType, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.dealer.documents() }),
  });
}
