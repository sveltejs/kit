export let env = {};

/** @type {(environment: Record<string, string>) => void} */
export function set_public_env(environment) {
	env = environment;
}
