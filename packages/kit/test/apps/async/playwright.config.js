import process from 'node:process';
import { config, port } from '../../utils.js';
import { defineConfig } from '@playwright/test';

export default defineConfig({
	...config,
	webServer: {
		command: process.env.DEV
			? `pnpm dev --port ${port} --strictPort`
			: `pnpm build && pnpm preview --port ${port} --strictPort`,
		port
	}
});
