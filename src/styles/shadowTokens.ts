import { theme } from './theme.ts';

/** A `theme.boxShadows` key: `'xs'`, `'sm'`, `'md'`, `'lg'`, `'xl'`, `'xxl'`. */
export type ShadowToken = keyof typeof theme.boxShadows;

export const SHADOW_PROPERTIES = ['boxShadow'] as const;

export type ShadowProperty = (typeof SHADOW_PROPERTIES)[number];

/** The type of a shadow property after resolving: tokens become strings, everything else keeps its type. */
export type ResolvedShadowValue<TValue> = TValue extends ShadowToken ? string : TValue;

const SHADOW_TOKEN_VALUES: ReadonlyMap<string, string> = new Map(Object.entries(theme.boxShadows));

/** CSS-wide keywords and `none` — valid single-word `box-shadow` values, never typos. */
const SHADOW_KEYWORDS: ReadonlySet<string> = new Set(['inherit', 'initial', 'none', 'revert', 'revert-layer', 'unset']);

/** Matches a bare lowercase word (`'mdd'`), to warn about token typos in dev. Real shadows contain spaces or digits. */
const TOKEN_LIKE_PATTERN = /^[a-z]+$/;

const warnedTokens = new Set<string>();

const warnUnknownToken = (value: string) => {
	if (warnedTokens.has(value)) {
		return;
	}

	warnedTokens.add(value);
	console.warn(`Unknown theme shadow token "${value}" used — was passed to CSS as written.`);
};

/**
 * Converts a `theme.boxShadows` token to its CSS value, for places outside `defineStyles()`
 * (inline `css` props, React `style` props, third-party style configs, template strings).
 * `themeShadow('xs')` → `theme.boxShadows.xs`.
 */
export const themeShadow = (token: ShadowToken): string => theme.boxShadows[token];

export const resolveShadowValue = (value: unknown): unknown => {
	if (typeof value !== 'string') {
		return value;
	}

	const resolved = SHADOW_TOKEN_VALUES.get(value);

	if (resolved !== undefined) {
		return resolved;
	}

	if (import.meta.env.DEV && TOKEN_LIKE_PATTERN.test(value) && !SHADOW_KEYWORDS.has(value)) {
		warnUnknownToken(value);
	}

	return value;
};
