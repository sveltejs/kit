// TODO need separate public/private types
/** @type {App.PrivateEnv} */
export let env = {};

// TODO put this in a separate module, so it's not user-accessible
/** @type {(environment: Record<string, string>) => void} */
export function set_private_env(environment) {
	env = environment;
}
