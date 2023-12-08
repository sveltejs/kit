import {
	PlaywrightTestArgs,
	PlaywrightTestConfig,
	PlaywrightTestOptions,
	PlaywrightWorkerArgs,
	PlaywrightWorkerOptions,
	TestType
} from '@playwright/test';
import { IncomingMessage, ServerResponse } from 'http';
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
			clicknav(selector: string, options?: { timeout?: number }): Promise<void>;
			in_view(selector: string): Promise<boolean>;
			get_computed_style(selector: string, prop: string): Promise<string>;
			/**
			 * `handleError` defines the shape
			 */
			read_errors(href: string): Record<string, any>;
			start_server(
				handler: (req: IncomingMessage, res: ServerResponse) => void
			): Promise<{ port: number }>;
			page: PlaywrightTestArgs['page'] & {
				goto: (
					url: string,
					opts?: Parameters<PlaywrightTestArgs['page']['goto']>[1] & { wait_for_started?: boolean }
				) => ReturnType<PlaywrightTestArgs['page']['goto']>;
			};
		},
	PlaywrightWorkerArgs & PlaywrightWorkerOptions
>;

export const config: PlaywrightTestConfig;

export const plugin: () => Plugin;
