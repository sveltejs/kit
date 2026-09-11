import process from 'node:process';
import { env_prefix } from 'MANIFEST';

const expected = new Set([
	'SOCKET_PATH',
	'HOST',
	'PORT',
	'REUSE_PORT',
	'IPV6_ONLY',
	'CONNECTION_IDLE_TIMEOUT',
	'BODY_SIZE_LIMIT',
	'SHUTDOWN_TIMEOUT',
	'DEVELOPMENT',
	'XFF_DEPTH',
	'ADDRESS_HEADER',
	'PROTOCOL_HEADER',
	'HOST_HEADER',
	'PORT_HEADER'
]);

if (env_prefix) {
	for (const name in process.env) {
		if (name.startsWith(env_prefix) && !expected.has(name.slice(env_prefix.length))) {
			throw new Error(
				`You should change envPrefix (${env_prefix}) to avoid conflicts with existing environment variables — unexpectedly saw ${name}`
			);
		}
	}
}

/**
 * @param {string} name
 * @param {string} value
 * @param {string} expected
 * @returns {never}
 */
function parsing_error(name, value, expected) {
	throw new Error(
		`Invalid value for environment variable ${env_prefix + name}: ${JSON.stringify(value)} (expected ${expected})`
	);
}

/**
 * @template {string | undefined} [T=undefined]
 * @param {string} name
 * @param {T} [fallback]
 * @returns {string | T}
 */
export function env(name, fallback) {
	const prefixed = env_prefix + name;
	return prefixed in process.env
		? /** @type {string} */ (process.env[prefixed])
		: /** @type {T} */ (fallback);
}

/** @type {Record<string, boolean>} */
const BOOLEANS = {
	1: true,
	true: true,
	yes: true,
	on: true,
	0: false,
	false: false,
	no: false,
	off: false
};

/**
 * @template {boolean | undefined} [T=undefined]
 * @param {string} name
 * @param {T} [fallback]
 * @returns {boolean | T}
 */
export function boolean_env(name, fallback) {
	const value = env(name);
	if (value === undefined) return /** @type {T} */ (fallback);
	return BOOLEANS[value.toLowerCase()] ?? parsing_error(name, value, 'a boolean');
}

/**
 * @template {number | undefined} [T=undefined]
 * @param {string} name
 * @param {T} [fallback]
 * @param {{ min?: number; max?: number }} [limits]
 * @returns {number | T}
 */
export function number_env(name, fallback, limits = {}) {
	const value = env(name);
	if (value === undefined) return /** @type {T} */ (fallback);
	if (!/^\d+$/.test(value)) {
		parsing_error(name, value, 'a non-negative integer');
	}

	const number = Number(value);
	if (
		!Number.isSafeInteger(number) ||
		number < (limits.min ?? 0) ||
		number > (limits.max ?? Infinity)
	) {
		const range =
			limits.max === undefined
				? `at least ${limits.min ?? 0}`
				: `between ${limits.min ?? 0} and ${limits.max}`;
		parsing_error(name, value, `an integer ${range}`);
	}

	return number;
}

/**
 * @template {number | undefined} [T=undefined]
 * @param {string} name
 * @param {T} [fallback]
 * @returns {number | T}
 */
export function bytes_env(name, fallback) {
	const value = env(name);
	if (value === undefined) return /** @type {T} */ (fallback);
	// adapter-node documents Infinity as the value that disables the limit
	if (value === 'Infinity') return Infinity;
	if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:[KMG])?$/i.test(value)) {
		parsing_error(
			name,
			value,
			'a non-negative number with an optional K, M, or G suffix, or Infinity'
		);
	}

	const suffix = value.at(-1)?.toUpperCase();
	const multiplier =
		{
			K: 1024,
			M: 1024 * 1024,
			G: 1024 * 1024 * 1024
		}[/** @type {'K' | 'M' | 'G'} */ (suffix)] ?? 1;
	const number = Number(multiplier === 1 ? value : value.slice(0, -1)) * multiplier;

	if (!Number.isSafeInteger(number)) {
		parsing_error(name, value, 'a non-negative number of whole bytes');
	}

	return number;
}
