import { InferValue, MaybePromise, Rec } from './helper';

export interface Page<Params extends Record<string, string> = Record<string, string>> {
	host: string;
	path: string;
	params: Params;
	query: URLSearchParams;
}

export interface LoadInput<
	PageParams extends Rec<string> = Rec<string>,
	Stuff extends Rec = Rec,
	Session = any
> {
	page: Page<PageParams>;
	fetch(info: RequestInfo, init?: RequestInit): Promise<Response>;
	session: Session;
	stuff: Stuff;
}

export interface ErrorLoadInput<
	PageParams extends Rec<string> = Rec<string>,
	Stuff extends Rec = Rec,
	Session = any
> extends LoadInput<PageParams, Stuff, Session> {
	status?: number;
	error?: Error;
}

export interface LoadOutput<Props extends Rec = Rec, Stuff extends Rec = Rec> {
	status?: number;
	error?: string | Error;
	redirect?: string;
	props?: Props;
	stuff?: Stuff;
	maxage?: number;
}

interface LoadInputExtends {
	stuff?: Rec;
	pageParams?: Rec<string>;
	session?: any;
}

interface LoadOutputExtends {
	stuff?: Rec;
	props?: Rec;
}

export interface Load<
	Input extends LoadInputExtends = Required<LoadInputExtends>,
	Output extends LoadOutputExtends = Required<LoadOutputExtends>
> {
	(
		input: LoadInput<
			InferValue<Input, 'pageParams', Rec<string>>,
			InferValue<Input, 'stuff', Rec>,
			InferValue<Input, 'session', any>
		>
	): MaybePromise<void | LoadOutput<
		InferValue<Output, 'props', Rec>,
		InferValue<Output, 'stuff', Rec>
	>>;
}

export interface ErrorLoad<
	Input extends LoadInputExtends = Required<LoadInputExtends>,
	Output extends LoadOutputExtends = Required<LoadOutputExtends>
> {
	(
		input: ErrorLoadInput<
			InferValue<Input, 'pageParams', Rec<string>>,
			InferValue<Input, 'stuff', Rec>,
			InferValue<Input, 'session', any>
		>
	): MaybePromise<LoadOutput<InferValue<Output, 'props', Rec>, InferValue<Output, 'stuff', Rec>>>;
}
