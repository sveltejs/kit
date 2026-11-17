import process from 'node:process';
import { describe, expect, test, vi } from 'vitest';
import { resolve_families } from '../src/resolve.js';

const source = Buffer.from('wOF2-self-hosted');

function mock_google_faces() {
	return Promise.resolve([
		{
			url: 'https://fonts.gstatic.com/s/roboto/v1/latin.woff2',
			bytes: source,
			weight: '400',
			style: 'normal',
			subset: 'latin'
		}
	]);
}

describe('google provider', () => {
	test('self-hosts files and does not keep Google CDN urls', async () => {
		const resolved = await resolve_families(
			[
				{
					name: 'Roboto',
					cssVariable: '--font-roboto',
					provider: 'google',
					weights: ['400'],
					styles: ['normal'],
					subsets: ['latin']
				}
			],
			{
				root: process.cwd(),
				assets_dir: '_app/immutable',
				resolve_google: mock_google_faces
			}
		);

		const css = resolved.by_css_variable['--font-roboto'].css;
		expect(css).not.toContain('fonts.googleapis.com');
		expect(css).not.toContain('fonts.gstatic.com');
		expect(css).toContain('/_app/immutable/fonts/');
		expect(resolved.files[0].source.equals(source)).toBe(true);
	});
});

test('injected google resolver is used instead of the network', async () => {
	const resolve_google = vi.fn(mock_google_faces);
	await resolve_families(
		[
			{
				name: 'Inter',
				cssVariable: '--font-inter',
				provider: 'google'
			}
		],
		{ root: process.cwd(), assets_dir: 'assets', resolve_google }
	);
	expect(resolve_google).toHaveBeenCalledOnce();
});
