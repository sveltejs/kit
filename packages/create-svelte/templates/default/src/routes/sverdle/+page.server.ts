import { Game } from './game';
import { invalid } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

/** @type {import('./$types').PageServerLoad} */
export const load: PageServerLoad = ({ cookies }) => {
	const game = new Game(cookies.get('sverdle'));

	return {
		guesses: game.guesses,
		answers: game.answers
	};
};

/** @type {import('./$types').Actions} */
export const actions: Actions = {
	keyboard: async ({ url, cookies }) => {
		const game = new Game(cookies.get('sverdle'));
		const key = url.searchParams.get('key');

		const current_row = game.answers.length;

		if (key === 'backspace') {
			game.guesses[current_row] = game.guesses[current_row].slice(0, -1);
		} else {
			game.guesses[current_row] += key;
		}

		cookies.set('sverdle', game.toString());
	},

	enter: async ({ request, cookies }) => {
		const game = new Game(cookies.get('sverdle'));

		const data = await request.formData();
		const guess = /** @type {string[]} */ data.getAll('guess') as string[];

		if (!game.enter(guess)) {
			return invalid(400, {
				illegal: true
			});
		}

		cookies.set('sverdle', game.toString());
	},

	restart: async ({ cookies }) => {
		cookies.delete('sverdle');
	}
};
