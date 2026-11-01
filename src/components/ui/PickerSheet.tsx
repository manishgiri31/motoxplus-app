import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

import { GroupedList } from './GroupedList';
import { SearchBar } from './SearchBar';
import { Sheet } from './Sheet';

export interface PickerSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: readonly string[];
  /** Currently selected option; shown with a check. */
  value: string;
  onSelect: (value: string) => void;
  searchPlaceholder?: string;
  /** Offer the typed text as an option when it is not in the list. */
  allowCustom?: boolean;
  /** Shown above the list when there is nothing to choose from yet. */
  emptyHint?: string;
}

// Searchable single-choice list in a bottom sheet. Opens at the tall (90%)
// detent so the list has room, and can be dragged down to the 50% one.
export function PickerSheet({
  visible,
  onClose,
  title,
  options,
  value,
  onSelect,
  searchPlaceholder = 'Search',
  allowCustom = false,
  emptyHint = 'No matches',
}: PickerSheetProps) {
  const [query, setQuery] = useState('');
  const keyboardHeight = useKeyboardHeight(visible);

  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const trimmed = query.trim();
  const matches = useMemo(() => {
    const needle = trimmed.toLowerCase();
    return needle ? options.filter((o) => o.toLowerCase().includes(needle)) : options;
  }, [options, trimmed]);
  const offerCustom = allowCustom && !!trimmed && !options.some((o) => o.toLowerCase() === trimmed.toLowerCase());

  const choose = (next: string) => {
    HapticService.light();
    Keyboard.dismiss();
    onSelect(next);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={title} initialDetent={1}>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder={searchPlaceholder}
        autoCapitalize="words"
        autoCorrect={false}
      />

      {offerCustom || matches.length > 0 ? (
        <GroupedList>
          {offerCustom ? (
            <OptionRow key="__custom" label={`Use “${trimmed}”`} icon="plus-circle" onPress={() => choose(trimmed)} />
          ) : null}
          {matches.map((option) => (
            <OptionRow key={option} label={option} selected={option === value} onPress={() => choose(option)} />
          ))}
        </GroupedList>
      ) : (
        <Text style={styles.empty} maxFontSizeMultiplier={1.2}>
          {emptyHint}
        </Text>
      )}

      {/* The iOS keyboard overlays the sheet; leave room so the last rows can scroll clear of it. */}
      {keyboardHeight > 0 && <View style={{ height: keyboardHeight }} />}
    </Sheet>
  );
}

interface OptionRowProps {
  label: string;
  selected?: boolean;
  icon?: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
}

function OptionRow({ label, selected = false, icon, onPress }: OptionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {!!icon && <Feather name={icon} size={20} color={colors.link} />}
      <Text style={[styles.label, !!icon && { color: colors.link }]} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
      {/* Selected state: the one place besides primary buttons the accent shows up. */}
      {selected && <Feather name="check" size={20} color={colors.accent} />}
    </Pressable>
  );
}

function useKeyboardHeight(active: boolean) {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // Android shrinks the window for the keyboard on its own; only iOS needs the spacer.
    if (!active || Platform.OS !== 'ios') {
      setHeight(0);
      return;
    }
    const show = Keyboard.addListener('keyboardWillShow', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [active]);

  return height;
}

const styles = StyleSheet.create({
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  pressed: { opacity: 0.6 },
  label: { ...font(400), flex: 1, fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink },
  empty: { ...font(400), textAlign: 'center', paddingVertical: 24, fontSize: 17, lineHeight: 22, color: colors.ink2 },
});
