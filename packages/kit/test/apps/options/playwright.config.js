import process from 'node:process';
import { config, port } from '../../utils.js';
import { defineConfig } from '@playwright/test';

export default defineConfig({
	...config,
	webServer: {
		...config.webServer,
		command: process.env.DEV
			? `pnpm dev --port ${port} --strictPort`
			: `pnpm build && pnpm preview --port ${port} --strictPort`,
		env: {
			ROUTER_RESOLUTION: process.env.ROUTER_RESOLUTION ?? 'client',
			PATHS_ASSETS: process.env.PATHS_ASSETS ?? '',
			PATHS_RELATIVE: process.env.PATHS_RELATIVE ?? 'true'
		}
	}
});
