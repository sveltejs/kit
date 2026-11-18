// used by `src/routes/read-file` to check that `read` ignores extra queries on asset URLs
declare module '*?url&no-inline&v=1' {
	const src: string;
	export default src;
}
