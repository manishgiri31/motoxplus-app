import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/errors';
import { useDealerDocuments, useUploadDocument } from '@/api/hooks/useDocuments';
import { documentService, type UploadableFile } from '@/api/services/documentService';
import type { DealerDocument, DealerDocumentType } from '@/api/types';
import { Badge, Button, Card, ErrorState, Reveal, Skeleton, Toast } from '@/src/components/ui';
import { colors, fonts } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

const DOCUMENT_TYPES: { type: DealerDocumentType; label: string; hint: string }[] = [
  { type: 'GST_CERTIFICATE', label: 'GST certificate', hint: 'Your GST registration certificate' },
  { type: 'PAN_CARD', label: 'PAN card', hint: 'PAN of the business or owner' },
  { type: 'BUSINESS_REGISTRATION', label: 'Business registration', hint: 'Shop act, trade licence or incorporation' },
  { type: 'SHOP_IMAGE', label: 'Shop photo', hint: 'A clear photo of your storefront' },
  { type: 'OTHER', label: 'Other document', hint: 'Anything else that supports your application' },
];

// Mirrors the backend's limits (POST /api/upload/dealer-document): PDF/JPG/PNG, 10 MB.
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function extensionFor(mime: string) {
  return mime === 'application/pdf' ? 'pdf' : mime === 'image/png' ? 'png' : 'jpg';
}

export default function DocumentsScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useDealerDocuments();
  const upload = useUploadDocument();
  const [uploadingType, setUploadingType] = useState<DealerDocumentType | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const byType = new Map<DealerDocumentType, DealerDocument>((data?.documents ?? []).map((d) => [d.documentType, d]));
  const uploadedCount = DOCUMENT_TYPES.filter((d) => byType.has(d.type)).length;

  const send = (type: DealerDocumentType, file: UploadableFile, size: number | undefined) => {
    if (!ACCEPTED_MIME.includes(file.mimeType)) {
      Alert.alert('Unsupported file', 'Please choose a PDF, JPG or PNG file.');
      return;
    }
    if (size != null && size > MAX_BYTES) {
      Alert.alert('File too large', `That file is ${formatSize(size)}. The maximum is 10 MB.`);
      return;
    }
    setUploadingType(type);
    upload.mutate(
      { documentType: type, file },
      {
        onSuccess: () => {
          HapticService.light();
          setToast('Document uploaded');
        },
        onError: (err) => {
          HapticService.error();
          Alert.alert('Upload failed', getErrorMessage(err, "We couldn't upload that file. Please try again."));
        },
        onSettled: () => setUploadingType(null),
      }
    );
  };

  const pickPhoto = async (type: DealerDocumentType) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    send(
      type,
      { uri: asset.uri, mimeType, name: asset.fileName ?? `${type.toLowerCase()}.${extensionFor(mimeType)}` },
      asset.fileSize
    );
  };

  const pickFile = async (type: DealerDocumentType) => {
    const result = await DocumentPicker.getDocumentAsync({ type: ACCEPTED_MIME, copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    send(
      type,
      {
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'application/pdf',
        name: asset.name || `${type.toLowerCase()}.pdf`,
      },
      asset.size
    );
  };

  const choose = (type: DealerDocumentType, label: string) => {
    Alert.alert(`Upload ${label.toLowerCase()}`, 'PDF, JPG or PNG, up to 10 MB.', [
      { text: 'Photo library', onPress: () => pickPhoto(type) },
      { text: 'Files', onPress: () => pickFile(type) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const view = async (doc: DealerDocument) => {
    setViewingId(doc.id);
    try {
      // Documents are private: fetch a 15-minute signed link right when viewing.
      const { signedUrl } = await documentService.signedUrl(doc.id);
      await WebBrowser.openBrowserAsync(signedUrl);
    } catch (err) {
      Alert.alert("Couldn't open document", getErrorMessage(err, 'Please try again.'));
    } finally {
      setViewingId(null);
    }
  };

  if (isError) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <ErrorState error={error} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.link} colors={[colors.link]} />}
      >
        <View style={styles.header}>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Documents
          </Text>
          <Text style={styles.subtitle}>
            Upload your verification documents to speed up order approvals. Files are stored securely and only the MotoXPlus
            team can see them.
          </Text>
        </View>

        <Card style={styles.summary}>
          <Feather name="shield" size={20} color={colors.muted} />
          <Text style={styles.summaryText}>
            {isLoading ? 'Checking your documents…' : `${uploadedCount} of ${DOCUMENT_TYPES.length} documents uploaded`}
          </Text>
          {!isLoading && uploadedCount === DOCUMENT_TYPES.length && <Badge label="All complete" variant="success" />}
        </Card>

        {isLoading
          ? DOCUMENT_TYPES.map((d) => <Skeleton key={d.type} height={132} radius={18} />)
          : DOCUMENT_TYPES.map((d, i) => {
              const existing = byType.get(d.type);
              const busy = uploadingType === d.type;
              return (
                <Reveal key={d.type} delay={i * 40}>
                  <Card style={styles.docCard}>
                    <View style={styles.docHeader}>
                      <View style={styles.docTitles}>
                        <Text style={styles.docTitle}>{d.label}</Text>
                        <Text style={styles.docHint}>{d.hint}</Text>
                      </View>
                      <Badge label={existing ? 'Uploaded' : 'Not uploaded'} variant={existing ? 'success' : 'neutral'} />
                    </View>
                    {existing && (
                      <Text style={styles.docMeta} numberOfLines={1}>
                        {existing.fileName} · {formatSize(existing.fileSize)} ·{' '}
                        {new Date(existing.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    )}
                    <View style={styles.docActions}>
                      <Button
                        label={existing ? 'Replace' : 'Upload'}
                        variant={existing ? 'ghost' : 'brand'}
                        loading={busy}
                        disabled={uploadingType !== null && !busy}
                        onPress={() => choose(d.type, d.label)}
                        style={styles.actionButton}
                      />
                      {existing && (
                        <Button
                          label="View"
                          variant="ghost"
                          loading={viewingId === existing.id}
                          onPress={() => view(existing)}
                          style={styles.actionButton}
                        />
                      )}
                    </View>
                  </Card>
                </Reveal>
              );
            })}
      </ScrollView>
      {toast && <Toast message={toast} onHide={() => setToast(null)} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  header: { gap: 6, paddingTop: 8 },
  title: { fontFamily: fonts.display.extraBold, fontSize: 28, lineHeight: 31, letterSpacing: -0.42, color: colors.ink },
  subtitle: { fontFamily: fonts.body.regular, fontSize: 14, lineHeight: 20, letterSpacing: -0.224, color: colors.muted },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryText: { flex: 1, fontFamily: fonts.body.medium, fontSize: 14, letterSpacing: -0.224, color: colors.ink },
  docCard: { gap: 12 },
  docHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  docTitles: { flex: 1, gap: 2 },
  docTitle: { fontFamily: fonts.display.bold, fontSize: 17, lineHeight: 19, letterSpacing: -0.374, color: colors.ink },
  docHint: { fontFamily: fonts.body.regular, fontSize: 14, letterSpacing: -0.224, color: colors.muted },
  docMeta: { fontFamily: fonts.body.regular, fontSize: 12, letterSpacing: -0.12, color: colors.muted },
  docActions: { flexDirection: 'row', gap: 12 },
  actionButton: { flex: 1 },
});
