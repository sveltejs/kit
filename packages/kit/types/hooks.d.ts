import { MaybePromise } from './helper';

export type StrictBody = string | Uint8Array;

export interface RequestEvent {
	request: Request;
	url: URL;
	params: Record<string, string>;
	locals: SvelteKit.Locals;
	platform: Readonly<SvelteKit.Platform>;
}

export interface GetSession {
	(event: RequestEvent): MaybePromise<SvelteKit.Session>;
}

export interface ResolveOpts {
	ssr?: boolean;
}

export interface Handle {
	(input: {
		event: RequestEvent;
		resolve(event: RequestEvent, opts?: ResolveOpts): MaybePromise<Response>;
	}): MaybePromise<Response>;
}

export interface HandleError {
	(input: { error: Error & { frame?: string }; event: RequestEvent }): void;
}

export interface ExternalFetch {
	(req: Request): Promise<Response>;
}
