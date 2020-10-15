export type SvelteAppConfig = {
	adapter: string;
}

export type Route = {
	id: string;
	handlers: Array<{
		type: 'page' | 'route';
		file: string;
	}>;
	pattern: RegExp;
	test: (url: string) => boolean;
	exec: (url: string) => Record<string, string>;
	parts: string[];
	params: string[];
};

export type Template = {
	render: (data: Record<string, string>) => string;
	stream: (req, res, data: Record<string, string | Promise<string>>) => void;
};

export type WritableStore<T> = {
	set: (value: T) => void;
	update: (fn: (value: T) => T) => void;
	subscribe: (fn: (T: any) => void) => () => void;
};

export type PageComponentManifest = {
	file: string;
	name: string;
	url: string;
};

export type PageManifest = {
	path: string;
	pattern: RegExp;
	parts: Array<{
		component: PageComponentManifest;
		params: string[];
	}>;
};

export type ServerRouteManifest = {
	name: string;
	pattern: RegExp;
	file: string;
	url: string;
	params: string[];
};

export type Dirs = {
	dest: string;
	src: string;
	routes: string;
};

export type ManifestData = {
	error: PageComponentManifest;
	layout: PageComponentManifest;
	components: PageComponentManifest[];
	pages: PageManifest[];
	server_routes: ServerRouteManifest[];
};

export type ReadyEvent = {
	port: number;
};

export type ErrorEvent = {
	type: string;
	error: Error & {
		frame?: unknown;
		loc?: {
			file?: string;
			line: number;
			column: number;
		};
	};
};

export type FatalEvent = {
	message: string;
	log?: unknown;
};

export type InvalidEvent = {
	changed: string[];
	invalid: {
		client: boolean;
		server: boolean;
		serviceworker: boolean;
	};
};

// export type BuildEvent = {
// 	type: string;
// 	errors: Array<{ file: string; message: string; duplicate: boolean }>;
// 	warnings: Array<{ file: string; message: string; duplicate: boolean }>;
// 	duration: number;
// 	result: CompileResult;
// };
