# daer-react-template

Personal starting point for new React + TypeScript + Vite projects. Carries over the tooling and conventions worth keeping every time, without any project-specific code.

## Commands

```bash
pnpm dev        # start dev server
pnpm build      # tsc -b && vite build
pnpm lint       # eslint .
pnpm preview    # preview production build
pnpm updates    # npm-check-updates --interactive --format group
```

Pre-commit hook (Husky): runs a full `tsc` type-check, then `lint-staged` (ESLint `--fix` + Prettier `--write`) on staged `.ts`/`.tsx` files only.

## Stack

React 19, TypeScript, Vite, Redux Toolkit, React Router v8, Emotion (CSS-in-JS), React Hook Form + Zod, Axios, Sonner (toasts), FontAwesome icons.

**Treat these as defaults, not requirements** — they're what I reach for absent other constraints. If a project says "use Tailwind" or "use MUI," swap the relevant piece rather than fighting the default:

- **Redux Toolkit** is the heaviest opinion here. Small projects may not need it at all — Context or nothing might be enough.
- **Emotion** (`css` prop, configured via `jsxImportSource` in `vite.config.ts`) is the CSS-in-JS default. Access the theme via `useAppTheme()` from `src/styles/hooks.ts`, not `useTheme()` directly (it's typed against `GlobalTheme` via `src/styles/emotion.d.ts`). Spacing, colors and shadows don't need it — write them as tokens inside `defineStyles()` (see [`defineStyles`](#definestyles)).

## Structure

```
src/
  api/          axios instance + response interceptor (401/403 -> "/", 404 -> "/not-found"); apiError.ts (ApiError + toApiError)
  components/   empty — feature components go here
    atoms/      empty — primitive UI components (Button, Typography, etc.) go here
  contexts/     GlobalLoadingIndicatorContext — backs useThunk's optional global loading state
  pages/        one directory per route; Homepage and Error (404, used for `/not-found` and the `*` catch-all) are the only real ones
  store/        Redux Toolkit setup; createAppAsyncThunk.ts (pre-typed createAsyncThunk — use it for every thunk)
    hooks/      useAppDispatch / useAppSelector (typed), useThunk (see below)
    slices/     empty — add slices here
    thunks/     empty — add thunks here
  styles/       theme.ts + colors.ts (real values, kept from a previous project as a working example — reskin freely), hooks.ts, emotion.d.ts,
                defineStyles.ts + themeStyles.ts (token resolver) with spacing.ts, colorTokens.ts, shadowTokens.ts
```

`components/` and `components/atoms/` are intentionally empty — copy in whatever primitives the new project actually needs rather than starting with a full library.

### Thunks and API errors

- **`createAppAsyncThunk`** (`src/store/createAppAsyncThunk.ts`) — `createAsyncThunk.withTypes<AppThunkConfig>()` with `state: RootState`, `dispatch: AppDispatch` and `rejectValue: ApiError` set once. Use it instead of `createAsyncThunk`; each thunk then only declares `<Returned, Arg>`. Use `void` for "no argument" (with `any`, RTK makes the argument required) and for "no payload" (e.g. a `204` delete — `await` the request, don't return `response.data`).
- **Typed responses** — pass the response type to Axios: `apiRequest.request<UserData>(…)`. Without it `response.data` is `any`, which is assignable to anything, so the thunk's `Returned` type is never actually checked. It's still a declaration, not a runtime check — read the backend's real response shape before writing it (e.g. an unpopulated `POST`/`PUT` reply needs its own type).
- **`ApiError` / `toApiError`** (`src/api/apiError.ts`) — `ApiError` is `{ message: string }`. `toApiError(error: unknown)` turns anything into one: the server's error body (if it has a string `message`), otherwise any `Error` / RTK `SerializedError` message (network errors, timeouts, non-JSON 5xx pages), otherwise a fallback. It assumes the backend sends errors as `{ message, ...extras }` — adjust `toApiError` if a project's API differs. Every thunk's `catch` is just `return rejectWithValue(toApiError(error));`.

```ts
export const fetchUser = createAppAsyncThunk<UserData, void>('auth/fetchUser', async (_, { rejectWithValue }) => {
	try {
		const response = await apiRequest.request<UserData>({ url: '/api/current_user', method: 'get' });

		return response.data;
	} catch (error: unknown) {
		return rejectWithValue(toApiError(error));
	}
});
```

### `useThunk`

`src/store/hooks/useThunk.ts` wraps dispatching a thunk created with `createAppAsyncThunk`:

- an error toast with the `ApiError` message, and an optional success toast (`successMessage`), via `sonner`
- an optional redirect on success (`successRedirectRoute`)
- an optional global loading flag (`useGlobalLoader`), read from `GlobalLoadingIndicatorContext` in `src/contexts/`

The thunk's argument and result types are inferred (`useThunk(fetchUser)` — no type arguments), and a required argument can't be omitted. The returned dispatcher resolves to a `ThunkResult` — a discriminated union on `ok` — so call sites need no `try/catch`, `.unwrap()` or `meta.requestStatus` checks:

```ts
const [dispatchCreateItem] = useThunk(createItem, { successMessage: 'Created!' });

const result = await dispatchCreateItem(payload);
if (result.ok) {
	closeDrawer(result.data); // typed as the thunk's Returned
} // on failure the toast is already shown; result.error is the ApiError
```

Inside the hook there's one deliberate cast (`AppThunkActionCreator`): RTK types a thunk's call signature with conditional types that TS can't resolve for a still-generic `TArg`. Callers are fully checked; the cast is local.

It works out of the box with no thunks defined yet — `useContext` just falls back to the context's default (`isVisible: false`, no-op setter) if nothing provides it. There's intentionally no `MainWrapper`/spinner component wired up to _show_ that loading state, since `components/` starts empty — add a provider + spinner per-project once there's UI to hook it to (see `dual-cookbook-client`'s `MainWrapper` for a reference implementation: a `useState` + `useMemo`'d context value wrapping the app, toggled by `handleShowLoadingIndicator`).

### Type imports

`verbatimModuleSyntax` is on (`tsconfig.json`), so type-only imports must be marked — as a separate `import type { … }` statement, never inline `import { type … }`. ESLint enforces and auto-fixes both (`@typescript-eslint/consistent-type-imports` with `separate-type-imports`, plus `import/consistent-type-specifier-style: prefer-top-level`):

```ts
import { useNavigate } from 'react-router';
import type { NavigateFunction } from 'react-router';
```

### `defineStyles`

`src/styles/defineStyles.ts` — wrap every standalone Emotion style object in it. It does two things:

- **Keeps literal types.** A bare object literal gets its values widened to `string`, so TypeScript rejects it for enum-like CSS properties (`position: 'absolute'`, `boxSizing: 'border-box'`, `flexDirection: 'column'`, …) once it reaches the `css` prop. `defineStyles` checks the object against Emotion's `CSSObject` while keeping the narrow literal types, so no `as const` or `: CSSObject` annotation is needed (an annotation would also widen the type and lose the specific keys).
- **Resolves theme tokens** — spacing steps (`marginTop: 3` → `'12px'`), color tokens (`color: 'error.main'` → `theme.colors.error.main`) and shadow tokens (`boxShadow: 'xs'` → `theme.boxShadows.xs`), see the sections below. The resolver lives in `src/styles/themeStyles.ts`. It walks the object (recursing into nested selectors) and returns a new object only when something was resolved — an object without tokens comes back as is. It costs a few microseconds per call; negligible next to Emotion serialising the same object.

```ts
import { defineStyles } from '../../styles/defineStyles.ts';

// Static styles — in the component's styles.ts (or a module-level constant, see pages/Homepage)
export const wrapperStyles = defineStyles({ position: 'relative', display: 'flex', padding: [2, 3], color: 'text.main' });

// Styles that still need the theme object (typography, dynamic palettes) — in a use*Styles hook.
// Spacing, colors and shadows don't need it — use tokens.
export const useFieldStyles = () => {
	const theme = useAppTheme();
	return {
		fieldStyles: defineStyles({ fontSize: theme.typography.paragraphS.fontSize, color: 'text.main', boxShadow: 'xs' }),
	};
};

// Prop/state-dependent or merged styles — inline in the component
const mergedStyles = defineStyles({ ...baseStyles, ...(hasError ? errorStyles : {}), ...customStyles });
```

**Custom style props:** a component that accepts a `customStyles` prop types it as `ThemeStyles` (from `src/styles/themeStyles.ts`, not `CSSObject`) and merges it through `defineStyles()` inside the component, so callers can pass steps and tokens too.

See `dual-cookbook-client` for usage throughout real components (`components/atoms/*`, `Select`, `RecipeCard`).

### Spacing

Margins, paddings and gaps use the `theme.spacing` scale (`1` → `4px` … `10` → `40px`, plus `0`). Inside `defineStyles()` you write the step number instead of the pixel value — no `useAppTheme()` call needed (`src/styles/spacing.ts`):

```ts
export const cardStyles = defineStyles({
	marginTop: 3, // '12px'
	padding: [2, 3], // '8px 12px' — shorthand as a tuple, in CSS order
	margin: '12px 0 24px 4px', // strings are left as written
	gap: '6px', // off-scale edge case — just use a string
	'@media (min-width: 768px)': { paddingInline: 4 }, // nested selectors / media queries work too
});
```

- **Which properties:** `margin`, `padding` (tuple of up to 4 steps); `gap`, `marginBlock`, `marginInline`, `paddingBlock`, `paddingInline` (up to 2); and the single-value longhands — `marginTop`/`Right`/`Bottom`/`Left`, `paddingTop`/…, the `*Block*`/`*Inline*` `Start`/`End` variants, `rowGap`, `columnGap`. Every other property is untouched, so `lineHeight: 1.5` or `zIndex: 10` keep their meaning.
- **Type-checked:** only real steps are accepted — `marginTop: 13` or `gap: [1, 2, 3]` is a type error. Negative steps aren't supported; write `'-4px'`.
- **Outside `defineStyles()`** (inline `css={{ … }}` objects, React `style` props, third-party style configs), Emotion treats numbers as pixels: `css={{ marginTop: 3 }}` renders `3px`. Use `space()` there instead:

```tsx
<div css={{ marginTop: space(3), padding: space(2, 3) }} />
```

- **Lint:** calling `space()` inside `defineStyles()` is an error (`no-restricted-syntax`) — write the step instead.

### Theme colors

Simple color properties take `theme.colors` tokens — `'<palette>.<shade>'` — inside `defineStyles()`, so you don't need `useAppTheme()` just to read a color (`src/styles/colorTokens.ts`):

```ts
export const labelStyles = defineStyles({
	color: 'text.caption', // theme.colors.text.caption
	borderColor: isDisabled ? 'neutral.borderLighter' : 'neutral.borderDefault', // conditions work
	backgroundColor: '#fff', // any other string is left as written
	'&:hover': { color: 'primary.dark' }, // nested selectors / media queries work too
});
```

- **Which properties:** `color`, `backgroundColor`, `borderColor`, `borderTopColor`/`Right`/`Bottom`/`Left`, `outlineColor`, `fill`, `stroke`, `textDecorationColor`, `caretColor`. Composite properties (`border: '1px solid …'`, `background`, `boxShadow`) are left as written — split them (`border: '1px solid'` + `borderColor: 'neutral.borderDefault'`) to use a token.
- **Tokens come from the theme:** every `theme.colors` palette/shade pair is a token (`'error.main'`, `'text.title'`, `'neutral.borderDefault'`, …) and is offered by autocomplete; a new color in `theme.ts` becomes a token automatically.
- **Typos:** any string is still a valid CSS value, so a typo like `'error.mian'` isn't a type error. In dev, a string shaped like `<palette>.<name>` that isn't a token logs a `console.warn` (once per value) and is passed through as written.
- **Outside `defineStyles()`** — inline `css` objects, React `style` props, third-party style configs and template strings — use `themeColor()`:

```tsx
<div css={{ color: themeColor('text.caption'), border: `1px solid ${themeColor('neutral.borderDefault')}` }} />
```

- **Lint:** `themeColor()` as a direct property value inside `defineStyles()` is an error (`no-restricted-syntax`) — write the token instead. Inside a template string it's allowed.
- **Dynamic palettes** (`theme.colors[color].main`, where `color` is a prop) still go through `useAppTheme()`.

### Theme shadows

`boxShadow` takes `theme.boxShadows` keys as tokens inside `defineStyles()` (`src/styles/shadowTokens.ts`):

```ts
export const cardStyles = defineStyles({
	boxShadow: 'xs', // theme.boxShadows.xs
	'&:hover': { boxShadow: isActive ? 'md' : 'sm' }, // conditions and nested selectors work
	'&:focus': { boxShadow: '0 0 0 3px rgba(254, 186, 152, 0.20)' }, // raw shadows and 'none' are left as written
});
```

- **Tokens:** `'xs'`, `'sm'`, `'md'`, `'lg'`, `'xl'`, `'xxl'`, straight from `theme.boxShadows` (a new key there becomes a token automatically). Only `boxShadow` is resolved.
- **Typos:** in dev, a bare lowercase word that isn't a token or a CSS keyword (`'mdd'`, but not `'none'`/`'inherit'`) logs a `console.warn` once and is passed through as written.
- **Outside `defineStyles()`** use `themeShadow('md')` — e.g. `css={{ boxShadow: themeShadow('sm') }}` or a third-party `style` prop.
- **Lint:** `themeShadow()` as a direct property value inside `defineStyles()` is an error; inside a template string it's allowed.

### When to keep `useAppTheme()`

Outside `defineStyles()`, use `themeColor()` / `themeShadow()` only when that removes the last use of `theme` in the component, so `useAppTheme()` can go. If the component keeps `theme` anyway (typography, dynamic palettes), leave `theme.colors.x.y` / `theme.boxShadows.x` as they are. Inside `defineStyles()` and `customStyles`, always write tokens.

## API layer

`src/api/apiRequest.ts` is a shared Axios instance (`baseURL` from `API_URL`, `withCredentials: true` for cookie sessions). Its response interceptor is registered at module scope — so it's attached before any page's on-mount fetch — and redirects to `/` on `401`/`403` and to `/not-found` on `404`. It navigates through `useApiNavigate()`, which only keeps a reference to react-router's `navigate`; it must be called once in a component rendered inside `<BrowserRouter>`, otherwise the redirects silently do nothing. `App.tsx` does this in its inner `AppRoutes` component — keep that call when restructuring the app shell.

`AppRoutes` also renders Sonner's `<Toaster />`, which `useThunk`'s toasts need in order to appear. Replace it with a themed wrapper once the project has UI atoms (see `dual-cookbook-client`'s `StyledToaster`).

## Prettier and EditorConfig

Prettier config lives in `.prettierrc` (same as `dual-cookbook-client`): single quotes, semicolons, trailing commas everywhere, 120-char print width, `bracketSpacing`, LF line endings. It runs automatically on staged `.ts`/`.tsx` files via the pre-commit hook (after `eslint --fix`; `eslint-config-prettier` disables ESLint rules that would conflict). To format manually: `pnpm exec prettier --write .`. Point your editor's Prettier integration at the project's `prettier` package so on-save formatting matches the hook. `.editorconfig` sets the editor basics to match: UTF-8, tab indentation, LF, final newline, trimmed trailing whitespace.

## Environment

```
VITE_BASE_API_URL=   # falls back to http://localhost:3000 if unset (src/api/constants.ts)
```

## Using this as a new project

This repo is a **GitHub template repository**. Don't `git clone` it — that drags along this repo's history and `origin` remote. Instead:

- GitHub UI: open the repo, click **"Use this template" → "Create a new repository"**.
- CLI: `gh repo create my-new-project --template=<owner>/daer-react-template --clone`

Either way you get a single fresh initial commit with no relation back to this repo (or to whatever project's `main` you started this template from — none of that history is here). After creating it: update `package.json`'s `name`, `index.html`'s `<title>`, and start replacing `Homepage`.

If you ever want to pull a later improvement made here (e.g. a new ESLint rule) into a project already started from this template, there's no automatic path — re-copy the relevant config file by hand. Tracking this repo as an `upstream` remote and merging is possible but not worth the complexity for a personal template.

Created by [@Gennadii Guliakov] (https://github.com/DaerBR), 2026.
