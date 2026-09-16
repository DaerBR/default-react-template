import { Link } from 'react-router';

import { useAppTheme } from '../../styles/hooks.ts';

export const NotFound = () => {
	const theme = useAppTheme();

	return (
		<div
			css={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				minHeight: '100vh',
				gap: theme.margins[4],
				textAlign: 'center',
			}}
		>
			<h1 css={{ ...theme.typography.h1, color: theme.colors.error.main, margin: 0 }}>404</h1>
			<p css={{ ...theme.typography.paragraphM, color: theme.colors.text.subtitle, margin: 0 }}>Page not found.</p>
			<Link to="/" css={{ color: theme.colors.primary.main }}>
				Back to home
			</Link>
		</div>
	);
};
