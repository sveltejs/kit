import { configure } from '../../utils.js';

export default configure({
	'service-worker': { REGISTER_SERVICE_WORKER: 'true' },
	'dynamic-env': { NODE_ENV: 'custom', DYNAMIC_PUBLIC_ENV: 'true' }
});
