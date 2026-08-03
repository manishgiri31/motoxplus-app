import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { getErrorMessage } from '@/api/errors';
import { colors, fonts } from '@/src/theme';

import { Button } from './Button';

export interface ErrorStateProps {
  error?: unknown;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ error, message, onRetry }: ErrorStateProps) {
  const text = message ?? getErrorMessage(error, "Couldn't load this. Please try again.");

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Feather name="alert-triangle" size={28} color={colors.red} />
      </View>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{text}</Text>
      {onRetry && <Button label="Try again" variant="ghost" onPress={onRetry} style={styles.action} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontFamily: fonts.display.bold, fontSize: 17, color: colors.ink, textAlign: 'center' },
  message: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.muted, textAlign: 'center' },
  action: { marginTop: 12 },
});
