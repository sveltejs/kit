import { x } from './relative';
import { query, action, formAction } from '@sveltejs/kit';

export const add = query(async (a: number, b: number) => {
	console.log('add', x, a, b);

	return a + b;
});

export const multiply = action(async (a: number, b: number) => {
	console.log('multiply', a, b);

	return a * b;
});

export const divide = formAction(async (form) => {
	const a = form.get('a');
	const b = form.get('b');
	console.log('divide', a, b);

	return a / b;
});
