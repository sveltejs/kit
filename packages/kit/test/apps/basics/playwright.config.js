import process from 'node:process';
import { config } from '../../utils.js';

export default {
	...config,
	webServer: {
		command: process.env.DEV
			? `cross-env PUBLIC_PRERENDERING=false ROUTER_RESOLUTION=${process.env.ROUTER_RESOLUTION ?? 'client'} pnpm dev`
			: `cross-env PUBLIC_PRERENDERING=true ROUTER_RESOLUTION=${process.env.ROUTER_RESOLUTION ?? 'client'} pnpm build && pnpm preview`,
		port: process.env.DEV ? 5173 : 4173
	}
};
