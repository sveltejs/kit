import { config } from '../../utils.js';

export default {
	...config,
	webServer: {
		command: process.env.DEV
			? 'PUBLIC_PRERENDERING=false pnpm dev'
			: 'PUBLIC_PRERENDERING=true pnpm build && pnpm preview',
		port: process.env.DEV ? 5173 : 4173
	}
};
