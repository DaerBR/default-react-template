import { theme } from './theme.ts';

type ThemeColors = typeof theme.colors;

/** A `theme.colors` path, `'<palette>.<shade>'`: `'error.main'`, `'text.caption'`, `'neutral.borderDefault'`, … */
export type ColorToken = {
	[TPalette in keyof ThemeColors]: `${TPalette}.${keyof ThemeColors[TPalette] & string}`;
}[keyof ThemeColors];

/** Single-value color properties. Composite ones (`border`, `background`, `boxShadow`, …) are left as written. */
export const COLOR_PROPERTIES = [
	'backgroundColor',
	'borderBottomColor',
	'borderColor',
	'borderLeftColor',
	'borderRightColor',
	'borderTopColor',
	'caretColor',
	'color',
	'fill',
	'outlineColor',
	'stroke',
	'textDecorationColor',
] as const;

export type ColorProperty = (typeof COLOR_PROPERTIES)[number];

/** The type of a color property after resolving: tokens become strings, everything else keeps its type. */
export type ResolvedColorValue<TValue> = TValue extends ColorToken ? string : TValue;

const COLOR_TOKEN_VALUES: ReadonlyMap<string, string> = new Map(
	Object.entries(theme.colors).flatMap(([palette, shades]) =>
		Object.entries(shades).map(([shade, value]): [string, string] => [`${palette}.${shade}`, value]),
	),
);

/** Matches strings shaped like a token (`'error.mian'`), to warn about typos in dev. */
const TOKEN_LIKE_PATTERN = new RegExp(`^(${Object.keys(theme.colors).join('|')})\\.[A-Za-z]+$`);

const warnedTokens = new Set<string>();

const warnUnknownToken = (value: string) => {
	if (warnedTokens.has(value)) {
		return;
	}

	warnedTokens.add(value);
	console.warn(`Unknown theme color token "${value}" used — was passed to CSS as written.`);
};

/**
 * Converts a `theme.colors` token to its CSS value, for places outside `defineStyles()`
 * (inline `css` props, React `style` props, react-select configs, template strings).
 * `themeColor('error.main')` → `theme.colors.error.main`.
 */
export const themeColor = (token: ColorToken): string => COLOR_TOKEN_VALUES.get(token) ?? token;

export const resolveColorValue = (value: unknown): unknown => {
	if (typeof value !== 'string') {
		return value;
	}

	const resolved = COLOR_TOKEN_VALUES.get(value);

	if (resolved !== undefined) {
		return resolved;
	}

	if (import.meta.env.DEV && TOKEN_LIKE_PATTERN.test(value)) {
		warnUnknownToken(value);
	}

	return value;
};
