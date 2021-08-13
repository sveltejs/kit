import { InferValue, Location as Page, MaybePromise, Rec } from './helper';

export interface LoadInput<
	PageParams extends Rec<string> = Rec<string>,
	Context extends Rec = Rec,
	Session = any
> {
	page: Page<PageParams>;
	fetch(info: RequestInfo, init?: RequestInit): Promise<Response>;
	session: Session;
	context: Context;
}

export interface ErrorLoadInput<
	PageParams extends Rec<string> = Rec<string>,
	Context extends Rec = Rec,
	Session = any
> extends LoadInput<PageParams, Context, Session> {
	status?: number;
	error?: Error;
}

export interface LoadOutput<Props extends Rec = Rec, Context extends Rec = Rec> {
	status?: number;
	error?: string | Error;
	redirect?: string;
	props?: Props;
	context?: Context;
	maxage?: number;
}

interface LoadInputExtends {
	context?: Rec;
	pageParams?: Rec<string>;
	session?: any;
}

interface LoadOutputExtends {
	context?: Rec;
	props?: Rec;
}

export interface Load<
	Input extends LoadInputExtends = Required<LoadInputExtends>,
	Output extends LoadOutputExtends = Required<LoadOutputExtends>
> {
	(
		input: LoadInput<
			InferValue<Input, 'pageParams', Rec<string>>,
			InferValue<Input, 'context', Rec>,
			InferValue<Input, 'session', any>
		>
	): MaybePromise<void | LoadOutput<
		InferValue<Output, 'props', Rec>,
		InferValue<Output, 'context', Rec>
	>>;
}

export interface ErrorLoad<
	Input extends LoadInputExtends = Required<LoadInputExtends>,
	Output extends LoadOutputExtends = Required<LoadOutputExtends>
> {
	(
		input: ErrorLoadInput<
			InferValue<Input, 'pageParams', Rec<string>>,
			InferValue<Input, 'context', Rec>,
			InferValue<Input, 'session', any>
		>
	): MaybePromise<LoadOutput<InferValue<Output, 'props', Rec>, InferValue<Output, 'context', Rec>>>;
}

export { Page };
