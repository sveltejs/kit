import { describe, it, expect } from 'vitest';
import { Game } from './game';

describe('game test', () => {
	it('returns true when a valid word is entered', () => {
		const game = new Game();
		expect(game.enter('zorro'.split(''))).toBe(true);
	});
});
