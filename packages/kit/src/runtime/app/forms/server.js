import { noop, disallow_on_server } from '../../../utils/functions.js';

export { deserialize } from './shared.js';

export const applyAction = disallow_on_server('applyAction');
export const enhance = noop;
