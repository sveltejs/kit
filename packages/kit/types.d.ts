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
