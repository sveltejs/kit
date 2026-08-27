import { mock } from 'bun:test';

// bun:test fixes a mocked module's export names on first registration and only
// updates their values afterwards, so every mock must supply the union of the
// exports that src modules pull from these build-generated specifiers

export function mock_manifest({
	app_dir,
	base,
	embed,
	origin,
	env_prefix = ''
}: {
	app_dir?: string;
	base?: string;
	embed?: boolean;
	origin?: string;
	env_prefix?: string;
} = {}) {
	mock.module('MANIFEST', () => ({ app_dir, base, embed, origin, env_prefix }));
}

export function mock_routes({
	routes,
	server_assets
}: { routes?: unknown; server_assets?: unknown } = {}) {
	mock.module('ROUTES', () => ({ routes, server_assets }));
}
