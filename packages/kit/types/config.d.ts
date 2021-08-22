import { UserConfig as ViteConfig } from 'vite';
import { RecursiveRequired } from './helper';
import { Logger, TrailingSlash } from './internal';

export interface AdapterUtils {
	log: Logger;
	rimraf(dir: string): void;
	mkdirp(dir: string): void;
	copy_client_files(dest: string): void;
	copy_server_files(dest: string): void;
	copy_static_files(dest: string): void;
	copy(from: string, to: string, filter?: (basename: string) => boolean): void;
	prerender(options: { all?: boolean; dest: string; fallback?: string }): Promise<void>;
}

export interface Adapter {
	name: string;
	adapt(context: { utils: AdapterUtils; config: ValidatedConfig }): Promise<void>;
}

export interface PrerenderErrorHandler {
	(details: {
		status: number;
		path: string;
		referrer: string | null;
		referenceType: 'linked' | 'fetched';
	}): void;
}

export type PrerenderOnErrorValue = 'fail' | 'continue' | PrerenderErrorHandler;

export interface Config {
	compilerOptions?: any;
	extensions?: string[];
	kit?: {
		adapter?: Adapter;
		amp?: boolean;
		appDir?: string;
		files?: {
			assets?: string;
			hooks?: string;
			lib?: string;
			routes?: string;
			serviceWorker?: string;
			template?: string;
		};
		floc?: boolean;
		host?: string;
		hostHeader?: string;
		hydrate?: boolean;
		package?: {
			dir?: string;
			emitTypes?: boolean;
			exports?: {
				include?: string[];
				exclude?: string[];
			};
			files?: {
				include?: string[];
				exclude?: string[];
			};
		};
		paths?: {
			assets?: string;
			base?: string;
		};
		prerender?: {
			crawl?: boolean;
			enabled?: boolean;
			onError?: PrerenderOnErrorValue;
			pages?: string[];
		};
		router?: boolean;
		serviceWorker?: {
			exclude?: string[];
		};
		ssr?: boolean;
		target?: string;
		trailingSlash?: TrailingSlash;
		vite?: ViteConfig | (() => ViteConfig);
	};
	preprocess?: any;
}

export type ValidatedConfig = RecursiveRequired<Config>;
