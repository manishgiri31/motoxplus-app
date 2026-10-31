import { apiClient } from '../client';
import type { DealerDocumentsResponse, DealerDocumentType, SignedUrlResponse } from '../types';

export interface UploadableFile {
  uri: string;
  name: string;
  mimeType: string;
}

// Uploads can take far longer than the 15s default the rest of the API gets.
const UPLOAD_TIMEOUT_MS = 90_000;

export const documentService = {
  list: () => apiClient.get<DealerDocumentsResponse>('/dealer/documents').then((r) => r.data),

  // One document per type per dealer: uploading again replaces the old one.
  upload: (documentType: DealerDocumentType, file: UploadableFile) => {
    const form = new FormData();
    form.append('documentType', documentType);
    // React Native's FormData takes a {uri, name, type} descriptor for files.
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    return apiClient
      .post<{ id: string; key: string; documentType: DealerDocumentType }>('/upload/dealer-document', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: UPLOAD_TIMEOUT_MS,
        transformRequest: (data) => data,
      })
      .then((r) => r.data);
  },

  // Documents are KYC files: the app never receives a permanent URL, only a
  // 15-minute signed link fetched at the moment of viewing.
  signedUrl: (id: string) => apiClient.get<SignedUrlResponse>(`/files/signed/${id}`).then((r) => r.data),
};
