import { configure } from '../../utils.js';

export default configure({
	async: { SVELTE_ASYNC: 'true' },
	resolution: { ROUTER_RESOLUTION: 'server' }
});
