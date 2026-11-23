import { useAppTheme } from '../../styles/hooks.ts';
import { defineStyles } from '../../styles/defineStyles.ts';

const containerStyles = defineStyles({
	display: 'flex',
	flexDirection: 'column',
	alignItems: 'center',
	justifyContent: 'center',
	minHeight: '100vh',
	gap: 4,
	padding: 6,
	textAlign: 'center',
});

export const Homepage = () => {
	// Still needed for typography — spacing, colors and shadows are tokens inside defineStyles()
	const theme = useAppTheme();

	return (
		<div css={containerStyles}>
			<h1 css={defineStyles({ ...theme.typography.h2, color: 'primary.main', margin: 0 })}>Daer React Template</h1>
			<p
				css={defineStyles({
					...theme.typography.paragraphM,
					color: 'text.subtitle',
					margin: 0,
					maxWidth: '480px',
				})}
			>
				This is the starting point. Replace this page, wire up your store slices, and start building.
			</p>
		</div>
	);
};
