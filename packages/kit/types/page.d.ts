export type LoadInput = {
	page: Page;
	fetch: (info: RequestInfo, init?: RequestInit) => Promise<Response>;
	session: any;
	context: Record<string, any>;
};

export type ErrorLoadInput = LoadInput & {
	status: number;
	error: Error;
};

export type LoadOutput = {
	status?: number;
	error?: Error;
	redirect?: string;
	props?: Record<string, any> | Promise<Record<string, any>>;
	context?: Record<string, any>;
	maxage?: number;
};

/* Publicized Types */
export type Load = (input: LoadInput) => LoadOutput | Promise<LoadOutput>;
export type ErrorLoad = (input: ErrorLoadInput) => LoadOutput | Promise<LoadOutput>;
export type Page = {
	host: string;
	path: string;
	params: Record<string, string>;
	query: URLSearchParams;
};
