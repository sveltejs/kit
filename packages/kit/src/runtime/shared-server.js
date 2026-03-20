/**
 * `$env/dynamic/private`
 * @type {Record<string, string>}
 */
export let private_env = {};

/**
 * `$env/dynamic/public`
 * @type {Record<string, string>}
 */
export let public_env = {};

/** @type {(environment: Record<string, string>) => void} */
export function set_private_env(environment) {
	private_env = environment;
}

/** @type {(environment: Record<string, string>) => void} */
export function set_public_env(environment) {
	public_env = environment;
}
