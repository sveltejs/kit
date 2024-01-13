import * as fs from 'node:fs';
import { expect, test } from '@playwright/test';

const cwd = process.cwd();
const vercel_fn_dir = `${cwd}/.vercel/output/functions`;
const serverless_functions = ['fn-0', 'fn-1', 'fn-2', 'fn'];
const assets_dir = '_app/immutable/assets';

function scan_build_output() {
	return Object.fromEntries(
		serverless_functions.map((fn) => [
			fn,
			fs.readdirSync(`${vercel_fn_dir}/${fn}.func/${assets_dir}`)
		])
	);
}

test('includes server assets from page server load functions', () => {
	const server_assets = scan_build_output();
	const server_asset = server_assets['fn-2'].find((file) => file.startsWith('_page.server.js'));
	expect(server_asset).toBeTruthy();
});

test('includes server assets from layout server load functions', () => {
	const server_assets = scan_build_output();
	for (const fn of serverless_functions) {
		const server_asset = server_assets[fn].find((file) => file.startsWith('_layout.server.js'));
		expect(server_asset).toBeTruthy();
	}
});

test('includes server assets from endpoints', () => {
	const server_assets = scan_build_output();
	const server_asset = server_assets['fn-1'].find((file) => file.startsWith('_server.js'));
	expect(server_asset).toBeTruthy();
});

test('includes server assets from server hooks', () => {
	const server_assets = scan_build_output();
	for (const fn of serverless_functions) {
		const server_asset = server_assets[fn].find((file) => file.startsWith('hooks.server.js'));
		expect(server_asset).toBeTruthy();
	}
});

test('includes server assets from transitive imports', () => {
	const server_assets = scan_build_output();
	const server_asset = server_assets['fn-0'].find((file) => file.startsWith('transitive'));
	expect(server_asset).toBeTruthy();
});

test('includes server assets of the default error page for every function', () => {
	const server_assets = scan_build_output();
	for (const fn of serverless_functions) {
		const server_asset = server_assets[fn].find((file) => file.startsWith('_layout.server.js'));
		expect(server_asset).toBeTruthy();
	}
});

test('only includes relevant server assets for split functions', () => {
	const server_assets = scan_build_output();

	for (const fn of serverless_functions) {
		const server_asset = server_assets[fn].find((file) => file.startsWith('_server.js'));
		if (fn === 'fn-1') {
			expect(server_asset).toBeTruthy();
		} else {
			expect(server_asset).toBeFalsy();
		}
	}

	for (const fn of serverless_functions) {
		const server_asset = server_assets[fn].find((file) => file.startsWith('_page.server.js'));
		if (fn === 'fn-2') {
			expect(server_asset).toBeTruthy();
		} else {
			expect(server_asset).toBeFalsy();
		}
	}
});

test('excludes server assets from universal load functions', () => {
	const server_assets = scan_build_output();

	const layout_load = server_assets['fn-2'].find((file) => file.startsWith('_layout.js'));
	const page_load = server_assets['fn-2'].find((file) => file.startsWith('_page.js'));

	expect(layout_load).toBeFalsy();
	expect(page_load).toBeFalsy();
});

test('excludes server assets from components', () => {
	const server_assets = scan_build_output();

	for (const component_name of ['_layout.svelte', '_page.svelte', '_error.svelte']) {
		const server_asset = server_assets['fn-2'].find((f) => f.startsWith(component_name));
		expect(server_asset).toBeFalsy();
	}
	for (const fn of serverless_functions) {
		const root_error = server_assets[fn].find((file) => file.startsWith('root_error'));
		expect(root_error).toBeFalsy();
	}
});
