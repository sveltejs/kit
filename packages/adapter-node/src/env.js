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
	'IDLE_TIMEOUT'
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
