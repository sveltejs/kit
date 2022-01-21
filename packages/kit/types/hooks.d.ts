import { MaybePromise } from './helper';

export type StrictBody = string | Uint8Array;

export interface RequestEvent<Locals = Record<string, any>, Platform = Record<string, unknown>> {
	request: Request;
	url: URL;
	params: Record<string, string>;
	locals: Locals;
	platform: Readonly<Platform>;
}

export interface GetSession<
	Locals = Record<string, any>,
	Platform = Record<string, unknown>,
	Session = any
> {
	(event: RequestEvent<Locals, Platform>): MaybePromise<Session>;
}

export interface ResolveOpts {
	ssr?: boolean;
}

export interface Handle<Locals = Record<string, any>, Platform = Record<string, unknown>> {
	(input: {
		event: RequestEvent<Locals, Platform>;
		resolve(event: RequestEvent<Locals, Platform>, opts?: ResolveOpts): MaybePromise<Response>;
	}): MaybePromise<Response>;
}

// internally, `resolve` could return `undefined`, so we differentiate InternalHandle
// from the public Handle type
export interface InternalHandle<Locals = Record<string, any>, Platform = Record<string, unknown>> {
	(input: {
		event: RequestEvent<Locals, Platform>;
		resolve(
			event: RequestEvent<Locals, Platform>,
			opts?: ResolveOpts
		): MaybePromise<Response | undefined>;
	}): MaybePromise<Response | undefined>;
}

export interface HandleError<Locals = Record<string, any>, Platform = Record<string, unknown>> {
	(input: { error: Error & { frame?: string }; event: RequestEvent<Locals, Platform> }): void;
}

export interface ExternalFetch {
	(req: Request): Promise<Response>;
}
