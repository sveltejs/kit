import { render, screen, fireEvent } from '@testing-library/svelte';
import '@testing-library/jest-dom';
import Counter from './Counter.svelte';

describe('Counter.svelte', () => {
	it('Expect to render counter with accessible buttons', () => {
		render(Counter);
		const decreaseButton = screen.getByLabelText('Decrease the counter by one');
		const increaseButton = screen.getByLabelText('Increase the counter by one');

		expect(decreaseButton).toBeInTheDocument();
		expect(increaseButton).toBeInTheDocument();
	});

	it('Expect counter to increase and decrease value', async () => {
		render(Counter);

		const decreaseButton = screen.getByLabelText('Decrease the counter by one');
		const increaseButton = screen.getByLabelText('Increase the counter by one');

		expect(screen.queryByText('0')).not.toBeNull();

		await fireEvent.click(increaseButton);

		expect(screen.queryByText('1')).not.toBeNull();

		await fireEvent.click(decreaseButton);

		expect(screen.queryByText('0')).not.toBeNull();
	});
});
