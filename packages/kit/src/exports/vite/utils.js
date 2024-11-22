import path from 'node:path';
import { loadEnv } from 'vite';
import { posixify } from '../../utils/filesystem.js';
import { negotiate } from '../../utils/http.js';
import { filter_private_env, filter_public_env } from '../../utils/env.js';
import { escape_html } from '../../utils/escape.js';

/**
 * Transforms kit.alias to a valid vite.resolve.alias array.
 *
 * Related to tsconfig path alias creation.
 *
 * @param {import('types').ValidatedKitConfig} config
 * */
export function get_config_aliases(config) {
	/** @type {import('vite').Alias[]} */
	const alias = [
		// For now, we handle `$lib` specially here rather than make it a default value for
		// `config.kit.alias` since it has special meaning for packaging, etc.
		{ find: '$lib', replacement: config.files.lib }
	];

	for (let [key, value] of Object.entries(config.alias)) {
		value = posixify(value);
		if (value.endsWith('/*')) {
			value = value.slice(0, -2);
		}
		if (key.endsWith('/*')) {
			// Doing just `{ find: key.slice(0, -2) ,..}` would mean `import .. from "key"` would also be matched, which we don't want
			alias.push({
				find: new RegExp(`^${escape_for_regexp(key.slice(0, -2))}\\/(.+)$`),
				replacement: `${path.resolve(value)}/$1`
			});
		} else if (key + '/*' in config.alias) {
			// key and key/* both exist -> the replacement for key needs to happen _only_ on import .. from "key"
			alias.push({
				find: new RegExp(`^${escape_for_regexp(key)}$`),
				replacement: path.resolve(value)
			});
		} else {
			alias.push({ find: key, replacement: path.resolve(value) });
		}
	}

	return alias;
}

/**
 * @param {string} str
 */
function escape_for_regexp(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, (match) => '\\' + match);
}

/**
 * Load environment variables from process.env and .env files
 * @param {import('types').ValidatedKitConfig['env']} env_config
 * @param {string} mode
 */
export function get_env(env_config, mode) {
	const { publicPrefix: public_prefix, privatePrefix: private_prefix } = env_config;
	const env = loadEnv(mode, env_config.dir, '');

	return {
		public: filter_public_env(env, { public_prefix, private_prefix }),
		private: filter_private_env(env, { public_prefix, private_prefix })
	};
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {string} base
 */
export function not_found(req, res, base) {
	const type = negotiate(req.headers.accept ?? '*', ['text/plain', 'text/html']);

	// special case — handle `/` request automatically
	if (req.url === '/' && type === 'text/html') {
		res.statusCode = 307;
		res.setHeader('location', base);
		res.end();
		return;
	}

	res.statusCode = 404;

	const prefixed = base + req.url;

	if (type === 'text/html') {
		res.setHeader('Content-Type', 'text/html');
		res.end(
			`The server is configured with a public base URL of ${escape_html(
				base
			)} - did you mean to visit <a href="${escape_html(prefixed, true)}">${escape_html(
				prefixed
			)}</a> instead?`
		);
	} else {
		res.end(
			`The server is configured with a public base URL of ${escape_html(
				base
			)} - did you mean to visit ${escape_html(prefixed)} instead?`
		);
	}
}

export const strip_virtual_prefix = /** @param {string} id */ (id) => id.replace('\0virtual:', '');
