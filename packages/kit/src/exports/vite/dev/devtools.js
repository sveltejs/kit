/** @import { NormalizedHotChannel, NormalizedHotChannelClient } from 'vite' */
/** @import { DevtoolsChannel } from 'types' */
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { formatWithOptions, styleText } from 'node:util';

const CODE_LENGTH = 6;
const CODE_TTL = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/**
 * @typedef {{
 *   client_auth: boolean;
 *   client_auth_tokens: string[];
 *   storage_file: string;
 *   get_urls: () => string[];
 *   log: (message: string) => void;
 * }} DevtoolsAuthOptions
 */

/**
 * reads clientAuth and clientAuthTokens from the resolved vite devtools config, or from the
 * user config when @vitejs/devtools is not installed or is disabled
 * @param {unknown} resolved config.devtools of the resolved vite config
 * @param {unknown} user devtools option of the user vite config
 */
export function get_devtools_auth_config(resolved, user) {
	/** @type {{ clientAuth?: boolean, clientAuthTokens?: string[] }} */
	const options =
		resolved && typeof resolved === 'object' && 'config' in resolved
			? /** @type {any} */ (resolved).config
			: user && typeof user === 'object'
				? user
				: {};

	return {
		client_auth: options.clientAuth ?? true,
		client_auth_tokens: options.clientAuthTokens ?? []
	};
}

/**
 * events go only to subscribed clients, and like vite devtools a new browser must first exchange a
 * one time code printed in the terminal for a token, unless clientAuth is false
 * @param {NormalizedHotChannel} hot hmr channel of the client environment
 * @param {DevtoolsAuthOptions} auth
 * @returns {DevtoolsChannel}
 */
export function create_devtools_channel(hot, auth) {
	/** @type {Set<NormalizedHotChannelClient>} */
	const clients = new Set();

	const static_tokens = new Set(auth.client_auth_tokens);
	const issued_tokens = read_tokens(auth.storage_file);

	let code = '';
	let code_expires_at = 0;
	let failed_attempts = 0;
	let printed_code = '';

	function rotate_code() {
		code = String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
		code_expires_at = Date.now() + CODE_TTL;
		failed_attempts = 0;
	}

	function current_code() {
		if (!code || Date.now() > code_expires_at) rotate_code();
		return code;
	}

	/** @param {unknown} token */
	function is_trusted(token) {
		if (!auth.client_auth) return true;
		return typeof token === 'string' && (static_tokens.has(token) || issued_tokens.has(token));
	}

	/**
	 * @param {NormalizedHotChannelClient} client
	 * @param {string} [token]
	 */
	function subscribe(client, token) {
		clients.add(client);
		client.send('sveltekit:devtools:subscribed', { version: 1, ...(token && { token }) });
	}

	hot.on('sveltekit:devtools:subscribe', (data, client) => {
		const token = data?.token;
		if (is_trusted(token)) {
			subscribe(client);
		} else {
			client.send('sveltekit:devtools:unauthorized', {});
		}
	});

	hot.on('sveltekit:devtools:request-code', (_data, client) => {
		const value = current_code();
		client.send('sveltekit:devtools:code-requested', {});

		// every requester gets the same code, so print it once
		if (value === printed_code) return;
		printed_code = value;

		const fragment = `#sveltekit_devtools_code=${value}`;
		const links = auth.get_urls().map((url) => `  ${styleText('cyan', url + fragment)}`);
		auth.log(
			[
				`${styleText('bold', 'SvelteKit devtools')} code ${styleText(['bold', 'green'], value)}, expires at ${new Date(code_expires_at).toLocaleTimeString()}`,
				...(links.length ? ['  or open', ...links] : [])
			].join('\n')
		);
	});

	hot.on('sveltekit:devtools:exchange', (data, client) => {
		const expected = current_code();
		const given = typeof data?.code === 'string' ? data.code : '';

		if (!safe_equal(given, expected)) {
			failed_attempts += 1;
			if (failed_attempts >= MAX_ATTEMPTS) rotate_code();
			client.send('sveltekit:devtools:unauthorized', { reason: 'invalid code' });
			return;
		}

		const token = randomBytes(32).toString('base64url');
		issued_tokens.add(token);
		write_tokens(auth.storage_file, issued_tokens);
		rotate_code();

		subscribe(client, token);
	});

	hot.on('sveltekit:devtools:unsubscribe', (_data, client) => {
		clients.delete(client);
	});

	hot.on('vite:client:disconnect', (_data, client) => {
		clients.delete(client);
	});

	return {
		get active() {
			return clients.size > 0;
		},
		send(event) {
			for (const client of clients) {
				client.send('sveltekit:devtools', event);
			}
		},
		format(args) {
			return formatWithOptions({ colors: false }, ...args);
		}
	};
}

/**
 * @param {string} a
 * @param {string} b
 */
function safe_equal(a, b) {
	const x = Buffer.from(a);
	const y = Buffer.from(b);
	return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * @param {string} file
 * @returns {Set<string>}
 */
function read_tokens(file) {
	try {
		const tokens = JSON.parse(fs.readFileSync(file, 'utf-8')).tokens;
		return new Set(Array.isArray(tokens) ? tokens : []);
	} catch {
		return new Set();
	}
}

/**
 * @param {string} file
 * @param {Set<string>} tokens
 */
function write_tokens(file, tokens) {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, JSON.stringify({ tokens: [...tokens] }), { mode: 0o600 });
}
