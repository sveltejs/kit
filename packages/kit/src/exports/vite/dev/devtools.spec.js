import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { expect, test } from 'vitest';
import { create_devtools_channel, get_devtools_auth_config } from './devtools.js';

/** @param {Partial<import('./devtools.js').DevtoolsAuthOptions>} [options] */
function setup(options) {
	const hot = new EventEmitter();
	/** @type {string[]} */
	const logs = [];
	const storage_file = path.join(
		fs.mkdtempSync(path.join(os.tmpdir(), 'kit-devtools-')),
		'auth.json'
	);

	const auth = {
		client_auth: true,
		client_auth_tokens: [],
		storage_file,
		get_urls: () => ['http://localhost:5173/'],
		log: (/** @type {string} */ message) => logs.push(message),
		...options
	};

	const channel = create_devtools_channel(/** @type {any} */ (hot), auth);

	function connect() {
		/** @type {Array<[string, any]>} */
		const received = [];
		const client = {
			send: (/** @type {string} */ event, /** @type {any} */ data) => received.push([event, data])
		};
		/** @param {string} event @param {any} [data] */
		const send = (event, data) => hot.emit(event, data, client);
		return { received, send };
	}

	const code = () => /code \S*?(\d{6})/.exec(logs.at(-1) ?? '')?.[1] ?? '';

	return { channel, connect, logs, code, auth };
}

test('requires a code from the terminal before subscribing', () => {
	const { channel, connect, logs, code } = setup();
	const client = connect();

	client.send('sveltekit:devtools:subscribe', {});
	expect(client.received.at(-1)?.[0]).toBe('sveltekit:devtools:unauthorized');
	expect(channel.active).toBe(false);

	client.send('sveltekit:devtools:request-code');
	expect(logs.at(-1)).toContain(`http://localhost:5173/#sveltekit_devtools_code=${code()}`);

	client.send('sveltekit:devtools:exchange', { code: code() });
	const [event, data] = client.received.at(-1) ?? [];
	expect(event).toBe('sveltekit:devtools:subscribed');
	expect(channel.active).toBe(true);

	const other = connect();
	other.send('sveltekit:devtools:subscribe', { token: data.token });
	expect(other.received.at(-1)?.[0]).toBe('sveltekit:devtools:subscribed');
});

test('persists issued tokens across dev server restarts', () => {
	const first = setup();
	const client = first.connect();
	client.send('sveltekit:devtools:request-code');
	client.send('sveltekit:devtools:exchange', { code: first.code() });
	const token = client.received.at(-1)?.[1].token;

	const second = setup({ storage_file: first.auth.storage_file });
	const again = second.connect();
	again.send('sveltekit:devtools:subscribe', { token });
	expect(again.received.at(-1)?.[0]).toBe('sveltekit:devtools:subscribed');
});

test('rotates the code after too many wrong guesses', () => {
	const { connect, code } = setup();
	const client = connect();
	client.send('sveltekit:devtools:request-code');
	const original = code();

	for (let i = 0; i < 5; i += 1) client.send('sveltekit:devtools:exchange', { code: 'nope' });

	client.send('sveltekit:devtools:exchange', { code: original });
	expect(client.received.at(-1)).toEqual([
		'sveltekit:devtools:unauthorized',
		{ reason: 'invalid code' }
	]);
});

test('trusts clientAuthTokens and skips the code when clientAuth is false', () => {
	const tokens = setup({ client_auth_tokens: ['ci'] }).connect;
	const client = tokens();
	client.send('sveltekit:devtools:subscribe', { token: 'ci' });
	expect(client.received.at(-1)?.[0]).toBe('sveltekit:devtools:subscribed');

	const open = setup({ client_auth: false }).connect();
	open.send('sveltekit:devtools:subscribe', {});
	expect(open.received.at(-1)?.[0]).toBe('sveltekit:devtools:subscribed');
});

test('reads auth options from the resolved vite devtools config, then the user config', () => {
	expect(get_devtools_auth_config({ config: { clientAuth: false } }, { clientAuth: true })).toEqual(
		{
			client_auth: false,
			client_auth_tokens: []
		}
	);
	expect(get_devtools_auth_config(false, { enabled: false, clientAuthTokens: ['a'] })).toEqual({
		client_auth: true,
		client_auth_tokens: ['a']
	});
});
