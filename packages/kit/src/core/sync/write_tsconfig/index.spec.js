import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import { process_config, validate_config } from '../../config/index.js';
import { write_tsconfig } from './index.js';

/** @type {string[]} */
const dirs = [];

afterEach(() => {
	vi.restoreAllMocks();

	for (const dir of dirs) {
		fs.rmSync(dir, { recursive: true, force: true });
	}

	dirs.length = 0;
});

test('warns with a safe root tsconfig', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'svelte-kit-tsconfig-'));
	dirs.push(root);

	fs.writeFileSync(
		path.join(root, 'tsconfig.json'),
		JSON.stringify({ extends: './.svelte-kit/tsconfig.json' })
	);

	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	const config = process_config(validate_config({}), root);
	write_tsconfig(config, root);

	expect(warn).toHaveBeenNthCalledWith(
		2,
		JSON.stringify(
			{
				extends: '$app/tsconfig',
				include: ['src', 'test', '*'],
				exclude: ['src/service-worker']
			},
			null,
			'  '
		)
	);
});
