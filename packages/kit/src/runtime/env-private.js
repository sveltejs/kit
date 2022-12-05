export let env = {};

/** @type {(environment: Record<string, string>) => void} */
export function set_private_env(environment) {
	env = environment;
}
