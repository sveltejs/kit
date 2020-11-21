export type Loader = (url: string) => Promise<any>;

export type Query = Record<string, string | true>;

export type Params = Record<string, any>;

export interface Request {
	host: string;
	path: string;
	query: Query;
	params: Params;
}

export interface Response {
	status?: number;
	text?: string;
	headers?: Record<string, string>;
	body: any;
}

export interface ServerRoute {
	get?: (request?: Request, session?: any) => Response | Promise<Response>;
	post?: (request?: Request, session?: any) => Response | Promise<Response>;
	put?: (request?: Request, session?: any) => Response | Promise<Response>;
	del?: (request?: Request, session?: any) => Response | Promise<Response>;
}

export interface PageComponent {
	default: {
		render: (
			props: Record<string, any>
		) => {
			html: string;
			head: string;
			css: {
				code: string;
				map: any; // TODO
			};
		};
	};
	preload?: (page?: Request, session?: any) => Record<string, any>;
}

export interface DevConfig {
	port: number;
}
