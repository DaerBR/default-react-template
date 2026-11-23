import type { CSSObject, SerializedStyles } from '@emotion/react';

import { COLOR_PROPERTIES, resolveColorValue } from './colorTokens.ts';
import { SHADOW_PROPERTIES, resolveShadowValue } from './shadowTokens.ts';
import { SPACING_PROPERTIES, resolveSpacingValue } from './spacing.ts';

import type { ColorProperty, ColorToken, ResolvedColorValue } from './colorTokens.ts';
import type { ResolvedShadowValue, ShadowProperty, ShadowToken } from './shadowTokens.ts';
import type { ResolvedSpacingValue, SpacingProperty, SpacingValue } from './spacing.ts';

/** `CSSObject` without its `[selector: string]` index signature: the CSS properties and pseudos only. */
type CSSKnownProperties = {
	[TKey in keyof CSSObject as string extends TKey ? never : TKey]: CSSObject[TKey];
};

type ThemeAwareProperties = {
	[TKey in keyof CSSKnownProperties]?: TKey extends SpacingProperty
		? Extract<CSSKnownProperties[TKey], string> | readonly string[] | SpacingValue<TKey>
		: TKey extends ColorProperty
			? CSSKnownProperties[TKey] | ColorToken
			: TKey extends ShadowProperty
				? CSSKnownProperties[TKey] | ShadowToken
				: TKey extends `:${string}`
					? ThemeStyles
					: CSSKnownProperties[TKey];
};

/**
 * `CSSObject` where some properties also take theme tokens:
 * - spacing properties take `theme.spacing` steps instead of raw pixel numbers (`marginTop: 3`, `padding: [2, 3]`);
 * - color properties take `theme.colors` tokens (`color: 'error.main'`);
 * - `boxShadow` takes `theme.boxShadows` tokens (`boxShadow: 'xs'`).
 *
 * Other strings pass through untouched (`margin: '12px 0 24px 4px'`, `color: '#fff'`).
 * Nested selectors and media queries follow the same rules.
 */
export interface ThemeStyles extends ThemeAwareProperties {
	[selector: string]: Exclude<CSSObject[string], CSSObject> | SerializedStyles | ThemeStyles;
}

/** Distributes over unions, so `'absolute' | undefined` or `string & {}` keep their exact types. */
type ResolvedThemeStylesValue<TValue> = TValue extends
	string | number | boolean | null | undefined | readonly unknown[] | SerializedStyles
	? TValue
	: ResolvedThemeStyles<TValue>;

/** The type of `styles` after `resolveThemeStyles`: tokens become strings, everything else keeps its type. */
export type ResolvedThemeStyles<TStyles> = {
	[TKey in keyof TStyles]: TKey extends SpacingProperty
		? ResolvedSpacingValue<TStyles[TKey]>
		: TKey extends ColorProperty
			? ResolvedColorValue<TStyles[TKey]>
			: TKey extends ShadowProperty
				? ResolvedShadowValue<TStyles[TKey]>
				: ResolvedThemeStylesValue<TStyles[TKey]>;
};

type ValueResolver = (value: unknown) => unknown;

/** Which resolver handles which CSS property. */
const PROPERTY_RESOLVERS: ReadonlyMap<string, ValueResolver> = new Map<string, ValueResolver>([
	...SPACING_PROPERTIES.map((property): [string, ValueResolver] => [property, resolveSpacingValue]),
	...COLOR_PROPERTIES.map((property): [string, ValueResolver] => [property, resolveColorValue]),
	...SHADOW_PROPERTIES.map((property): [string, ValueResolver] => [property, resolveShadowValue]),
]);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;

/** Returns `styles` itself when nothing needed resolving, so objects without tokens aren't copied. */
const resolveObject = (styles: Record<string, unknown>): Record<string, unknown> => {
	const entries = Object.entries(styles);
	const resolvedEntries = entries.map(([key, value]): [string, unknown] => {
		const resolveValue = PROPERTY_RESOLVERS.get(key);

		if (resolveValue) {
			return [key, resolveValue(value)];
		}

		return [key, isPlainObject(value) ? resolveObject(value) : value];
	});
	const hasChanges = resolvedEntries.some(([, value], index) => value !== entries[index][1]);

	return hasChanges ? Object.fromEntries(resolvedEntries) : styles;
};

/** Replaces theme tokens with their CSS values, recursing into nested selectors. */
export const resolveThemeStyles = <TStyles extends ThemeStyles>(styles: TStyles): ResolvedThemeStyles<TStyles> =>
	resolveObject(styles) as ResolvedThemeStyles<TStyles>;
