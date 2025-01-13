import {
	PlaywrightTestArgs,
	PlaywrightTestConfig,
	PlaywrightTestOptions,
	PlaywrightWorkerArgs,
	PlaywrightWorkerOptions,
	TestType,
	Page
} from '@playwright/test';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Plugin } from 'vite';

export const test: TestType<
	PlaywrightTestArgs &
		PlaywrightTestOptions & {
			app: {
				goto(url: string, opts?: { replaceState?: boolean }): Promise<void>;
				invalidate(url: string): Promise<void>;
				beforeNavigate(url: URL): void | boolean;
				afterNavigate(url: URL): void;
				preloadCode(...urls: string[]): Promise<void>;
				preloadData(url: string): Promise<void>;
			};
			clicknav(selector: string, options?: Parameters<Page['waitForNavigation']>[0]): Promise<void>;
			scroll_to(x: number, y: number): Promise<void>;
			in_view(selector: string): Promise<boolean>;
			get_computed_style(selector: string, prop: string): Promise<string>;
			/**
			 * `handleError` defines the shape
			 */
			read_errors(href: string): Record<string, any>;
			start_server(
				handler: (req: IncomingMessage, res: ServerResponse) => void
			): Promise<{ port: number }>;
			page: Page & {
				goto: (
					url: string,
					opts?: Parameters<Page['goto']>[1] & { wait_for_started?: boolean }
				) => ReturnType<Page['goto']>;
			};
		},
	PlaywrightWorkerArgs & PlaywrightWorkerOptions
>;

export const config: PlaywrightTestConfig;

export const plugin: () => Plugin;
