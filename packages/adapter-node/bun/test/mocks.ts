import { mock } from 'bun:test';

// bun:test fixes a mocked module's export names on first registration and only
// updates their values afterwards, so every mock supplies the union of the
// exports that src modules pull from the generated hand-off module
export function mock_handoff({
	server,
	dir = '/build',
	app_dir = '_app',
	base = '/',
	embed = false,
	env_prefix = '',
	origin,
	server_options = {},
	assets = [],
	redirects = [],
	server_assets = []
}: {
	server?: unknown;
	dir?: string;
	app_dir?: string;
	base?: string;
	embed?: boolean;
	env_prefix?: string;
	origin?: string;
	server_options?: unknown;
	assets?: unknown[];
	redirects?: unknown[];
	server_assets?: unknown[];
} = {}) {
	mock.module('#@sveltejs/adapter-bun', () => ({
		server,
		dir,
		app_dir,
		base,
		embed,
		env_prefix,
		origin,
		server_options,
		assets,
		redirects,
		server_assets
	}));
}
