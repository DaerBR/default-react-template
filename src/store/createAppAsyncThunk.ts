import { createAsyncThunk } from '@reduxjs/toolkit';
import type { AppDispatch, RootState } from './store.ts';
import type { ApiError } from '../api/apiError.ts';

export interface AppThunkConfig {
	dispatch: AppDispatch;
	rejectValue: ApiError;
	state: RootState;
}

export const createAppAsyncThunk = createAsyncThunk.withTypes<AppThunkConfig>();
