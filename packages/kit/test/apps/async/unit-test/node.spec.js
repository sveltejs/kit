import { execSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { expect, test } from 'vitest';

const timeout = 60_000;

const cwd = path.resolve(import.meta.dirname, '..');

test('SvelteKit runtime JS files stay stable between rebuilds', { timeout }, () => {
	execSync('pnpm build', {
		cwd,
		stdio: 'pipe',
		timeout
	});

	const before = get_client_chunk_name();

	execSync('pnpm build', {
		cwd,
		stdio: 'pipe',
		timeout
	});

	expect(get_client_chunk_name()).toBe(before);

	function get_client_chunk_name() {
		const start_file = fs
			.readdirSync(
				path.join(import.meta.dirname, '../.svelte-kit/output/client/_app/immutable/entry')
			)
			.find((file) => file.startsWith('start.'));
		if (!start_file) {
			throw new Error('start file not found, test needs adjustment');
		}
		const start_content = fs.readFileSync(
			path.join(
				import.meta.dirname,
				'../.svelte-kit/output/client/_app/immutable/entry',
				start_file
			),
			'utf-8'
		);
		const chunk_file = start_content.match(/import .+? from "\.\.\/chunks\/([^"]+)"/)?.[1];
		if (!chunk_file) {
			throw new Error('chunk file not found, test needs adjustment');
		}
		return chunk_file;
	}
});

test("Sourcemaps aren't broken", { timeout }, () => {
	const result = spawnSync('pnpm', ['build'], {
		cwd,
		encoding: 'utf-8',
		timeout
	});

	expect(result.error).toBeUndefined();
	expect(result.stderr).not.toContain('[SOURCEMAP_BROKEN] Sourcemap is likely to be incorrect');
});
