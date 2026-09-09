import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { bench, describe, expect } from 'vitest';
import { create_workspace, generate_components, repo_root, run } from './utils.js';

const package_cli = path.join(repo_root, 'packages/package/svelte-package.js');
const macro = {
	iterations: 1,
	time: 0,
	warmupIterations: 0,
	warmupTime: 0
};
let workspace = '';

describe('@sveltejs/package', () => {
	bench(
		'clean medium library build with declarations',
		async () => {
			await run(process.execPath, [package_cli], workspace);
			expect(fs.existsSync(path.join(workspace, 'dist/Component0.svelte'))).toBe(true);
			expect(fs.existsSync(path.join(workspace, 'dist/Component0.svelte.d.ts'))).toBe(true);
			expect(fs.existsSync(path.join(workspace, 'dist/helper47.js'))).toBe(true);
			expect(fs.existsSync(path.join(workspace, 'dist/helper47.d.ts'))).toBe(true);
		},
		{
			...macro,
			setup: (_task, mode) => {
				if (mode === 'run') {
					workspace = create_workspace('package');
					generate_components(workspace, 48);
				}
			},
			teardown: (_task, mode) => {
				if (mode === 'run') fs.rmSync(workspace, { force: true, recursive: true });
			}
		}
	);
});
