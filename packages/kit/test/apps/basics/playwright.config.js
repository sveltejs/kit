import { configure } from '../../utils.js';

export default configure({
	env: { PUBLIC_PRERENDERING: 'false' },
	variants: {
		async: { SVELTE_ASYNC: 'true' },
		resolution: { ROUTER_RESOLUTION: 'server' }
	}
});
