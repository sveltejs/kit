import process from 'node:process';
import { describe, test, expect, vi } from 'vitest';
import { matches, get_publish_directory } from './utils.js';

/**
 * Helper to create a static route segment
 * @param {string} content
 * @returns {{ rest: boolean, dynamic: boolean, content: string }}
 */
function static_segment(content) {
	return { rest: false, dynamic: false, content };
}

/**
 * Helper to create a dynamic route segment
 * @param {string} content
 * @returns {{ rest: boolean, dynamic: boolean, content: string }}
 */
function dynamic_segment(content) {
	return { rest: false, dynamic: true, content };
}

/**
 * Helper to create a rest route segment
 * @param {string} content
 * @returns {{ rest: boolean, dynamic: boolean, content: string }}
 */
function rest_segment(content) {
	return { rest: true, dynamic: true, content };
}

describe('matches', () => {
	test('two identical static routes match', () => {
		expect(
			matches(
				[static_segment('blog'), static_segment('post')],
				[static_segment('blog'), static_segment('post')]
			)
		).toBe(true);
	});

	test('static segment mismatch returns false', () => {
		expect(matches([static_segment('blog')], [static_segment('about')])).toBe(false);
	});

	test('dynamic segment matches any static segment', () => {
		expect(matches([static_segment('blog')], [dynamic_segment('[slug]')])).toBe(true);
	});

	test('rest segment at end matches everything', () => {
		expect(
			matches([static_segment('blog'), static_segment('post')], [rest_segment('[...rest]')])
		).toBe(true);
	});

	test('rest-only route matches any route', () => {
		expect(
			matches(
				[static_segment('a'), static_segment('b'), static_segment('c')],
				[rest_segment('[...rest]')]
			)
		).toBe(true);
	});

	test('rest segment matches remaining segments', () => {
		expect(
			matches(
				[static_segment('blog'), static_segment('2024'), static_segment('post')],
				[static_segment('blog'), rest_segment('[...rest]')]
			)
		).toBe(true);
	});

	test('empty segments (index routes)', () => {
		expect(matches([], [])).toBe(false);
	});

	test('mismatched lengths without rest return false', () => {
		expect(
			matches([static_segment('blog'), static_segment('post')], [static_segment('blog')])
		).toBe(false);
	});

	test('rest with following segments', () => {
		expect(
			matches(
				[static_segment('a'), static_segment('b'), static_segment('page')],
				[rest_segment('[...rest]'), static_segment('page')]
			)
		).toBe(true);
	});

	test('rest with following segments that do not match', () => {
		expect(
			matches(
				[static_segment('a'), static_segment('b'), static_segment('other')],
				[rest_segment('[...rest]'), static_segment('page')]
			)
		).toBe(false);
	});

	test('a has trailing rest and b is shorter', () => {
		expect(matches([rest_segment('[...rest]')], [static_segment('blog')])).toBe(true);
	});

	test('a is longer without rest in b', () => {
		expect(matches([static_segment('a'), static_segment('b')], [static_segment('a')])).toBe(false);
	});

	test('b is longer without rest in a', () => {
		expect(matches([static_segment('a')], [static_segment('a'), static_segment('b')])).toBe(false);
	});

	test('dynamic in a matches static in b', () => {
		expect(matches([dynamic_segment('[id]')], [static_segment('blog')])).toBe(true);
	});

	test('both dynamic segments match', () => {
		expect(matches([dynamic_segment('[id]')], [dynamic_segment('[slug]')])).toBe(true);
	});
});

describe('get_publish_directory', () => {
	test('returns undefined when no netlify.toml, with warning logged', () => {
		const warn = vi.fn();
		const builder = /** @type {any} */ ({ log: { warn, minor: vi.fn() } });

		const result = get_publish_directory(null, builder);

		expect(result).toBeUndefined();
		expect(warn).toHaveBeenCalledOnce();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('No netlify.toml found'));
	});

	test('returns undefined when config has no build.publish, with minor log', () => {
		const minor = vi.fn();
		const builder = /** @type {any} */ ({ log: { warn: vi.fn(), minor } });

		const result = get_publish_directory({ build: {} }, builder);

		expect(result).toBeUndefined();
		expect(minor).toHaveBeenCalledOnce();
		expect(minor).toHaveBeenCalledWith(expect.stringContaining('No publish directory specified'));
	});

	test('returns the publish value when specified', () => {
		const builder = /** @type {any} */ ({ log: { warn: vi.fn(), minor: vi.fn() } });

		const result = get_publish_directory({ build: { publish: 'dist' } }, builder);

		expect(result).toBe('dist');
	});

	test('throws when publish is site root', () => {
		const builder = /** @type {any} */ ({ log: { warn: vi.fn(), minor: vi.fn() } });

		expect(() => get_publish_directory({ build: { publish: process.cwd() } }, builder)).toThrow(
			'The publish directory cannot be set to the site root'
		);
	});
});
