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
import { DocumentSourceSheet } from '@/src/components/account/DocumentSourceSheet';
import { Button } from '@/src/components/ui/Button';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { GroupedList } from '@/src/components/ui/GroupedList';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { Toast } from '@/src/components/ui/Toast';
import { colors, font, layout, motion, screenPaddingX, sectionGap, space, textStyles } from '@/src/theme';
import { compressImage } from '@/utils/compressImage';
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

// One document: title and Uploaded / Missing badge, a file or hint line, and
// the row's actions as plain link buttons (44pt targets).
function DocumentRow({
  label,
  hint,
  existing,
  uploading,
  viewing,
  locked,
  onUpload,
  onView,
}: {
  label: string;
  hint: string;
  existing?: DealerDocument;
  uploading: boolean;
  viewing: boolean;
  locked: boolean;
  onUpload: () => void;
  onView: () => void;
}) {
  const detail = existing
    ? `${existing.fileName} · ${formatSize(existing.fileSize)} · ${new Date(existing.uploadedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })}`
    : hint;

  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowTitle} maxFontSizeMultiplier={layout.maxFontScale}>
          {label}
        </Text>
        <StatusBadge label={existing ? 'Uploaded' : 'Missing'} tone={existing ? 'success' : 'warning'} />
      </View>
      <Text style={styles.rowDetail} numberOfLines={2} maxFontSizeMultiplier={layout.maxFontScale}>
        {detail}
      </Text>
      <View style={styles.actions}>
        <Button
          label={existing ? 'Replace' : 'Upload'}
          accessibilityLabel={`${existing ? 'Replace' : 'Upload'} ${label}`}
          variant="link"
          hideChevron
          loading={uploading}
          disabled={locked}
          onPress={onUpload}
        />
        {existing && (
          <Button
            label="View"
            accessibilityLabel={`View ${label}`}
            variant="link"
            hideChevron
            loading={viewing}
            onPress={onView}
          />
        )}
      </View>
    </View>
  );
}

// Same shape as DocumentRow so nothing jumps when the data arrives.
function DocumentRowSkeleton() {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Skeleton height={22} width="45%" />
        <Skeleton height={24} width={72} radius={12} />
      </View>
      <Skeleton height={20} width="70%" />
      <View style={styles.actions}>
        <Skeleton height={22} width={64} />
      </View>
    </View>
  );
}

export default function DocumentsScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useDealerDocuments();
  const upload = useUploadDocument();
  const [uploadingType, setUploadingType] = useState<DealerDocumentType | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Which document the source sheet is for. `target` outlives `sheetOpen` so
  // the sheet's title doesn't blank while it animates out.
  const [target, setTarget] = useState<{ type: DealerDocumentType; label: string } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const byType = new Map<DealerDocumentType, DealerDocument>((data?.documents ?? []).map((d) => [d.documentType, d]));
  const uploadedCount = DOCUMENT_TYPES.filter((d) => byType.has(d.type)).length;

  const send = (type: DealerDocumentType, file: UploadableFile, size: number | undefined) => {
    if (!ACCEPTED_MIME.includes(file.mimeType)) {
      Alert.alert('Unsupported file', 'Please choose a PDF, JPG or PNG file.');
      setUploadingType(null);
      return;
    }
    if (size != null && size > MAX_BYTES) {
      Alert.alert('File too large', `That file is ${formatSize(size)}. The maximum is 10 MB.`);
      setUploadingType(null);
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
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled) return;
    const asset = result.assets[0];
    // Shrink phone photos (often 3-8 MB) before upload; see utils/compressImage.ts.
    setUploadingType(type);
    const small = await compressImage(asset.uri, asset.width, asset.height);
    if (small) {
      send(type, { uri: small.uri, mimeType: small.mimeType, name: `${type.toLowerCase()}.jpg` }, undefined);
      return;
    }
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
    const mimeType = asset.mimeType ?? 'application/pdf';
    if (mimeType.startsWith('image/')) {
      setUploadingType(type);
      const small = await compressImage(asset.uri);
      if (small) {
        send(type, { uri: small.uri, mimeType: small.mimeType, name: `${type.toLowerCase()}.jpg` }, undefined);
        return;
      }
    }
    send(type, { uri: asset.uri, mimeType, name: asset.name || `${type.toLowerCase()}.pdf` }, asset.size);
  };

  const choose = (type: DealerDocumentType, label: string) => {
    setTarget({ type, label });
    setSheetOpen(true);
  };

  // iOS can't present the system picker while the sheet's Modal is still
  // dismissing, so wait out its closing animation first.
  const pickFrom = (picker: (type: DealerDocumentType) => Promise<void>) => {
    if (!target) return;
    const { type } = target;
    setSheetOpen(false);
    setTimeout(() => picker(type), motion.duration.slow + 80);
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
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.link} colors={[colors.link]} />}
      >
        <View style={styles.intro}>
          <Text style={styles.introText} maxFontSizeMultiplier={layout.maxFontScale}>
            Upload your verification documents to speed up order approvals. Files are stored securely and only the MotoXPlus
            team can see them.
          </Text>
          <View style={styles.summary} accessibilityLiveRegion="polite">
            <Text style={styles.summaryText} maxFontSizeMultiplier={layout.maxFontScale}>
              {isLoading ? 'Checking your documents…' : `${uploadedCount} of ${DOCUMENT_TYPES.length} documents uploaded`}
            </Text>
            {!isLoading && uploadedCount === DOCUMENT_TYPES.length && <StatusBadge label="All complete" tone="success" />}
          </View>
        </View>

        <GroupedList>
          {isLoading
            ? DOCUMENT_TYPES.map((d) => <DocumentRowSkeleton key={d.type} />)
            : DOCUMENT_TYPES.map((d) => {
                const existing = byType.get(d.type);
                const busy = uploadingType === d.type;
                return (
                  <DocumentRow
                    key={d.type}
                    label={d.label}
                    hint={d.hint}
                    existing={existing}
                    uploading={busy}
                    viewing={!!existing && viewingId === existing.id}
                    locked={uploadingType !== null && !busy}
                    onUpload={() => choose(d.type, d.label)}
                    onView={() => existing && view(existing)}
                  />
                );
              })}
        </GroupedList>
      </ScrollView>

      <DocumentSourceSheet
        visible={sheetOpen}
        documentLabel={target?.label ?? ''}
        onClose={() => setSheetOpen(false)}
        onPhotoLibrary={() => pickFrom(pickPhoto)}
        onFiles={() => pickFrom(pickFile)}
      />
      {toast && <Toast message={toast} onHide={() => setToast(null)} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: screenPaddingX, paddingTop: space.xl, paddingBottom: space.x5, gap: sectionGap },
  intro: { gap: space.md },
  introText: { ...textStyles.callout },
  summary: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  summaryText: { ...textStyles.calloutStrong },
  row: {
    minHeight: layout.rowMinHeight,
    paddingHorizontal: layout.rowInset,
    paddingTop: space.md,
    paddingBottom: space.xs,
    gap: space.xs,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  rowTitle: { ...font(400), flex: 1, fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink },
  rowDetail: { ...textStyles.callout },
  // Link buttons carry 8px of horizontal padding; pull the first one back so
  // its text lines up with the title.
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginLeft: -space.sm },
});
