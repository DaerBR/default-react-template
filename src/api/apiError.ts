import { isAxiosError } from 'axios';

const FALLBACK_MESSAGE = 'Unknown error occurred.';

export interface ApiError {
	message: string;
}

const hasMessage = (value: unknown): value is ApiError =>
	typeof value === 'object' && value !== null && 'message' in value && typeof value.message === 'string';

export const toApiError = (error: unknown): ApiError => {
	if (isAxiosError(error)) {
		const data: unknown = error.response?.data;

		if (hasMessage(data)) {
			return { message: data.message };
		}
	}

	if (hasMessage(error)) {
		return { message: error.message };
	}

	return { message: FALLBACK_MESSAGE };
};
