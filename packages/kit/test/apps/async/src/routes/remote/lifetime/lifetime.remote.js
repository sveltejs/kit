import { query } from '$app/server';

const counts = {
	nav: 0,
	auto: 0,
	stale: 0,
	bfcache: 0,
	pending: 0
};

export const navigation_count = query(() => {
	query.lifetime({ refreshOnNavigation: true });
	return ++counts.nav;
});

export const auto_count = query(() => {
	query.lifetime({ refreshAfter: '0.2s', bfcache: false });
	return ++counts.auto;
});

export const stale_count = query(() => {
	query.lifetime({ staleAfter: '0.2s', bfcache: { limit: 5, maxAge: '5s' } });
	return ++counts.stale;
});

export const bfcache_count = query(() => {
	query.lifetime({ bfcache: { limit: 1, maxAge: '5s' } });
	return ++counts.bfcache;
});

export const pending_count = query(async () => {
	await new Promise((resolve) => setTimeout(resolve, 1000));
	return ++counts.pending;
});
