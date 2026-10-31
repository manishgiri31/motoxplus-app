import { createContext, useContext } from 'react';
import { StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout } from '@/src/theme';

// 'light' = white, 'alt' = #f5f5f7, 'dark' = black. Alternating them down a
// page gives it rhythm; cards read the tone (via useSectionTone) so a grey card
// sits on white and a white card sits on grey.
export type SectionTone = 'light' | 'alt' | 'dark';

const SectionToneContext = createContext<SectionTone>('light');

export function useSectionTone(): SectionTone {
  return useContext(SectionToneContext);
}

const background: Record<SectionTone, string> = {
  light: colors.paper,
  alt: colors.card,
  dark: colors.black,
};

export interface SectionProps {
  tone?: SectionTone;
  /** Drop the top padding, for a section that continues directly from the nav / safe area. */
  flushTop?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

// Full-bleed band with responsive vertical padding (48 phone, 80 tablet, 96
// desktop) and a centered content column capped at 1260px.
export function Section({ tone = 'light', flushTop = false, style, children }: SectionProps) {
  const { width } = useWindowDimensions();
  const paddingY =
    width >= layout.breakpoints.desktop
      ? layout.sectionPaddingY.desktop
      : width >= layout.breakpoints.tablet
        ? layout.sectionPaddingY.tablet
        : layout.sectionPaddingY.mobile;

  return (
    <SectionToneContext.Provider value={tone}>
      <View
        style={[
          { backgroundColor: background[tone], paddingTop: flushTop ? 0 : paddingY, paddingBottom: paddingY },
          style,
        ]}
      >
        <View style={styles.column}>{children}</View>
      </View>
    </SectionToneContext.Provider>
  );
}

const styles = StyleSheet.create({
  column: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
});
