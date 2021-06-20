import { Logger, TrailingSlash } from './internal';
import { UserConfig as ViteConfig } from 'vite';

export type AdapterUtils = {
	log: Logger;
	rimraf: (dir: string) => void;
	mkdirp: (dir: string) => void;
	copy_client_files: (dest: string) => void;
	copy_server_files: (dest: string) => void;
	copy_static_files: (dest: string) => void;
	copy: (from: string, to: string, filter?: (basename: string) => boolean) => void;
	prerender: ({
		all,
		dest,
		fallback
	}: {
		all?: boolean;
		dest: string;
		fallback?: string;
	}) => Promise<void>;
};

export type Adapter = {
	name: string;
	adapt: ({ utils, config }: { utils: AdapterUtils; config: ValidatedConfig }) => Promise<void>;
};

export type Config = {
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
		serviceWorker?: {
			exclude?: string[];
		};
		package?: {
			dir?: string;
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
			base?: string;
			assets?: string;
		};
		prerender?: {
			crawl?: boolean;
			enabled?: boolean;
			force?: boolean;
			pages?: string[];
		};
		router?: boolean;
		ssr?: boolean;
		target?: string;
		trailingSlash?: TrailingSlash;
		vite?: ViteConfig | (() => ViteConfig);
	};
	preprocess?: any;
};

export type ValidatedConfig = {
	compilerOptions: any;
	extensions: string[];
	kit: {
		adapter: Adapter;
		amp: boolean;
		appDir: string;
		files: {
			assets: string;
			hooks: string;
			lib: string;
			routes: string;
			serviceWorker: string;
			setup: string;
			template: string;
		};
		floc: boolean;
		host: string;
		hostHeader: string;
		hydrate: boolean;
		serviceWorker: {
			exclude: string[];
		};
		package: {
			dir: string;
			exports: {
				include: string[];
				exclude: string[];
			};
			files: {
				include: string[];
				exclude: string[];
			};
		};
		paths: {
			base: string;
			assets: string;
		};
		prerender: {
			crawl: boolean;
			enabled: boolean;
			force: boolean;
			pages: string[];
		};
		router: boolean;
		ssr: boolean;
		target: string;
		trailingSlash: TrailingSlash;
		vite: () => ViteConfig;
	};
	preprocess: any;
};
