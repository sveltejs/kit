import { Location as Page, MaybePromise, InferValue } from './helper';

export type LoadInput<
	PageParams extends Record<string, string> = Record<string, string>,
	Context extends Record<string, any> = Record<string, any>,
	Session = any
> = {
	page: Page<PageParams>;
	fetch: (info: RequestInfo, init?: RequestInit) => Promise<Response>;
	session: Session;
	context: Context;
};

export type ErrorLoadInput<
	PageParams extends Record<string, string> = Record<string, string>,
	Context extends Record<string, any> = Record<string, any>,
	Session = any
> = LoadInput<PageParams, Context, Session> & {
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
	Input extends {
		context?: Record<string, any>;
		pageParams?: Record<string, string>;
		session?: any;
	} = {},
	Output extends { context?: Record<string, any>; props?: Record<string, any> } = {}
> = (
	input: LoadInput<
		InferValue<Input, 'pageParams', Record<string, string>>,
		InferValue<Input, 'context', Record<string, any>>,
		InferValue<Input, 'session', any>
	>
) => MaybePromise<void | LoadOutput<
	InferValue<Output, 'props', Record<string, any>>,
	InferValue<Output, 'context', Record<string, any>>
>>;

export type ErrorLoad<
	Input extends {
		context?: Record<string, any>;
		pageParams?: Record<string, string>;
		session?: any;
	} = {},
	Output extends { context?: Record<string, any>; props?: Record<string, any> } = {}
> = (
	input: ErrorLoadInput<
		InferValue<Input, 'pageParams', Record<string, string>>,
		InferValue<Input, 'context', Record<string, any>>,
		InferValue<Input, 'session', any>
	>
) => MaybePromise<
	LoadOutput<
		InferValue<Output, 'props', Record<string, any>>,
		InferValue<Output, 'context', Record<string, any>>
	>
>;

export { Page };
