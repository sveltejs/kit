import { Logger } from './internal';
import { UserConfig as ViteConfig } from 'vite';

export type AdapterUtils = {
	log: Logger;
	rimraf: (dir: string) => void;
	mkdirp: (dir: string) => void;
	copy_client_files: (dest: string) => void;
	copy_server_files: (dest: string) => void;
	copy_static_files: (dest: string) => void;
	copy: (from: string, to: string, filter?: (basename: string) => boolean) => void;
	prerender: ({ force, dest }: { force?: boolean; dest: string }) => Promise<void>;
};

export type Adapter = {
	name: string;
	adapt: (utils: AdapterUtils) => Promise<void>;
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
		host?: string;
		hostHeader?: string;
		hydrate?: boolean;
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
		host: string;
		hostHeader: string;
		hydrate: boolean;
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
		vite: () => ViteConfig;
	};
	preprocess: any;
};
