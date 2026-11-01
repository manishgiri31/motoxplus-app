import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

// Current software-keyboard height (0 when hidden). Used by sheets, which are
// Modals and so don't resize with the keyboard.
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}
