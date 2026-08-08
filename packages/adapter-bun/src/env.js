import process from 'node:process';
import { env_prefix } from 'MANIFEST';

const expected = new Set([
	'SOCKET_PATH',
	'HOST',
	'PORT',
	'REUSE_PORT',
	'IPV6_ONLY',
	'IDLE_TIMEOUT',
	'BODY_SIZE_LIMIT',
	'DEVELOPMENT',
	'XFF_DEPTH',
	'ADDRESS_HEADER',
	'PROTOCOL_HEADER',
	'HOST_HEADER',
	'PORT_HEADER'
]);

if (env_prefix) {
	for (const name in process.env) {
		if (name.startsWith(env_prefix)) {
			const unprefixed = name.slice(env_prefix.length);
			if (!expected.has(unprefixed)) {
				throw new Error(
					`You should change envPrefix (${env_prefix}) to avoid conflicts with existing environment variables — unexpectedly saw ${name}`
				);
			}
		}
	}
}

/**
 * @param {string} name
 * @param {string | undefined} [fallback]
 * @returns {string | undefined}
 */
export function env(name, fallback) {
	const prefixed = env_prefix + name;
	return prefixed in process.env ? process.env[prefixed] : fallback;
}

/**
 * @param {string} name
 * @param {boolean | undefined} [fallback]
 * @returns {boolean | undefined}
 */
export function boolean_env(name, fallback) {
	const value = env(name);
	if (value === undefined) return fallback;
	if (/^(?:1|true|yes|on)$/i.test(value)) return true;
	if (/^(?:0|false|no|off)$/i.test(value)) return false;

	throw new Error(
		`Invalid value for environment variable ${env_prefix + name}: ${JSON.stringify(value)} (expected a boolean)`
	);
}

/**
 * @param {string} name
 * @param {number | undefined} [fallback]
 * @param {{ min?: number; max?: number }} [limits]
 * @returns {number | undefined}
 */
export function number_env(name, fallback, limits = {}) {
	const value = env(name);
	if (value === undefined) return fallback;
	if (!/^\d+$/.test(value)) {
		throw new Error(
			`Invalid value for environment variable ${env_prefix + name}: ${JSON.stringify(value)} (expected a non-negative integer)`
		);
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
		throw new Error(
			`Invalid value for environment variable ${env_prefix + name}: ${JSON.stringify(value)} (expected an integer ${range})`
		);
	}

	return number;
}

/**
 * @param {string} name
 * @param {number | undefined} [fallback]
 * @returns {number | undefined}
 */
export function bytes_env(name, fallback) {
	const value = env(name);
	if (value === undefined) return fallback;
	if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:[KMG])?$/i.test(value)) {
		throw new Error(
			`Invalid value for environment variable ${env_prefix + name}: ${JSON.stringify(value)} (expected a non-negative number with an optional K, M, or G suffix)`
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
		throw new Error(
			`Invalid value for environment variable ${env_prefix + name}: ${JSON.stringify(value)} (expected a non-negative number of whole bytes)`
		);
	}

	return number;
}
