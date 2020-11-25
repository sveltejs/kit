import { hydrate_target } from '../start'; // TODO does this belong here?
import { select_target } from '../internal';
import { find_anchor, get_base_uri } from '../utils';


let prefetching


 = null;

let mousemove_timeout;

export function start() {
	addEventListener('touchstart', trigger_prefetch);
	addEventListener('mousemove', handle_mousemove);
}

export default function prefetch(href) {
	const target = select_target(new URL(href, get_base_uri(document)));

	if (target) {
		if (!prefetching || href !== prefetching.href) {
			prefetching = { href, promise: hydrate_target(target) };
		}

		return prefetching.promise;
	}
}

export function get_prefetched(target) {
	if (prefetching && prefetching.href === target.href) {
		return prefetching.promise;
	} else {
		return hydrate_target(target);
	}
}

function trigger_prefetch(event) {
	const a = find_anchor(event.target);

	if (a && a.rel === 'prefetch') {
		prefetch(a.href);
	}
}

function handle_mousemove(event) {
	clearTimeout(mousemove_timeout);
	mousemove_timeout = setTimeout(() => {
		trigger_prefetch(event);
	}, 20);
}
