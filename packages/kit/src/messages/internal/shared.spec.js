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

async function load() {
	const [e, shared] = await Promise.all([import('../shared-errors.js'), import('./shared.js')]);
	return { e, shared };
}

test.each([
	{ DEV: true, BROWSER: false, verbose: false, url_only: false },
	{ DEV: true, BROWSER: true, verbose: false, url_only: false },
	{ DEV: false, BROWSER: false, verbose: false, url_only: true },
	{ DEV: false, BROWSER: false, verbose: true, url_only: false },
	{ DEV: false, BROWSER: true, verbose: true, url_only: true }
])(
	'shared errors when DEV=$DEV, BROWSER=$BROWSER and verbose=$verbose',
	async ({ verbose, url_only, ...flags }) => {
		Object.assign(env, flags);
		const { e, shared } = await load();
		if (verbose) shared.enable_verbose_errors();

		expect(() => e.route_param_missing({ name: 'a', id: '/[a]' })).toThrowKitError(
			'route_param_missing',
			url_only ? { url_only } : { contains: ['`a`', '/[a]'] }
		);
	}
);

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
