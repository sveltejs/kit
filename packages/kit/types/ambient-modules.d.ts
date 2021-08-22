declare module '@sveltejs/kit/hooks' {
	type Handle = import('@sveltejs/kit').Handle;

	/**
	 * Utility function that allows chaining `handle` functions in a
	 * middleware-like manner.
	 *
	 * @param handlers The chain of `handle` functions
	 */
	export function sequence(...handlers: Handle[]): Handle;
}
