import { StyleSheet, Text } from 'react-native';

import { GroupedList, ListRow } from '@/src/components/ui/GroupedList';
import { Sheet } from '@/src/components/ui/Sheet';
import { colors, textStyles } from '@/src/theme';

export interface DocumentSourceSheetProps {
  visible: boolean;
  /** e.g. "GST certificate": shown in the sheet title. */
  documentLabel: string;
  onClose: () => void;
  onPhotoLibrary: () => void;
  onFiles: () => void;
}

// "Where is the file?" picker for document uploads: Photo library or Files.
export function DocumentSourceSheet({ visible, documentLabel, onClose, onPhotoLibrary, onFiles }: DocumentSourceSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title={`Upload ${documentLabel.toLowerCase()}`} scrollable>
      <GroupedList>
        <ListRow label="Photo library" icon="image" iconColor={colors.link} onPress={onPhotoLibrary} />
        <ListRow label="Files" icon="folder" iconColor={colors.warning} onPress={onFiles} />
      </GroupedList>
      <Text style={styles.hint} maxFontSizeMultiplier={1.2}>
        PDF, JPG or PNG, up to 10 MB.
      </Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hint: { ...textStyles.callout, color: colors.ink3, textAlign: 'center' },
});
