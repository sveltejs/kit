import { config } from '../../utils.js';

export default {
	...config,
	webServer: {
		...config.webServer,
		env: { ...config.webServer.env, SECRET: 'a secret' }
	}
};
