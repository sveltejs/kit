import { Location as Page, MaybePromise, InferValue, Index } from './helper';

export interface LoadInput<
	PageParams extends Index<string> = Index<string>,
	Context extends Index = Index,
	Session = any
> {
	page: Page<PageParams>;
	fetch: (info: RequestInfo, init?: RequestInit) => Promise<Response>;
	session: Session;
	context: Context;
}

export interface ErrorLoadInput<
	PageParams extends Index<string> = Index<string>,
	Context extends Index = Index,
	Session = any
> extends LoadInput<PageParams, Context, Session> {
	status?: number;
	error?: Error;
}

export interface LoadOutput<Props extends Index = Index, Context extends Index = Index> {
	status?: number;
	error?: string | Error;
	redirect?: string;
	props?: Props;
	context?: Context;
	maxage?: number;
}

interface LoadInputExtends {
	context?: Index;
	pageParams?: Index<string>;
	session?: any;
}

interface LoadOutputExtends {
	context?: Index;
	props?: Index;
}

export interface Load<
	Input extends LoadInputExtends = Required<LoadInputExtends>,
	Output extends LoadOutputExtends = Required<LoadOutputExtends>
> {
	(
		input: LoadInput<
			InferValue<Input, 'pageParams', Index<string>>,
			InferValue<Input, 'context', Index>,
			InferValue<Input, 'session', any>
		>
	): MaybePromise<void | LoadOutput<
		InferValue<Output, 'props', Index>,
		InferValue<Output, 'context', Index>
	>>;
}

export interface ErrorLoad<
	Input extends LoadInputExtends = Required<LoadInputExtends>,
	Output extends LoadOutputExtends = Required<LoadOutputExtends>
> {
	(
		input: ErrorLoadInput<
			InferValue<Input, 'pageParams', Index<string>>,
			InferValue<Input, 'context', Index>,
			InferValue<Input, 'session', any>
		>
	): MaybePromise<
		LoadOutput<InferValue<Output, 'props', Index>, InferValue<Output, 'context', Index>>
	>;
}

export { Page };
