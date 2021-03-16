import { Logger } from './types.internal';

export type Config = {
	compilerOptions?: any;
	extensions?: string[];
	kit?: {
		adapter?: string | [string, any];
		amp?: boolean;
		appDir?: string;
		files?: {
			assets?: string;
			lib?: string;
			routes?: string;
			serviceWorker?: string;
			setup?: string;
			template?: string;
		};
		host?: string;
		hostHeader?: string;
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
		startGlobal?: string;
		target?: string;
	};
	preprocess?: any;
};

export type Builder = {
	copy_client_files: (dest: string) => void;
	copy_server_files: (dest: string) => void;
	copy_static_files: (dest: string) => void;
	prerender: ({ force, dest }: { force?: boolean; dest: string }) => Promise<void>;
	log: Logger;
};

export type Adapter = {
	adapt: (builder: Builder) => Promise<void>;
};
