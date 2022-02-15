import { MaybePromise } from './helper';

export type StrictBody = string | Uint8Array;

export interface RequestEvent {
	request: Request;
	url: URL;
	params: Record<string, string>;
	locals: App.Locals;
	platform: Readonly<App.Platform>;
}

export interface GetSession {
	(event: RequestEvent): MaybePromise<App.Session>;
}

export interface RequiredResolveOptions {
	ssr: boolean;
	transformPage: ({ html }: { html: string }) => string;
}

export type ResolveOptions = Partial<RequiredResolveOptions>;

export interface Handle {
	(input: {
		event: RequestEvent;
		resolve(event: RequestEvent, opts?: ResolveOptions): MaybePromise<Response>;
	}): MaybePromise<Response>;
}

export interface HandleError {
	(input: { error: Error & { frame?: string }; event: RequestEvent }): void;
}

export interface ExternalFetch {
	(req: Request): Promise<Response>;
}
