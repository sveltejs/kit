import { MaybePromise, InferValue } from './helper';

export type LoadInput<
	T extends { context?: Record<string, any>; pageParams?: Record<string, string> } = {}
> = {
	page: Page<InferValue<T, 'pageParams', Record<string, string>>>;
	fetch: (info: RequestInfo, init?: RequestInit) => Promise<Response>;
	session: any;
	context: InferValue<T, 'context', Record<string, any>>;
};

export type ErrorLoadInput<
	T extends { context?: Record<string, any>; pageParams?: Record<string, string> } = {}
> = LoadInput<T> & {
	status: number;
	error: Error;
};

export type LoadOutput<
	T extends { context?: Record<string, any>; props?: Record<string, any> } = {}
> = {
	status?: number;
	error?: string | Error;
	redirect?: string;
	props?: InferValue<T, 'props', Record<string, any>>;
	context?: InferValue<T, 'context', Record<string, any>>;
	maxage?: number;
};

// Publicized Types
export type Load<
	Input extends { context?: Record<string, any>; pageParams?: Record<string, string> } = {},
	Output extends { context?: Record<string, any>; props?: Record<string, any> } = {}
> = (input: LoadInput<Input>) => MaybePromise<LoadOutput<Output>>;

export type ErrorLoad<
	Input extends { context?: Record<string, any>; pageParams?: Record<string, string> } = {},
	Output extends { context?: Record<string, any>; props?: Record<string, any> } = {}
> = (input: ErrorLoadInput<Input>) => MaybePromise<LoadOutput<Output>>;

export type Page<Params extends Record<string, string> = Record<string, string>> = {
	host: string;
	path: string;
	params: Params;
	query: URLSearchParams;
};
