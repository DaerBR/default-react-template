import { BrowserRouter, Route, Routes } from 'react-router';
import { ThemeProvider } from '@emotion/react';
import { Toaster } from 'sonner';

import { Error, Homepage } from './pages';
import { theme } from './styles/theme.ts';
import { useApiNavigate } from './api/apiRequest.ts';
import './index.css';

// Rendered inside <BrowserRouter> so `useApiNavigate` can reach react-router's `navigate` — without this call the
// axios interceptor's 401/403/404 redirects silently do nothing.
const AppRoutes = () => {
	useApiNavigate();

	return (
		<>
			{/* Target for useThunk's success/error toasts — swap for a themed wrapper once the project has UI atoms */}
			<Toaster />
			<Routes>
				<Route path="/" element={<Homepage />} />
				<Route path="/not-found" element={<Error errorCode={404} />} />
				<Route path="*" element={<Error errorCode={404} />} />
			</Routes>
		</>
	);
};

export const App = () => (
	<BrowserRouter>
		<ThemeProvider theme={theme}>
			<AppRoutes />
		</ThemeProvider>
	</BrowserRouter>
);
