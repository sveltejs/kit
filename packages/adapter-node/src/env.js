/* global ENV_PREFIX */
import process from 'node:process';

const expected = new Set([
	'SOCKET_PATH',
	'HOST',
	'PORT',
	'ORIGIN',
	'XFF_DEPTH',
	'ADDRESS_HEADER',
	'PROTOCOL_HEADER',
	'HOST_HEADER',
	'PORT_HEADER',
	'BODY_SIZE_LIMIT',
	'SHUTDOWN_TIMEOUT',
	'IDLE_TIMEOUT',
	'KEEP_ALIVE_TIMEOUT',
	'HEADERS_TIMEOUT'
]);

const expected_unprefixed = new Set(['LISTEN_PID', 'LISTEN_FDS']);

if (ENV_PREFIX) {
	for (const name in process.env) {
		if (name.startsWith(ENV_PREFIX)) {
			const unprefixed = name.slice(ENV_PREFIX.length);
			if (!expected.has(unprefixed)) {
				throw new Error(
					`You should change envPrefix (${ENV_PREFIX}) to avoid conflicts with existing environment variables — unexpectedly saw ${name}`
				);
			}
		}
	}
}

/**
 * @param {string} name
 * @param {any} fallback
 */
export function env(name, fallback) {
	const prefix = expected_unprefixed.has(name) ? '' : ENV_PREFIX;
	const prefixed = prefix + name;
	return prefixed in process.env ? process.env[prefixed] : fallback;
}

const integer_regexp = /^\d+$/;

/**
 * Throw a consistently-structured parsing error for environment variables.
 * @param {string} name
 * @param {any} value
 * @param {string} description
 * @returns {never}
 */
function parsing_error(name, value, description) {
	throw new Error(
		`Invalid value for environment variable ${name}: ${JSON.stringify(value)} (${description})`
	);
}

/**
 * Check the environment for a timeout value (non-negative integer) in seconds.
 * @param {string} name
 * @param {number} [fallback]
 * @returns {number | undefined}
 */
export function timeout_env(name, fallback) {
	const raw = env(name, fallback);
	if (!raw) {
		return fallback;
	}

	if (!integer_regexp.test(raw)) {
		parsing_error(name, raw, 'should be a non-negative integer');
	}

	const parsed = Number.parseInt(raw, 10);

	// We don't technically need to check `Number.isNaN` because the value already passed the regexp test.
	// However, just in case there's some new codepath introduced somewhere down the line, it's probably good
	// to stick this in here.
	if (Number.isNaN(parsed)) {
		parsing_error(name, raw, 'should be a non-negative integer');
	}

	if (parsed < 0) {
		parsing_error(name, raw, 'should be a non-negative integer');
	}

	return parsed;
}
