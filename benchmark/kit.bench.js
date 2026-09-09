import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { bench, describe, expect } from 'vitest';
import {
	create_workspace,
	generate_routes,
	repo_root,
	run,
	start_server,
	stop_server
} from './utils.js';

const kit_cli = path.join(repo_root, 'packages/kit/svelte-kit.js');
const vite_cli = path.join(repo_root, 'packages/kit/node_modules/vite/bin/vite.js');
const macro = {
	iterations: 1,
	time: 0,
	warmupIterations: 0,
	warmupTime: 0
};

let sync_app = '';
let build_app = '';
let simple_app = '';
let data_app = '';
/** @type {Awaited<ReturnType<typeof start_server>> | undefined} */
let simple_server;
/** @type {Awaited<ReturnType<typeof start_server>> | undefined} */
let data_server;

/** @param {string} workspace */
function remove_workspace(workspace) {
	fs.rmSync(workspace, { force: true, recursive: true });
}

describe('SvelteKit', () => {
	bench(
		'cold sync for a route-heavy app',
		async () => {
			await run(process.execPath, [kit_cli, 'sync'], sync_app);
			expect(fs.existsSync(path.join(sync_app, 'node_modules/$app/tsconfig.json'))).toBe(true);
			expect(
				fs.existsSync(
					path.join(sync_app, '.svelte-kit/types/src/routes/generated/static-0/$types.d.ts')
				)
			).toBe(true);
		},
		{
			...macro,
			setup: (_task, mode) => {
				if (mode === 'run') {
					sync_app = create_workspace('kit');
					generate_routes(sync_app, 72);
				}
			},
			teardown: (_task, mode) => {
				if (mode === 'run') remove_workspace(sync_app);
			}
		}
	);

	bench(
		'production build for a representative app',
		async () => {
			await run(process.execPath, [vite_cli, 'build'], build_app);
			expect(fs.existsSync(path.join(build_app, 'build/index.js'))).toBe(true);
			expect(fs.existsSync(path.join(build_app, 'build/server/chunks'))).toBe(true);
		},
		{
			...macro,
			setup: (_task, mode) => {
				if (mode === 'run') {
					build_app = create_workspace('kit');
					generate_routes(build_app, 48);
				}
			},
			teardown: (_task, mode) => {
				if (mode === 'run') remove_workspace(build_app);
			}
		}
	);

	bench(
		'simple production SSR request',
		async () => {
			if (!simple_server) throw new Error('Preview server has not started');
			const response = await fetch(simple_server.url);
			const body = await response.text();
			expect(response.status).toBe(200);
			expect(body).toContain('SvelteKit benchmark');
		},
		{
			...macro,
			setup: async (_task, mode) => {
				if (mode === 'run') {
					simple_app = create_workspace('kit');
					generate_routes(simple_app, 48);
					await run(process.execPath, [vite_cli, 'build'], simple_app);
					simple_server = await start_server(simple_app);
				}
			},
			teardown: async (_task, mode) => {
				if (mode === 'run') {
					if (simple_server) await stop_server(simple_server.child);
					remove_workspace(simple_app);
				}
			}
		}
	);

	bench(
		'data-heavy production SSR request',
		async () => {
			if (!data_server) throw new Error('Preview server has not started');
			const response = await fetch(`${data_server.url}/ssr`);
			const body = await response.text();
			expect(response.status).toBe(200);
			expect(body).toContain('benchmark-item-199');
		},
		{
			...macro,
			setup: async (_task, mode) => {
				if (mode === 'run') {
					data_app = create_workspace('kit');
					generate_routes(data_app, 48);
					await run(process.execPath, [vite_cli, 'build'], data_app);
					data_server = await start_server(data_app);
				}
			},
			teardown: async (_task, mode) => {
				if (mode === 'run') {
					if (data_server) await stop_server(data_server.child);
					remove_workspace(data_app);
				}
			}
		}
	);
});
