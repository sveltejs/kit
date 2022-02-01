import { Fallthrough } from './endpoint';
import { Either, MaybePromise } from './helper';

export interface LoadInput<Params = Record<string, string>> {
	url: URL;
	params: Params;
	fetch(info: RequestInfo, init?: RequestInit): Promise<Response>;
	session: SvelteKit.Session;
	stuff: Partial<SvelteKit.Stuff>;
}

export interface ErrorLoadInput<Params = Record<string, string>> extends LoadInput<Params> {
	status?: number;
	error?: Error;
}

export interface LoadOutput<Props = Record<string, any>> {
	status?: number;
	error?: string | Error;
	redirect?: string;
	props?: Props;
	stuff?: Partial<SvelteKit.Stuff>;
	maxage?: number;
}

interface LoadInputExtends {
	params?: Record<string, string>;
}

interface LoadOutputExtends {
	props?: Record<string, any>;
}

export interface Load<Params = Record<string, string>, Props = Record<string, any>> {
	(input: LoadInput<Params>): MaybePromise<Either<Fallthrough, LoadOutput<Props>>>;
}

export interface ErrorLoad<Params = Record<string, string>, Props = Record<string, any>> {
	(input: ErrorLoadInput<Params>): MaybePromise<LoadOutput<Props>>;
}
