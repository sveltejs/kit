import { Adapter } from '@sveltejs/kit';

type Locale = {
  redirect?: Record<string, string>;
  cookie?: string;
};

type HostHasField = {
  type: 'host';
  value: string;
};

type HeaderHasField = {
  type: 'header';
  key: string;
  value?: string;
};

type CookieHasField = {
  type: 'cookie';
  key: string;
  value?: string;
};

type QueryHasField = {
  type: 'query';
  key: string;
  value?: string;
};

type SourceRoute = {
	src: string;
	dest?: string;
	headers?: Record<string, string>;
	methods?: string[];
	continue?: boolean;
	caseSensitive?: boolean;
	check?: boolean;
	status?: number;
	has?: Array<HostHasField | HeaderHasField | CookieHasField | QueryHasField>;
	missing?: Array<
		HostHasField | HeaderHasField | CookieHasField | QueryHasField
	>;
	locale?: Locale;
	middlewarePath?: string;
};

type Options = {
	edge?: boolean;
	external?: string[];
	split?: boolean;
	source_routes?: Array<SourceRoute>
};

export default function plugin(options?: Options): Adapter;
