import { theme } from './theme.ts';

/** A step of `theme.spacing` (`3` → `'12px'`); `0` resolves to `'0'`. */
export type SpacingStep = 0 | keyof typeof theme.spacing;

/** Up to four steps, in CSS shorthand order (top, right, bottom, left). */
export type SpacingShorthand = [SpacingStep, SpacingStep?, SpacingStep?, SpacingStep?];

const SPACING_BOX_SHORTHANDS = ['margin', 'padding'] as const;

const SPACING_AXIS_SHORTHANDS = ['gap', 'marginBlock', 'marginInline', 'paddingBlock', 'paddingInline'] as const;

const SPACING_LONGHANDS = [
	'columnGap',
	'marginBlockEnd',
	'marginBlockStart',
	'marginBottom',
	'marginInlineEnd',
	'marginInlineStart',
	'marginLeft',
	'marginRight',
	'marginTop',
	'paddingBlockEnd',
	'paddingBlockStart',
	'paddingBottom',
	'paddingInlineEnd',
	'paddingInlineStart',
	'paddingLeft',
	'paddingRight',
	'paddingTop',
	'rowGap',
] as const;

export const SPACING_PROPERTIES = [
	...SPACING_BOX_SHORTHANDS,
	...SPACING_AXIS_SHORTHANDS,
	...SPACING_LONGHANDS,
] as const;

type SpacingBoxShorthand = (typeof SPACING_BOX_SHORTHANDS)[number];

type SpacingAxisShorthand = (typeof SPACING_AXIS_SHORTHANDS)[number];

export type SpacingProperty = (typeof SPACING_PROPERTIES)[number];

export type SpacingValue<TProperty extends SpacingProperty> = TProperty extends SpacingBoxShorthand
	? SpacingStep | Readonly<SpacingShorthand>
	: TProperty extends SpacingAxisShorthand
		? SpacingStep | readonly [SpacingStep, SpacingStep?]
		: SpacingStep;

/** The type of a spacing property after resolving: steps become strings, strings keep their type. */
export type ResolvedSpacingValue<TValue> = TValue extends string | readonly string[] | undefined ? TValue : string;

const toSpacing = (step: SpacingStep): string => (step === 0 ? '0' : theme.spacing[step]);

/**
 * Converts `theme.spacing` steps to a CSS value, for places outside `defineStyles()` (e.g. inline `css` props).
 * `space(3)` → `'12px'`, `space(1, 0, 6, 1)` → `'4px 0 24px 4px'`.
 */
export const space = (...steps: SpacingShorthand): string =>
	steps
		.filter((step): step is SpacingStep => step !== undefined)
		.map(toSpacing)
		.join(' ');

const isSpacingShorthand = (value: unknown): value is Readonly<SpacingShorthand> =>
	Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'number');

export const resolveSpacingValue = (value: unknown): unknown => {
	if (typeof value === 'number') {
		return toSpacing(value as SpacingStep);
	}

	if (isSpacingShorthand(value)) {
		return space(...value);
	}

	return value;
};
