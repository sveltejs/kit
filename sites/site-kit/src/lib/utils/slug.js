export const make_session_slug_processor = () => {
	const seen = new Set();

	return string => {
		const slug = string.replace(/[^a-z0-9-]/gi, '-').replace(/-{2,}/g, '-').replace(/^-/, '').replace(/-$/, '').toLowerCase();

		if (seen.has(slug)) throw new Error(`Duplicate slug ${slug}`);
		seen.add(slug);

		return slug;
	}
}
