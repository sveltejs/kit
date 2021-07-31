import { UserConfig as ViteConfig } from 'vite';
import { RecursiveRequired } from './helper';
import { ServerRequest } from './hooks';
import { Logger, TrailingSlash } from './internal';

export interface AdapterUtils {
	log: Logger;
	rimraf: (dir: string) => void;
	mkdirp: (dir: string) => void;
	copy_client_files: (dest: string) => void;
	copy_server_files: (dest: string) => void;
	copy_static_files: (dest: string) => void;
	copy: (from: string, to: string, filter?: (basename: string) => boolean) => void;
	update_ignores: ({ patterns, log }: { patterns: string[]; log?: boolean }) => void;
	prerender: (options: { all?: boolean; dest: string; fallback?: string }) => Promise<void>;
}

export interface Adapter {
	name: string;
	adapt: (context: { utils: AdapterUtils; config: ValidatedConfig }) => Promise<void>;
}

export interface PageOpts {
	ssr: boolean;
	router: boolean;
	hydrate: boolean;
	prerender: boolean;
}

export interface PageOptsContext {
	request: ServerRequest;
	page: Promise<PageOpts>;
}

export type ScriptablePageOpt<T> = T | (({ request, page }: PageOptsContext) => Promise<T>);

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
		hydrate?: ScriptablePageOpt<boolean>;
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
			enabled?: ScriptablePageOpt<boolean>;
			onError?: PrerenderOnErrorValue;
			pages?: string[];
		};
		router?: ScriptablePageOpt<boolean>;
		serviceWorker?: {
			exclude?: string[];
		};
		ssr?: ScriptablePageOpt<boolean>;
		target?: string;
		trailingSlash?: TrailingSlash;
		vite?: ViteConfig | (() => ViteConfig);
	};
	preprocess?: any;
}

export type ValidatedConfig = RecursiveRequired<Config> & {
	kit: { files: { setup: string } }; // only for validated
};
