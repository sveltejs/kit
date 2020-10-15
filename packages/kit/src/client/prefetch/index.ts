import {
	select_target,
	prefetching,
	set_prefetching,
	hydrate_target
} from '../app';

export default function prefetch(href: string) {
	const target = select_target(new URL(href, document.baseURI));

	if (target) {
		if (!prefetching || href !== prefetching.href) {
			set_prefetching(href, hydrate_target(target));
		}

		return prefetching.promise;
	}
}
