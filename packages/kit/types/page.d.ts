import { Location as Page, MaybePromise, InferValue } from './helper';

export type LoadInput<
	PageParams extends Record<string, string> = Record<string, string>,
	Context extends Record<string, any> = Record<string, any>
> = {
	page: Page<PageParams>;
	fetch: (info: RequestInfo, init?: RequestInit) => Promise<Response>;
	session: any;
	context: Context;
};

export type ErrorLoadInput<
	PageParams extends Record<string, string> = Record<string, string>,
	Context extends Record<string, any> = Record<string, any>
> = LoadInput<PageParams, Context> & {
	status: number;
	error: Error;
};

export type LoadOutput<
	Props extends Record<string, any> = Record<string, any>,
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
	Input extends { context?: Record<string, any>; pageParams?: Record<string, string> } = {},
	Output extends { context?: Record<string, any>; props?: Record<string, any> } = {}
> = (
	input: LoadInput<
		InferValue<Input, 'pageParams', Record<string, string>>,
		InferValue<Input, 'context', Record<string, any>>
	>
) => MaybePromise<void | LoadOutput<
	InferValue<Output, 'props', Record<string, any>>,
	InferValue<Output, 'context', Record<string, any>>
>>;

export type ErrorLoad<
	Input extends { context?: Record<string, any>; pageParams?: Record<string, string> } = {},
	Output extends { context?: Record<string, any>; props?: Record<string, any> } = {}
> = (
	input: ErrorLoadInput<
		InferValue<Input, 'pageParams', Record<string, string>>,
		InferValue<Input, 'context', Record<string, any>>
	>
) => MaybePromise<
	LoadOutput<
		InferValue<Output, 'props', Record<string, any>>,
		InferValue<Output, 'context', Record<string, any>>
	>
>;

export { Page };
