import { boolean_env, env, number_env } from './env.js';

/**
 * @param {unknown} configured
 * @returns {import('bun').TLSOptions | import('bun').TLSOptions[] | undefined}
 */
export function get_tls_options(configured) {
	const cert = env('TLS_CERT');
	const key = env('TLS_KEY');
	const ca = env('TLS_CA');
	const passphrase = env('TLS_PASSPHRASE');
	const server_name = env('TLS_SERVER_NAME');
	const dh_params_file = env('TLS_DH_PARAMS_FILE');
	const low_memory_mode = boolean_env('TLS_LOW_MEMORY_MODE');
	const secure_options = number_env('TLS_SECURE_OPTIONS');

	if (
		cert === undefined &&
		key === undefined &&
		ca === undefined &&
		passphrase === undefined &&
		server_name === undefined &&
		dh_params_file === undefined &&
		low_memory_mode === undefined &&
		secure_options === undefined
	) {
		return /** @type {import('bun').TLSOptions | import('bun').TLSOptions[] | undefined} */ (
			configured
		);
	}

	if (Array.isArray(configured)) {
		throw new Error(
			'TLS environment variables cannot be merged with an SNI array from serverOptions'
		);
	}

	const tls = /** @type {import('bun').TLSOptions} */ ({
		...(configured && typeof configured === 'object' ? configured : {})
	});
	if (cert !== undefined) tls.cert = tls_files(cert);
	if (key !== undefined) tls.key = tls_files(key);
	if (ca !== undefined) tls.ca = tls_files(ca);
	if (passphrase !== undefined) tls.passphrase = passphrase;
	if (server_name !== undefined) tls.serverName = server_name;
	if (dh_params_file !== undefined) tls.dhParamsFile = dh_params_file;
	if (low_memory_mode !== undefined) tls.lowMemoryMode = low_memory_mode;
	if (secure_options !== undefined) tls.secureOptions = secure_options;

	if (!has_tls_value(tls.cert) || !has_tls_value(tls.key)) {
		throw new Error('TLS configuration requires both a certificate and a private key');
	}

	return tls;
}

/**
 * @param {string} value
 * @returns {import('bun').BunFile | import('bun').BunFile[]}
 */
export function tls_files(value) {
	/** @type {unknown} */
	let paths;
	try {
		paths = value.startsWith('[') ? JSON.parse(value) : value;
	} catch (error) {
		throw new Error('TLS file lists must be JSON arrays of paths', { cause: error });
	}

	if (Array.isArray(paths)) {
		if (paths.length === 0) throw new Error('TLS file path lists must not be empty');
		if (!paths.every((path) => typeof path === 'string' && path.length > 0)) {
			throw new Error('TLS file paths must be non-empty strings');
		}
		return paths.map((path) => Bun.file(path));
	}
	if (typeof paths !== 'string' || paths.length === 0) {
		throw new Error('TLS file paths must be non-empty strings');
	}
	return Bun.file(paths);
}

/** @param {unknown} value */
function has_tls_value(value) {
	return Array.isArray(value) ? value.length > 0 : Boolean(value);
}
