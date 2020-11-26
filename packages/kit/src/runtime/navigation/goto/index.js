import { cid, history, navigate, select_target } from '../internal';
import { get_base_uri } from '../utils';

export default function goto(
	href,
	opts = { noscroll: false, replaceState: false }
) {
	const target = select_target(new URL(href, get_base_uri(document)));

	if (target) {
		history[opts.replaceState ? 'replaceState' : 'pushState']({ id: cid }, '', href);
		return navigate(target, null, opts.noscroll);
	}

	location.href = href;
	return new Promise(() => {
		/* never resolves */
	});
}
