import { expect, test, describe } from 'vitest';
import { parse_as_bytes } from '../utils.js';

describe('parse_as_bytes', () => {
	test('parses correctly', () => {
		const testData = {
			200: 200,
			'512K': 512 * 1024,
			'200M': 200 * 1024 * 1024,
			'1G': 1024 * 1024 * 1024,
			Infinity,
			asdf: NaN
		};

		Object.keys(testData).forEach((input) => {
			const expected = testData[/** @type {keyof typeof testData} */ (input)];
			const actual = parse_as_bytes(input);
			expect(actual, `Testing input '${input}'`).toBe(expected);
		});
	});
});
