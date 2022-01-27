import { MaybePromise } from './helper';

export type StrictBody = string | Uint8Array;

export interface RequestEvent<Locals = Record<string, any>, Platform = Record<string, any>> {
	request: Request;
	url: URL;
	params: Record<string, string>;
	locals: Locals;
	platform: Readonly<Platform>;
}

export interface GetSession<
	Locals = Record<string, any>,
	Platform = Record<string, any>,
	Session = any
> {
	(event: RequestEvent<Locals, Platform>): MaybePromise<Session>;
}

export interface ResolveOpts {
	ssr?: boolean;
}

export interface Handle<Locals = Record<string, any>, Platform = Record<string, any>> {
	(input: {
		event: RequestEvent<Locals, Platform>;
		resolve(event: RequestEvent<Locals, Platform>, opts?: ResolveOpts): MaybePromise<Response>;
	}): MaybePromise<Response>;
}

export interface HandleError<Locals = Record<string, any>> {
	(input: { error: Error & { frame?: string }; event: RequestEvent<Locals> }): void;
}

export interface ExternalFetch {
	(req: Request): Promise<Response>;
}
