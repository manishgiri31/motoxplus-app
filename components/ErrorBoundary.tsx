import { Component, type ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/Button';
import { colors, space, textStyles } from '@/src/theme';
import { reportError } from '@/utils/crashReporting';
import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Only a class component can implement getDerivedStateFromError/componentDidCatch —
// this is the one place in the app that's allowed to be a class for that reason.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    logger.error('Unhandled render error', {
      message: error.message,
      componentStack: info.componentStack ?? undefined,
    });
    // Caught render errors never reach the global handler, so report them here.
    reportError(error, { componentStack: info.componentStack ?? undefined });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <SafeAreaView style={styles.root}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            The app hit an unexpected error. Try again, or restart the app if it keeps happening.
          </Text>
          <Button label="Try again" onPress={this.reset} />
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xxl,
    gap: space.md,
  },
  title: { ...textStyles.headline, fontSize: 18, textAlign: 'center' },
  body: { ...textStyles.callout, color: colors.muted, textAlign: 'center' },
});
