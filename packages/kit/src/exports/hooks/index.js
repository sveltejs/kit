import * as e from '../../messages/server-errors.js';

export { sequence } from './sequence.js';

/**
 * @internal
 */
export function defineEnvVars() {
	e.define_env_vars_moved();
}
