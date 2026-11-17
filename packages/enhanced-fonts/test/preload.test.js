import { describe, expect, test } from 'vitest';
import { filter_preloads } from '../src/preload.js';

const latin = {
	href: '/_app/immutable/fonts/a-latin.woff2',
	type: 'font/woff2',
	subset: 'latin'
};

const cjk = {
	href: '/_app/immutable/fonts/a-japanese.woff2',
	type: 'font/woff2',
	subset: 'japanese'
};

describe('preload filter', () => {
	test('default preload off returns no links', () => {
		expect(filter_preloads([latin, cjk], false)).toEqual([]);
	});

	test('preload true emits latin faces and skips CJK subsets', () => {
		const links = filter_preloads([latin, cjk], true);
		expect(links).toEqual([latin]);
	});

	test('duplicate Inter hrefs at indexes 0 and 1 collapse to one preload', () => {
		const href = '/_app/immutable/fonts/inter-400-normal.c9407645.woff2';
		const first = { href, type: 'font/woff2', subset: 'latin' };
		const second = { href, type: 'font/woff2', subset: 'latin' };
		const links = filter_preloads([first, second], true);
		expect(links).toHaveLength(1);
		expect(links[0].href).toBe(href);
		expect(new Set(links.map((entry) => entry.href)).size).toBe(links.length);
	});
});
