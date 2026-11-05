/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { RequestState } from 'types' */
import { expect, test, vi } from 'vitest';
import { fail, redirect } from '@sveltejs/kit';
import { ActionFailure } from '@sveltejs/kit/internal';
import { init_transport } from '#app/internal/transport';

vi.stubGlobal('__SVELTEKIT_DEV__', false);
init_transport({});

const { get_action_location, handle_action_request, uneval_action_response } =
	await import('./actions.js');

/** @param {string} [search] */
function create_event(search = '') {
	return /** @type {RequestEvent} */ (
		/** @type {unknown} */ ({
			request: new Request(`http://localhost/a${search}`, {
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: ''
			}),
			url: new URL(`http://localhost/a${search}`),
			route: { id: '/a' }
		})
	);
}

const state = /** @type {RequestState} */ (/** @type {unknown} */ ({}));

test('action locations with leading double slashes remain same-origin', () => {
	const url = new URL('https://example.com//attacker.example/path?/action&foo=bar');
	const destination = new URL(get_action_location(url), url);

	expect(destination.origin).toBe(url.origin);
	expect(destination.pathname).toBe(url.pathname);
	expect(destination.search).toBe('?foo=bar');
});

test('returns an error result, rather than throwing, when an action throws fail()', async () => {
	const result = await handle_action_request(create_event(), state, {
		actions: {
			default: () => {
				throw fail(400);
			}
		}
	});

	expect(result.type).toBe('error');
	const error = /** @type {{ error: unknown }} */ (result).error;
	expect(error).toBeKitError('action_throw_fail');
	expect(error).not.toBeInstanceOf(ActionFailure);
});

test('still returns a failure result for a returned fail()', async () => {
	const result = await handle_action_request(create_event(), state, {
		actions: { default: () => fail(400, { missing: true }) }
	});

	expect(result).toEqual({ type: 'failure', status: 400, location: '/a', data: { missing: true } });
});

test('returning redirect() from an action is an error', async () => {
	const result = await handle_action_request(create_event(), state, {
		actions: {
			// @ts-expect-error `redirect` returns `never`, but this tests the misuse
			default: () => {
				try {
					redirect(303, '/b');
				} catch (redirect) {
					return redirect;
				}
			}
		}
	});

	expect(/** @type {{ error: unknown }} */ (result).error).toBeKitError('action_return_redirect');
});

test('default and named actions cannot be mixed', async () => {
	await expect(
		handle_action_request(create_event(), state, {
			actions: { default: () => {}, other: () => {} }
		})
	).rejects.toThrowKitError('action_default_with_named');
});

test('?/default is reserved', async () => {
	const result = await handle_action_request(create_event('?/default'), state, {
		actions: { default: () => {} }
	});

	expect(/** @type {{ error: unknown }} */ (result).error).toBeKitError('action_name_reserved');
});

test.each([
	[{ nope: () => {} }, '(`data.nope`)'],
	[{ 'a-b': { c: () => {} } }, '(`data["a-b"].c`)'],
	[{ a: [1, () => {}] }, '(`data.a[1]`)']
])(
	'explains unserializable action data %#, with its path, and keeps the devalue error as the cause',
	(data, path) => {
		/** @type {unknown} */
		let error;
		try {
			uneval_action_response(data, '/a');
		} catch (e) {
			error = e;
		}

		expect(error).toBeKitError('action_data_not_serializable', {
			contains: ['/a', `Cannot stringify a function ${path}`],
			cause: expect.objectContaining({ name: 'DevalueError' })
		});
	}
);

test('does not add a path when the returned value itself is not serializable', () => {
	/** @type {any} */
	let error;
	try {
		uneval_action_response(new (class Custom {})(), '/a');
	} catch (e) {
		error = e;
	}

	expect(error).toBeKitError('action_data_not_serializable', {
		contains: ['/a', 'Cannot stringify arbitrary non-POJOs']
	});
	expect(error.message).not.toContain('(data');
});

test('explains that actions cannot return a Response', () => {
	expect(() => uneval_action_response(new Response(), '/a')).toThrowKitError(
		'action_response_not_serializable',
		{ contains: ['/a'], cause: expect.any(Error) }
	);
});
