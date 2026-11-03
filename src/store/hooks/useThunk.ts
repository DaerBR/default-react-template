import { useNavigate } from 'react-router';
import { useCallback, useContext, useState } from 'react';
import { toast } from 'sonner';
import type { AsyncThunk, AsyncThunkAction } from '@reduxjs/toolkit';

import { useAppDispatch } from './hooks';
import { toApiError } from '../../api/apiError.ts';
import type { ApiError } from '../../api/apiError.ts';
import type { AppThunkConfig } from '../createAppAsyncThunk.ts';
import { GlobalLoadingIndicatorContext } from '../../contexts/GlobalLoadingIndicator.tsx';

interface UseThunkOptions {
	successMessage?: string;
	successRedirectRoute?: string;
	useGlobalLoader?: boolean;
}

// RTK types a thunk's call signature with conditional types (different shapes for void / optional / required
// args). Inside this generic hook `TArg` is unresolved, so TS can't pick a shape and rejects `thunk(arg)`.
// Callers are still fully checked via the `AsyncThunk<TReturned, TArg, …>` parameter; this cast is local only.
type AppThunkActionCreator<TReturned, TArg> = (arg: TArg) => AsyncThunkAction<TReturned, TArg, AppThunkConfig>;

// Discriminated union on `ok`: checking `result.ok` narrows to the branch that has `data` (success) or `error`.
export type ThunkResult<TReturned> = { data: TReturned; ok: true } | { error: ApiError; ok: false };

export const useThunk = <TReturned, TArg>(
	thunk: AsyncThunk<TReturned, TArg, AppThunkConfig>,
	options?: UseThunkOptions,
): [(arg: TArg) => Promise<ThunkResult<TReturned>>, ApiError | null] => {
	const [error, setError] = useState<ApiError | null>(null);
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	// Primitive deps only — inline `options` objects must not recreate the callback every render.
	const successMessage = options?.successMessage;
	const successRedirectRoute = options?.successRedirectRoute;

	const useGlobalLoader = options?.useGlobalLoader ?? false;
	const { handleShowLoadingIndicator } = useContext(GlobalLoadingIndicatorContext);

	const dispatchThunk = useCallback(
		async (arg: TArg): Promise<ThunkResult<TReturned>> => {
			if (useGlobalLoader) {
				handleShowLoadingIndicator(true);
			}

			try {
				const data = await dispatch((thunk as AppThunkActionCreator<TReturned, TArg>)(arg)).unwrap();

				if (successMessage) {
					toast.success(successMessage);
				}

				if (successRedirectRoute) {
					navigate(successRedirectRoute);
				}

				return { data, ok: true };
			} catch (e) {
				const apiError = toApiError(e);

				toast.error(apiError.message);
				setError(apiError);

				return { error: apiError, ok: false };
			} finally {
				if (useGlobalLoader) {
					handleShowLoadingIndicator(false);
				}
			}
		},
		[dispatch, thunk, successMessage, successRedirectRoute, useGlobalLoader, handleShowLoadingIndicator, navigate],
	);

	return [dispatchThunk, error];
};
