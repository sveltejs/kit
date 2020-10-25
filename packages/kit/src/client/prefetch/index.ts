import { hydrate_target } from '../app';
import { select_target } from '../router';
import find_anchor from '../router/find_anchor';
import { HydratedTarget, Target } from '../types';
import { get_base_uri } from '../baseuri_helper';

let prefetching: {
	href: string;
	promise: Promise<HydratedTarget>;
} = null;

let mousemove_timeout: NodeJS.Timer;

export function start() {
	addEventListener('touchstart', trigger_prefetch);
	addEventListener('mousemove', handle_mousemove);
}

export default function prefetch(href: string) {
	const target = select_target(new URL(href, get_base_uri(document)));

	if (target) {
		if (!prefetching || href !== prefetching.href) {
			prefetching = { href, promise: hydrate_target(target) };
		}

		return prefetching.promise;
	}
}

export function get_prefetched(target: Target): Promise<HydratedTarget> {
	if (prefetching && prefetching.href === target.href) {
		return prefetching.promise;
	} else {
		return hydrate_target(target);
	}
}

function trigger_prefetch(event: MouseEvent | TouchEvent) {
	const a: HTMLAnchorElement = <HTMLAnchorElement>find_anchor(<Node>event.target);

	if (a && a.rel === 'prefetch') {
		prefetch(a.href);
	}
}

function handle_mousemove(event: MouseEvent) {
	clearTimeout(mousemove_timeout);
	mousemove_timeout = setTimeout(() => {
		trigger_prefetch(event);
	}, 20);
}
