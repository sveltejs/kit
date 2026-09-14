/** @import { ActionResult } from './types.js' */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { init_transport, stringify } from '#app/internal/transport';

vi.mock(new URL('../../client/client.js', import.meta.url).pathname, () => ({
	applyAction: vi.fn(() => Promise.resolve()),
	apply_action_navigation: vi.fn(() => Promise.resolve()),
	handle_error: vi.fn((/** @type {Error} */ error) => Promise.resolve({ message: error.message })),
	is_current_location: () => true
}));
vi.mock(new URL('../navigation/index.js', import.meta.url).pathname, () => ({
	refreshAll: vi.fn(() => Promise.resolve())
}));
vi.mock('#app/state/client', () => ({ notify_version: () => {} }));

const { enhance } = await import('./client.js');
const { applyAction, apply_action_navigation, handle_error } =
	await import('../../client/client.js');

beforeEach(() => {
	vi.clearAllMocks();
	init_transport({});
});

afterEach(() => {
	vi.unstubAllGlobals();
	document.body.replaceChildren();
});

/**
 * @param {Response} response
 * @param {string} destination
 */
function redirected(response, destination) {
	return Object.defineProperties(response, {
		redirected: { value: true },
		url: { value: new URL(destination, location.href).href }
	});
}

/**
 * @param {boolean} [apply_default]
 * @returns {Promise<ActionResult>}
 */
async function submit_form(apply_default = true) {
	const form = document.createElement('form');
	form.method = 'post';
	form.action = location.href;
	form.innerHTML = '<input name="message" value="hello">';
	document.body.append(form);
	let destroy = () => {};

	try {
		/** @type {Promise<ActionResult>} */
		const completion = new Promise((resolve, reject) => {
			({ destroy } = enhance(form, () => ({ result, update }) => {
				const applied = apply_default ? update() : Promise.resolve();
				return applied.then(() => resolve(result), reject);
			}));
			const event = new SubmitEvent('submit', { bubbles: true, cancelable: true });
			form.dispatchEvent(event);
			expect(event.defaultPrevented).toBe(true);
		});
		return await completion;
	} finally {
		destroy();
		form.remove();
	}
}

describe('enhanced form HTTP redirects', () => {
	test('navigates with the default enhance callback', async () => {
		const response = redirected(new Response('<h1>Sign in</h1>'), '/login');
		vi.stubGlobal('fetch', () => Promise.resolve(response));
		const form = document.createElement('form');
		form.method = 'post';
		document.body.append(form);
		const { destroy } = enhance(form);

		try {
			form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
			await vi.waitFor(() => expect(applyAction).toHaveBeenCalledOnce());
			expect(applyAction).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'redirect', location: response.url })
			);
		} finally {
			destroy();
		}
	});

	test.each(['/login', 'https://login.example.test/sso'])(
		'navigates to the readable HTML redirect destination %s',
		async (destination) => {
			const response = redirected(
				new Response('<h1>Sign in</h1>', { headers: { 'content-type': 'text/html' } }),
				destination
			);
			const fetch = vi.fn(() => Promise.resolve(response));
			vi.stubGlobal('fetch', fetch);

			const result = await submit_form();
			expect(result).toMatchObject({ type: 'redirect', location: response.url });
			expect(applyAction).toHaveBeenCalledWith(result);
			expect(handle_error).not.toHaveBeenCalled();
			expect(fetch).toHaveBeenCalledOnce();
		}
	);

	test('lets the custom callback control navigation', async () => {
		const response = redirected(new Response('<h1>Sign in</h1>'), '/login');
		vi.stubGlobal('fetch', () => Promise.resolve(response));

		expect(await submit_form(false)).toMatchObject({ type: 'redirect', location: response.url });
		expect(applyAction).not.toHaveBeenCalled();
		expect(apply_action_navigation).not.toHaveBeenCalled();
	});

	test('navigates when the redirected login page responds with an HTTP error', async () => {
		const response = redirected(new Response('<h1>Sign in</h1>', { status: 401 }), '/login');
		vi.stubGlobal('fetch', () => Promise.resolve(response));

		expect(await submit_form()).toMatchObject({ type: 'redirect', location: response.url });
	});

	test('navigates when the redirect response is JSON without an ActionResult', async () => {
		const response = redirected(Response.json({ message: 'Sign in' }), '/login');
		vi.stubGlobal('fetch', () => Promise.resolve(response));

		expect(await submit_form()).toMatchObject({ type: 'redirect', location: response.url });
	});

	test.each(['success', 'failure'])('preserves a redirected JSON %s ActionResult', async (type) => {
		const result = {
			type,
			status: type === 'success' ? 200 : 422,
			data: { message: 'Action result' },
			location: location.href
		};
		const response = redirected(
			Response.json({ ...result, data: stringify(result.data) }, { status: result.status }),
			'/canonical'
		);
		vi.stubGlobal('fetch', () => Promise.resolve(response));

		expect(await submit_form()).toEqual(result);
		expect(applyAction).toHaveBeenCalledWith(result);
	});

	test('reports non-redirected HTML as an error', async () => {
		vi.stubGlobal('fetch', () => Promise.resolve(new Response('<h1>Not an action</h1>')));

		expect(await submit_form()).toMatchObject({ type: 'error' });
		expect(handle_error).toHaveBeenCalledOnce();
	});

	test('reports an unreadable CORS or network response without retrying the submission', async () => {
		const error = new TypeError('Failed to fetch');
		const fetch = vi.fn(() => Promise.reject(error));
		vi.stubGlobal('fetch', fetch);

		expect(await submit_form()).toMatchObject({ type: 'error', error: { message: error.message } });
		expect(handle_error).toHaveBeenCalledWith(error, expect.anything());
		expect(fetch).toHaveBeenCalledOnce();
	});
});
