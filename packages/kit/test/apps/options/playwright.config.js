import { configure } from '../../utils.js';

export default configure({
	variants: {
		'paths-assets': { PATHS_ASSETS: 'https://cdn.example.com/stuff' },
		'paths-absolute': { PATHS_RELATIVE: 'false' },
		resolution: { ROUTER_RESOLUTION: 'server' }
	}
});
