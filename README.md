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
- **Emotion** (`css` prop, configured via `jsxImportSource` in `vite.config.ts`) is the CSS-in-JS default. Access the theme via `useAppTheme()` from `src/styles/hooks.ts`, not `useTheme()` directly (it's typed against `GlobalTheme` via `src/styles/emotion.d.ts`).

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
  styles/       theme.ts + colors.ts (real values, kept from a previous project as a working example — reskin freely), hooks.ts, emotion.d.ts, defineStyles.ts
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

`src/styles/defineStyles.ts` is an identity helper — wrap every standalone Emotion style object in it. A bare object literal gets its values widened to `string`, so TypeScript rejects it for enum-like CSS properties (`position: 'absolute'`, `boxSizing: 'border-box'`, `flexDirection: 'column'`, …) once it reaches the `css` prop. `defineStyles` checks the object against Emotion's `CSSObject` while keeping the narrow literal types, so no `as const` or `: CSSObject` annotation is needed (an annotation would also widen the type and lose the specific keys). No runtime cost.

```ts
import { defineStyles } from '../../styles/defineStyles.ts';

// Static styles — in the component's styles.ts
export const wrapperStyles = defineStyles({ position: 'relative', display: 'flex', flexDirection: 'column' });

// Theme-dependent styles — in a use*Styles hook
export const useCardStyles = () => {
	const theme = useAppTheme();
	return {
		cardStyles: defineStyles({ boxSizing: 'border-box', boxShadow: theme.boxShadows.xs }),
	};
};

// Prop/state-dependent or merged styles — inline in the component
const mergedStyles = defineStyles({ ...baseStyles, ...(hasError ? errorStyles : {}), ...customStyles });
```

See `dual-cookbook-client` for usage throughout real components (`components/atoms/*/styles.ts`, `Select`, `RecipeCard`).

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
