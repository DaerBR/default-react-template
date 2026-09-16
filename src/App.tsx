import { BrowserRouter, Route, Routes } from 'react-router';
import { ThemeProvider } from '@emotion/react';

import { Homepage, NotFound } from './pages';
import { theme } from './styles/theme.ts';
import './index.css';

export const App = () => (
	<BrowserRouter>
		<ThemeProvider theme={theme}>
			<Routes>
				<Route path="/" element={<Homepage />} />
				<Route path="*" element={<NotFound />} />
			</Routes>
		</ThemeProvider>
	</BrowserRouter>
);
