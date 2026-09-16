import { create } from 'axios';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { API_URL } from './constants';

export const apiRequest = create({
	baseURL: API_URL,
	withCredentials: true,
});

export const useApiInterceptors = () => {
	const navigate = useNavigate();

	useEffect(() => {
		const interceptorId = apiRequest.interceptors.response.use(
			(response) => response,
			async (error) => {
				if (error.response?.status === 401) {
					navigate('/');
					console.info('Unauthorized access, redirecting to sign-in page');
				}

				if (error.response?.status === 403) {
					navigate('/');
					console.info('Unauthorized access, redirecting to sign-in page');
				}

				if (error.response?.status === 404) {
					navigate('/not-found');
				}

				return Promise.reject(error);
			},
		);

		return () => {
			apiRequest.interceptors.response.eject(interceptorId);
		};
	}, [navigate]);
};

export interface ApiResponseData<TResponsePayloadData> {
	meta: {
		requestStatus: string;
	};
	payload: TResponsePayloadData;
}
