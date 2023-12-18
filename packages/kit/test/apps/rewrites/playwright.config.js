import { config } from '../../utils.js';

export default {
	...config,
	webServer: {
		command: process.env.DEV
			? 'cross-env PUBLIC_PRERENDERING=false pnpm dev'
			: 'cross-env PUBLIC_PRERENDERING=true pnpm build && pnpm preview',
		port: process.env.DEV ? 5173 : 4173
	}
};
