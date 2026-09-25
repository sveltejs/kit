import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import adapter from './index.js';

const directories: string[] = [];

afterEach(() => {
	vi.restoreAllMocks();

	for (const directory of directories.splice(0)) {
		rmSync(directory, { recursive: true, force: true });
	}
});

async function buildServer(index: string, chunks: Record<string, string>) {
	const directory = mkdtempSync(join(process.cwd(), '.test-tmp-'));
	directories.push(directory);

	const server = join(directory, 'server');
	mkdirSync(join(server, 'chunks'), { recursive: true });
	writeFileSync(join(server, 'index.js'), index);
	writeFileSync(join(server, 'manifest.js'), `export const manifest = {};`);

	for (const [name, contents] of Object.entries(chunks)) {
		writeFileSync(join(server, 'chunks', name), contents);
	}

	const out = join(directory, 'build');

	await adapter({ out, precompress: false }).adapt({
		config: { kit: { paths: { base: '' } } },
		prerendered: { paths: [] },
		getBuildDirectory: () => join(directory, '.svelte-kit'),
		getServerDirectory: () => server,
		rimraf: (path: string) => rmSync(path, { recursive: true, force: true }),
		mkdirp: (path: string) => mkdirSync(path, { recursive: true }),
		copy: (from: string, to: string) => cpSync(from, to, { recursive: true }),
		writeClient: () => {},
		writePrerendered: () => {},
		compress: async () => {},
		log: { minor: () => {} }
	} as any);

	return out;
}

test('does not generate chunks for tree-shaken server modules', async () => {
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	const out = await buildServer(
		`import { empty } from './chunks/empty.js';\nimport { used } from './chunks/used.js';\nexport class Server { static used = used; }`,
		{
			'empty.js': `export const empty = {};`,
			'used.js': `export const used = 'used';`
		}
	);

	expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('Generated an empty chunk'));
	expect(readdirSync(join(out, 'server/chunks/chunks')).sort()).toEqual([
		expect.stringMatching(/^used\.js-.*\.js$/),
		expect.stringMatching(/^used\.js-.*\.js\.map$/)
	]);
});

test('retains path-derived chunks for side-effect-only server modules', async () => {
	const out = await buildServer(`import './chunks/side-effect.js';\nexport class Server {}`, {
		'side-effect.js': `globalThis.side_effect_ran = true;`
	});

	expect(readdirSync(join(out, 'server/chunks/chunks')).sort()).toEqual([
		expect.stringMatching(/^side-effect\.js-.*\.js$/),
		expect.stringMatching(/^side-effect\.js-.*\.js\.map$/)
	]);
});
