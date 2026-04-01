import * as Kit from '@sveltejs/kit';

declare const cookies: Kit.Cookies;

const parse_options: Kit.CookieParseOptions = {
	decode: (value) => value
};

const serialize_options: Kit.CookieSerializeOptions = {
	httpOnly: true,
	secure: true
};

cookies.get('session', parse_options);
cookies.getAll(parse_options);
cookies.set('session', 'value', { ...serialize_options, path: '/' });
cookies.delete('session', { ...serialize_options, path: '/' });
cookies.serialize('session', 'value', { ...serialize_options, path: '/' });
