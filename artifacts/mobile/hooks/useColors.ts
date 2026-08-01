import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';

/**
 * Returns the design tokens for the current color scheme.
 *
 * The returned object contains all color tokens for the active palette
 * plus scheme-independent values like `radius`.
 *
 * Falls back to the light palette when no dark key is defined in
 * constants/colors.ts (the scaffold ships light-only by default).
 * When a sibling web artifact's dark tokens are synced into a `dark`
 * key, this hook will automatically switch palettes based on the
 * device's appearance setting.
 *
 * ⚡ Bolt Optimization: Wrap returned palette object in React.useMemo.
 * Since palette objects are static references from colors.ts, we use the reference
 * of palette as a dependency. This ensures we return the exact same object reference
 * unless the color scheme changes, avoiding invalidating child React.memo caches and
 * StyleSheet memoization dependencies on high-frequency render updates.
 */
export function useColors() {
  const scheme = useColorScheme();
  const palette: typeof colors.light =
    scheme === 'dark' && 'dark' in colors ? colors.dark : colors.light;

  return useMemo(() => ({
    ...palette,
    radius: colors.radius,
  }), [palette]);
}
