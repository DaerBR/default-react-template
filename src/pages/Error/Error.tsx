import { Link } from 'react-router';

import { useAppTheme } from '../../styles/hooks.ts';
import { defineStyles } from '../../styles/defineStyles.ts';

interface ErrorProps {
	errorCode: number;
}

const containerStyles = defineStyles({
	display: 'flex',
	flexDirection: 'column',
	alignItems: 'center',
	justifyContent: 'center',
	minHeight: '100vh',
	gap: 6,
	textAlign: 'center',
});

export const Error = ({ errorCode }: ErrorProps) => {
	// Still needed for typography — spacing, colors and shadows are tokens inside defineStyles()
	const theme = useAppTheme();

	return (
		<div css={containerStyles}>
			<h1 css={defineStyles({ ...theme.typography.h1, color: 'error.main', margin: 0 })}>{`Error ${errorCode}`}</h1>
			<Link to="/" css={defineStyles({ color: 'primary.main' })}>
				Back to Homepage
			</Link>
		</div>
	);
};
