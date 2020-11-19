import { PageComponentManifest, PageManifest, EndpointManifest } from '@sveltejs/app-utils';

export interface SvelteAppConfig {
	adapter: string;
}

export interface Template {
	render: (data: Record<string, string>) => string;
	stream: (req, res, data: Record<string, string | Promise<string>>) => void;
}

export interface WritableStore<T> {
	set: (value: T) => void;
	update: (fn: (value: T) => T) => void;
	subscribe: (fn: (T: any) => void) => () => void;
}

export interface Dirs {
	dest: string;
	src: string;
	routes: string;
}

export interface ManifestData {
	error: PageComponentManifest;
	layout: PageComponentManifest;
	components: PageComponentManifest[];
	pages: PageManifest[];
	endpoints: EndpointManifest[];
}

export interface ReadyEvent {
	port: number;
}

export interface ErrorEvent {
	type: string;
	error: Error & {
		frame?: unknown;
		loc?: {
			file?: string;
			line: number;
			column: number;
		};
	};
}

export interface FatalEvent {
	message: string;
	log?: unknown;
}

export interface InvalidEvent {
	changed: string[];
	invalid: {
		client: boolean;
		server: boolean;
		serviceworker: boolean;
	};
}

// export interface BuildEvent {
// 	type: string;
// 	errors: Array<{ file: string; message: string; duplicate: boolean }>;
// 	warnings: Array<{ file: string; message: string; duplicate: boolean }>;
// 	duration: number;
// 	result: CompileResult;
// }
