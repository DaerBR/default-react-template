import { resolveThemeStyles } from './themeStyles.ts';

import type { ResolvedThemeStyles, ThemeStyles } from './themeStyles.ts';

/**
 * Wrap a style object literal in this so its properties are checked against `CSSObject`
 * (giving TypeScript the narrow literal types it needs for enum-like CSS properties like
 * `position`/`display`/`flexDirection`) without widening to plain `CSSObject` or needing
 * per-property `as const`.
 *
 * It also resolves theme tokens (strings that aren't tokens are left as written):
 * - spacing properties (margin, padding, gap and their longhands) take `theme.spacing` steps:
 *   `marginTop: 3` → `'12px'`, `padding: [2, 3]` → `'8px 12px'`;
 * - color properties (color, backgroundColor, borderColor, …) take `theme.colors` tokens:
 *   `color: 'error.main'` → `theme.colors.error.main`;
 * - `boxShadow` takes `theme.boxShadows` tokens: `boxShadow: 'xs'` → `theme.boxShadows.xs`.
 */
export const defineStyles = <TStyles extends ThemeStyles>(styles: TStyles): ResolvedThemeStyles<TStyles> =>
	resolveThemeStyles(styles);
