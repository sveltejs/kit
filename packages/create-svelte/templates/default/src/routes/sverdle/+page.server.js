import { Game } from './game.js';
import { invalid } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export function load({ cookies }) {
	const game = new Game(cookies.get('sverdle'));

	console.log(game.answer);

	return {
		guesses: game.guesses,
		answers: game.answers
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	keyboard: async ({ url, cookies }) => {
		const game = new Game(cookies.get('sverdle'));
		const key = url.searchParams.get('key');

		const current_row = game.answers.length;

		console.error({ key });

		if (key === 'Backspace') {
			game.guesses[current_row] = game.guesses[current_row].slice(0, -1);
		} else {
			game.guesses[current_row] += key;
		}

		console.log(game.guesses);

		cookies.set('sverdle', game.toString());
	},

	enter: async ({ request, cookies }) => {
		const game = new Game(cookies.get('sverdle'));

		const data = await request.formData();
		const guess = /** @type {string[]} */ (data.getAll('guess')).map((l) => l.toLowerCase());

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
