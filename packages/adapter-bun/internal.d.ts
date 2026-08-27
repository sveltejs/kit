declare module 'MANIFEST' {
	export const app_dir: string;
	export const base: string;
	export const embed: boolean;
	export const env_prefix: string;
	export const origin: string | undefined;
}

declare module 'ROUTES' {
	export const server_assets: Map<string, import('bun').BunFile>;
	export const routes: import('bun').Serve.Routes<never, string>;
}

declare module 'SERVER' {
	export const server: import('@sveltejs/kit').Server;
}

declare module 'SERVER_OPTIONS' {
	const options: Pick<
		import('bun').Serve.Options<never>,
		| 'development'
		| 'hostname'
		| 'port'
		| 'idleTimeout'
		| 'maxRequestBodySize'
		| 'reusePort'
		| 'unix'
		| 'ipv6Only'
	>;
	export default options;
}
