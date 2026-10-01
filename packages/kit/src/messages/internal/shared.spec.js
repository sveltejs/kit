import { afterEach, expect, test, vi } from 'vitest';

const env = vi.hoisted(() => ({ BROWSER: false, DEV: false }));

vi.mock('esm-env', () => ({
	get BROWSER() {
		return env.BROWSER;
	},
	get DEV() {
		return env.DEV;
	}
}));

afterEach(() => {
	env.BROWSER = false;
	env.DEV = false;
	vi.resetModules();
});

const url = 'https://next.svelte.dev/e/@sveltejs/kit/route_param_missing';
const full = `route_param_missing\nMissing parameter \`a\` in route \`/[a]\`\n${url}`;

async function load() {
	const [e, shared] = await Promise.all([import('../shared-errors.js'), import('./shared.js')]);
	return { e, shared };
}

test('shared errors include the full text in development', async () => {
	env.DEV = true;
	const { e } = await load();

	expect(() => e.route_param_missing({ name: 'a', id: '/[a]' })).toThrow(
		expect.objectContaining({ name: 'SvelteKit error', message: full })
	);
});

test('shared error stacks start at the call site', async () => {
	env.DEV = true;
	const { e } = await load();

	/** @type {any} */
	let error;
	function call_site() {
		e.route_param_missing({ name: 'a', id: '/[a]' });
	}
	try {
		call_site();
	} catch (err) {
		error = err;
	}

	const frames = error.stack
		.split('\n')
		.filter((/** @type {string} */ line) => line.startsWith('    at '));
	expect(frames[0]).toContain('call_site');
	expect(error.stack).not.toContain('throw_error');
});

test('shared errors only include the URL in production', async () => {
	const { e } = await load();

	expect(() => e.route_param_missing({ name: 'a', id: '/[a]' })).toThrow(
		expect.objectContaining({ name: 'Error', message: url })
	);
});

test('shared errors include the full text on the server when verbose errors are enabled', async () => {
	const { e, shared } = await load();
	shared.enable_verbose_errors();

	expect(() => e.route_param_missing({ name: 'a', id: '/[a]' })).toThrow(
		expect.objectContaining({ name: 'SvelteKit error', message: full })
	);
});

test('shared errors only include the URL in the browser in production', async () => {
	env.BROWSER = true;
	const { e, shared } = await load();
	shared.enable_verbose_errors();

	expect(() => e.route_param_missing({ name: 'a', id: '/[a]' })).toThrow(
		expect.objectContaining({ name: 'Error', message: url })
	);
});
