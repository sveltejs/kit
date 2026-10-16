import { parse, serialize } from 'cookie';
import devalue from 'devalue';
import clsx from 'clsx';

/** @type {import('./$types').PageServerLoad} */
export function load({ cookies }) {
	cookies.set('runtime-dependency', 'kit');

	return {
		url: new URL('https://example.com/kit'),
		legacy_cookie: serialize('legacy', parse('legacy=app').legacy),
		legacy_devalue: devalue({ hello: 'app' }),
		legacy_class: clsx('app', { legacy: true })
	};
}
