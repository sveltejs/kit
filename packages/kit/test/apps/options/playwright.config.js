import process from 'node:process';
import { config } from '../../utils.js';
import { defineConfig } from '@playwright/test';

export default defineConfig({
	...config,
	webServer: {
		...config.webServer,
		command: process.env.DEV ? `pnpm dev` : `pnpm build && pnpm preview`,
		env: {
			ROUTER_RESOLUTION: process.env.ROUTER_RESOLUTION ?? 'client'
		}
	}
});
