import { noop, disallow_on_server } from '../../../utils/functions.js';

export const applyAction = disallow_on_server('applyAction');
export const deserialize = disallow_on_server('deserialize');
export const enhance = noop;
