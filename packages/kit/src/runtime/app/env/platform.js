/** @type {App.RuntimeEnv} */
export let env = {};

/** @type {(environment: Record<string, string>) => void} */
export function set_env(environment) {
	env = environment;
}
