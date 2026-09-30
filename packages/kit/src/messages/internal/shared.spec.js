import { afterEach, expect, test, vi } from 'vitest';
import { diagnostic_url } from '../../../test/diagnostics.js';

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

test.each([
	{ DEV: true, BROWSER: false },
	{ DEV: true, BROWSER: true }
])('shared warnings include the full text when DEV=$DEV and BROWSER=$BROWSER', async (flags) => {
	Object.assign(env, flags);
	const w = await import('../shared-warnings.js');
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

	w.asset_leading_slash({ path: '/a.png', fixed: 'a.png' });

	// the code is bold, like Svelte's warnings
	expect(warn).toHaveBeenCalledWith(
		expect.stringMatching(/^%c\[sveltekit\] asset_leading_slash\n%c/),
		'font-weight: bold',
		'font-weight: normal'
	);
	expect(warn).toContainKitDiagnostic('asset_leading_slash', {
		contains: ["asset('/a.png')", "asset('a.png')"]
	});
	warn.mockRestore();
});

// unlike shared errors, `verbose` doesn't apply: build warnings have their own template
test.each([
	{ DEV: false, BROWSER: false, verbose: true },
	{ DEV: false, BROWSER: true, verbose: false }
])(
	'shared warnings only include the URL when DEV=$DEV, BROWSER=$BROWSER and verbose=$verbose',
	async ({ verbose, ...flags }) => {
		Object.assign(env, flags);
		const [w, shared] = await Promise.all([import('../shared-warnings.js'), import('./shared.js')]);
		if (verbose) shared.enable_verbose_errors();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		w.asset_leading_slash({ path: '/a.png', fixed: 'a.png' });

		expect(warn).toHaveBeenCalledWith(diagnostic_url('asset_leading_slash'));
		warn.mockRestore();
	}
);

test.each([
	{ DEV: false, BROWSER: false },
	{ DEV: true, BROWSER: false }
])('server errors include the full text when DEV=$DEV', async (flags) => {
	Object.assign(env, flags);
	const e = await import('../server-errors.js');

	expect(() => e.read_asset_missing({ file: 'a.txt' })).toThrowKitError('read_asset_missing', {
		contains: ['a.txt']
	});
});

test('server errors support stackless errors and causes', async () => {
	const e = await import('../server-errors.js');
	const cause = new Error('cause');

	expect(() => e.read_implementation_missing(undefined, { stackless: true })).toThrowKitError(
		'read_implementation_missing',
		{ stackless: true }
	);
	expect(() => e.read_implementation_missing()).toThrowKitError('read_implementation_missing', {
		stackless: false
	});

	expect(() => e.read_implementation_missing(undefined, { cause })).toThrowKitError(
		'read_implementation_missing',
		{ cause }
	);
	expect(() => e.read_implementation_missing()).toThrowKitError('read_implementation_missing', {
		cause: undefined
	});
});

test.each([
	{ DEV: true, url_only: false },
	{ DEV: false, url_only: true }
])('server warnings when DEV=$DEV', async ({ DEV, url_only }) => {
	env.DEV = DEV;
	const w = await import('../server-warnings.js');
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

	w.content_type_invalid({ type: 'a', value: 'a; b' });

	expect(warn).toHaveBeenCalledOnce();
	if (url_only) {
		expect(warn).toHaveBeenCalledWith(diagnostic_url('content_type_invalid'));
	} else {
		expect(warn).toContainKitDiagnostic('content_type_invalid', { contains: ['"a"', '"a; b"'] });
	}
	warn.mockRestore();
});

test('capture_error returns the server error instead of throwing it, keeping its cause and call site', async () => {
	const [e, { capture_error }] = await Promise.all([
		import('../server-errors.js'),
		import('./server.js')
	]);
	const cause = new Error('cause');

	function call_site() {
		return capture_error(() => e.load_promise_not_serializable({ id: '/a' }, { cause }));
	}
	const error = call_site();

	expect(error).toBeKitError('load_promise_not_serializable', { contains: ['/a'], cause });
	const frames = /** @type {string} */ (error.stack)
		.split('\n')
		.filter((line) => line.startsWith('    at '));
	expect(frames.some((frame) => frame.includes('call_site'))).toBe(true);
	expect(error.stack).not.toContain('throw_error');
});
