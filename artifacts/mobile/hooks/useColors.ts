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
 */
export function useColors() {
  const scheme = useColorScheme();
  const palette: typeof colors.light =
    scheme === 'dark' && 'dark' in colors ? colors.dark : colors.light;

  // ⚡ Bolt Optimization: Memoize the constructed palette object.
  // Custom hooks (like useColors) returning a newly constructed object ({ ...palette, radius })
  // on every single call cause downstream hooks (like useMemo dependency arrays for StyleSheets)
  // or components wrapped in React.memo/React.useMemo to fail their shallow/referential equality checks,
  // triggering expensive re-render cascades. Wrapping the returned object in useMemo based on
  // the stable underlying palette reference fully solves this performance bottleneck.
  return useMemo(() => ({ ...palette, radius: colors.radius }), [palette]);
}
