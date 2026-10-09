import { config } from '../../utils.js';

export default {
	...config,
	use: { ...config.use, baseURL: 'http://localhost:5173' },
	webServer: [
		config.webServer,
		{
			command:
				'NO_STATIC=1 INSTRUMENTATION_ENV=available pnpm build && MY_CUSTOM_PORT=5174 INSTRUMENTATION_ENV=available node build-no-static',
			port: 5174
		}
	],
	projects: [
		...config.projects,
		{
			name: 'no-static',
			grep: /prerendered pages/,
			use: { baseURL: 'http://localhost:5174' }
		}
	]
};
