import { expect, test, describe } from 'vitest';
import { parse_as_bytes, parse_origin } from '../utils.js';

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

describe('parse_origin', () => {
	test('valid origins return normalized origin', () => {
		const testCases = [
			{ input: 'http://localhost:3000', expected: 'http://localhost:3000' },
			{ input: 'https://example.com', expected: 'https://example.com' },
			{ input: 'http://192.168.1.1:8080', expected: 'http://192.168.1.1:8080' },
			{ input: 'https://my-site.com', expected: 'https://my-site.com' },
			{ input: 'http://localhost', expected: 'http://localhost' },
			{ input: 'https://example.com:443', expected: 'https://example.com' },
			{ input: 'http://example.com:80', expected: 'http://example.com' },
			{ input: undefined, expected: undefined }
		];

		testCases.forEach(({ input, expected }) => {
			const actual = parse_origin(input);
			expect(actual, `Testing input '${input}'`).toBe(expected);
		});
	});

	test('URLs with path/query/hash are normalized to origin', () => {
		const testCases = [
			{ input: 'http://localhost:3000/path', expected: 'http://localhost:3000' },
			{ input: 'http://localhost:3000?query=1', expected: 'http://localhost:3000' },
			{ input: 'http://localhost:3000#hash', expected: 'http://localhost:3000' },
			{ input: 'https://example.com/path/to/page', expected: 'https://example.com' },
			{ input: 'https://example.com:443/path?query=1#hash', expected: 'https://example.com' }
		];

		testCases.forEach(({ input, expected }) => {
			const actual = parse_origin(input);
			expect(actual, `Testing input '${input}'`).toBe(expected);
		});
	});

	test('invalid origins return undefined', () => {
		const invalidInputs = ['localhost:3000', 'example.com', '', '   ', 'ftp://localhost:3000'];

		invalidInputs.forEach((input) => {
			const actual = parse_origin(input);
			expect(actual, `Testing input '${input}'`).toBeUndefined();
		});
	});
});
