import { render, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom';
import Index from './index.svelte';

describe('Test index.svelte', () => {
	it('h1 exists', () => {
		const { getByText } = render(Index);
		expect(getByText('Welcome to SvelteKit')).toBeInTheDocument();
	});
	it('link to svelte website', () => {
		render(Index);

		const link = screen.getByRole('link');
		expect(link).toHaveAttribute('href', 'https://kit.svelte.dev');
	});
});
