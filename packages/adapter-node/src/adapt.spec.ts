import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import adapter from '../index.js';

test('adapt writes index.js with a shebang', async () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sveltekit-adapter-node-test-'));
	try {
		const out = path.join(tmp, 'build');
		const a = adapter({ out, precompress: false });

		/** @type {any} */
		const builder = {
			config: { paths: { base: '', origin: '' } },
			log: { minor: () => {} },
			writeClient: () => {
				fs.mkdirSync(path.join(out, 'client'), { recursive: true });
				return [];
			},
			writePrerendered: () => [],
			compress: async () => [],
			prerendered: { paths: [] },
			getServerDirectory: () => path.join(tmp, 'server'),
			generateServerInstance: () => {},
			hasServerInstrumentationFile: () => false,
			copy: () => {},
			getAppPath: () => '_app',
			mimeTypes: {}
		};

		fs.mkdirSync(path.join(tmp, 'server'), { recursive: true });

		await a.adapt(builder as any);

		const index_content = fs.readFileSync(path.join(out, 'index.js'), 'utf8');
		expect(index_content.startsWith('#!/usr/bin/env node\n')).toBe(true);
	} finally {
		fs.rmSync(tmp, { force: true, recursive: true });
	}
});
