import { MaybePromise } from './helper';

export type LoadInput<Context extends Record<string, any> = Record<string, any>> = {
	page: Page;
	fetch: (info: RequestInfo, init?: RequestInit) => Promise<Response>;
	session: any;
	context: Context;
};

export type ErrorLoadInput<
	Context extends Record<string, any> = Record<string, any>
> = LoadInput<Context> & {
	status: number;
	error: Error;
};

export type LoadOutput<
	Props extends MaybePromise<Record<string, any>> = MaybePromise<Record<string, any>>,
	Context extends Record<string, any> = Record<string, any>
> = {
	status?: number;
	error?: string | Error;
	redirect?: string;
	props?: Props;
	context?: Context;
	maxage?: number;
};

// Publicized Types
export type Load<
	InputContext extends Record<string, any> = Record<string, any>,
	OutputContext extends Record<string, any> = Record<string, any>,
	Props extends MaybePromise<Record<string, any>> = MaybePromise<Record<string, any>>
> = (input: LoadInput<InputContext>) => MaybePromise<LoadOutput<Props, OutputContext>>;
export type ErrorLoad<
	InputContext extends Record<string, any> = Record<string, any>,
	OutputContext extends Record<string, any> = Record<string, any>,
	Props extends MaybePromise<Record<string, any>> = MaybePromise<Record<string, any>>
> = (input: ErrorLoadInput<InputContext>) => MaybePromise<LoadOutput<Props, OutputContext>>;
export type Page = {
	host: string;
	path: string;
	params: Record<string, string>;
	query: URLSearchParams;
};
