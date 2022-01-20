import { Fallthrough } from './endpoint';
import { Either, InferValue, MaybePromise } from './helper';

export interface LoadInput<
	PageParams extends Record<string, string> = Record<string, string>,
	Stuff extends Record<string, any> = Record<string, any>,
	Session = any
> {
	url: URL;
	params: PageParams;
	fetch(info: RequestInfo, init?: RequestInit): Promise<Response>;
	session: Session;
	stuff: Stuff;
}

export interface ErrorLoadInput<
	PageParams extends Record<string, string> = Record<string, string>,
	Stuff extends Record<string, any> = Record<string, any>,
	Session = any
> extends LoadInput<PageParams, Stuff, Session> {
	status?: number;
	error?: Error;
}

export interface LoadOutput<
	Props extends Record<string, any> = Record<string, any>,
	Stuff extends Record<string, any> = Record<string, any>
> {
	status?: number;
	error?: string | Error;
	redirect?: string;
	props?: Props;
	stuff?: Stuff;
	maxage?: number;
}

interface LoadInputExtends {
	stuff?: Record<string, any>;
	pageParams?: Record<string, string>;
	session?: any;
}

interface LoadOutputExtends {
	stuff?: Record<string, any>;
	props?: Record<string, any>;
}

export interface Load<
	Input extends LoadInputExtends = Required<LoadInputExtends>,
	Output extends LoadOutputExtends = Required<LoadOutputExtends>
> {
	(
		input: LoadInput<
			InferValue<Input, 'pageParams', Record<string, string>>,
			InferValue<Input, 'stuff', Record<string, any>>,
			InferValue<Input, 'session', any>
		>
	): MaybePromise<
		Either<
			Fallthrough,
			LoadOutput<
				InferValue<Output, 'props', Record<string, any>>,
				InferValue<Output, 'stuff', Record<string, any>>
			>
		>
	>;
}

export interface ErrorLoad<
	Input extends LoadInputExtends = Required<LoadInputExtends>,
	Output extends LoadOutputExtends = Required<LoadOutputExtends>
> {
	(
		input: ErrorLoadInput<
			InferValue<Input, 'pageParams', Record<string, string>>,
			InferValue<Input, 'stuff', Record<string, any>>,
			InferValue<Input, 'session', any>
		>
	): MaybePromise<
		LoadOutput<
			InferValue<Output, 'props', Record<string, any>>,
			InferValue<Output, 'stuff', Record<string, any>>
		>
	>;
}
