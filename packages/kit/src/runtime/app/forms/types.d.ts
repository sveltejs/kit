import type { MaybePromise } from '../../../types/private.js';
/**
 * When calling a form action via fetch, the response will be one of these shapes.
 * ```svelte
 * <form method="post" use:enhance={() => {
 *   return ({ result }) => {
 * 		// result is of type ActionResult
 *   };
 * }}
 * ```
 *
 * Success and failure results carry the root-relative `pathname + search` of the action URL, with
 * the `?/actionName` parameter removed. Redirect results carry the redirect target. Server-generated
 * error results also carry the action location, while client-generated errors such as network
 * failures do not. `update` uses this location to emulate native form navigation.
 */
export type ActionResult<
	Success extends Record<string, unknown> | undefined = Record<string, any>,
	Failure extends Record<string, unknown> | undefined = Record<string, any>
> =
	| { type: 'success'; status: number; data?: Success; location: string }
	| { type: 'failure'; status: number; data?: Failure; location: string }
	| { type: 'redirect'; status: number; location: string }
	| { type: 'error'; status?: number; error: App.Error; location?: string };

export type SubmitFunction<
	Success extends Record<string, unknown> | undefined = Record<string, any>,
	Failure extends Record<string, unknown> | undefined = Record<string, any>
> = (input: {
	action: URL;
	formData: FormData;
	formElement: HTMLFormElement;
	controller: AbortController;
	submitter: HTMLElement | null;
	cancel: () => void;
}) => MaybePromise<
	| void
	| ((opts: {
			formData: FormData;
			formElement: HTMLFormElement;
			action: URL;
			result: ActionResult<Success, Failure>;
			/**
			 * Call this to get the default behavior of a form submission response.
			 * @param options Set `reset: false` if you don't want the `<form>` values to be reset after a successful submission. `refreshAll` defaults to `true` for successful results and `false` for failures. When the submission navigates, setting it to `false` still runs the destination's `load` functions but may reuse shared layout data. Set `navigate: false` to apply non-redirect results to the current page instead of navigating to `result.location`. Redirects are always followed.
			 */
			update: (options?: {
				reset?: boolean;
				refreshAll?: boolean;
				navigate?: boolean;
				/** @deprecated Use `refreshAll` instead. */
				invalidateAll?: boolean;
			}) => Promise<void>;
	  }) => MaybePromise<void>)
>;
