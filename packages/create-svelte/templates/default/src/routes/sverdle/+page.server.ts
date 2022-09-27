import { invalid } from '@sveltejs/kit';
import words_raw from './words.txt?raw';
import words_allowed_raw from './words_allowed.txt?raw';
import type { PageServerLoad, Actions } from './$types';

/** The list of possible answers */
const words = words_raw.split('\n');

/** The list of valid guesses, of which the list of possible answers is a subset */
const allowed = new Set([...words, ...words_allowed_raw.split('\n')]);

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
	keyboard: async ({ request, cookies }) => {
		const game = new Game(cookies.get('sverdle'));

		const data = await request.formData();
		const key = data.get('key');

		const i = game.answers.length;

		if (key === 'backspace') {
			game.guesses[i] = game.guesses[i].slice(0, -1);
		} else {
			game.guesses[i] += key;
		}

		cookies.set('sverdle', game.toString());
	},

	enter: async ({ request, cookies }) => {
		const game = new Game(cookies.get('sverdle'));

		const data = await request.formData();
		const guess = /** @type {string[]} */ data.getAll('guess') /***/ as string[];

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

class Game {
	index: number;
	guesses: string[];
	answers: string[];
	answer: string;

	/**
	 * Create a game object from the user's cookie, or initialise a new game
	 * @param {string | undefined} serialized
	 */
	constructor(serialized: string | undefined) {
		if (serialized) {
			const [index, guesses, answers] = serialized.split('-');

			this.index = +index;
			this.guesses = guesses ? guesses.split(' ') : [];
			this.answers = answers ? answers.split(' ') : [];
		} else {
			this.index = Math.floor(Math.random() * words.length);
			this.guesses = ['', '', '', '', '', ''];
			this.answers = /** @type {string[]} */ [] /***/;
		}

		this.answer = words[this.index];
	}

	/**
	 * Update game state based on a guess of a five-letter word
	 * @param {string[]} letters
	 */
	enter(letters: string[]) {
		const word = letters.join('');
		const valid = allowed.has(word);

		if (!valid) return false;

		this.guesses[this.answers.length] = word;

		const available = Array.from(this.answer);
		const answer = Array(5).fill('_');

		// first, find exact matches
		for (let i = 0; i < 5; i += 1) {
			if (letters[i] === available[i]) {
				answer[i] = 'x';
				available[i] = ' ';
			}
		}

		// then find close matches (this has to happen
		// in a second step, otherwise an early close
		// match can prevent a later exact match)
		for (let i = 0; i < 5; i += 1) {
			if (answer[i] === '_') {
				const index = available.indexOf(letters[i]);
				if (index !== -1) {
					answer[i] = 'c';
					available[index] = ' ';
				}
			}
		}

		this.answers.push(answer.join(''));

		return true;
	}

	/**
	 * Serialize game state so it can be set as a cookie
	 */
	toString() {
		return `${this.index}-${this.guesses.join(' ')}-${this.answers.join(' ')}`;
	}
}
