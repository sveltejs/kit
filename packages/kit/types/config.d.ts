import { UserConfig as ViteConfig } from 'vite';
import { RecursiveRequired } from './helper';
import { Logger, TrailingSlash } from './internal';

export interface AdapterUtils {
	log: Logger;
	rimraf(dir: string): void;
	mkdirp(dir: string): void;
	/**
	 * @param dest the destination folder to which files should be copied
	 * @returns an array of paths corresponding to the files that have been created by the copy
	 */
	copy_client_files(dest: string): string[];
	/**
	 * @param dest the destination folder to which files should be copied
	 * @returns an array of paths corresponding to the files that have been created by the copy
	 */
	copy_server_files(dest: string): string[];
	/**
	 * @param dest the destination folder to which files should be copied
	 * @returns an array of paths corresponding to the files that have been created by the copy
	 */
	copy_static_files(dest: string): string[];
	/**
	 * @param from the source folder from which files should be copied
	 * @param to the destination folder to which files should be copied
	 * @returns an array of paths corresponding to the files that have been created by the copy
	 */
	copy(from: string, to: string, filter?: (basename: string) => boolean): string[];
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
			exports?(filepath: string): boolean;
			files?(filepath: string): boolean;
		};
		paths?: {
			assets?: string;
			base?: string;
		};
		prerender?: {
			crawl?: boolean;
			enabled?: boolean;
			entries?: string[];
			onError?: PrerenderOnErrorValue;
		};
		router?: boolean;
		serviceWorker?: {
			files?(filepath: string): boolean;
		};
		ssr?: boolean;
		target?: string;
		trailingSlash?: TrailingSlash;
		vite?: ViteConfig | (() => ViteConfig);
	};
	preprocess?: any;
}

export type ValidatedConfig = RecursiveRequired<Config>;
