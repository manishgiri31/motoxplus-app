import { Component, type ReactNode } from 'react';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { logger } from '@/utils/logger';
import { Button } from './ui';

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
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <SafeAreaView className="flex-1 bg-white items-center justify-center px-2xl gap-md">
          <Text className="text-h3 font-semibold text-black text-center">Something went wrong</Text>
          <Text className="text-[14px] text-graytone-500 text-center">
            The app hit an unexpected error. Try again, or restart the app if it keeps happening.
          </Text>
          <Button label="Try again" onPress={this.reset} />
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}
