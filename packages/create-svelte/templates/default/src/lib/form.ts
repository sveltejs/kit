import { invalidate } from '$app/navigation';

// this action (https://svelte.dev/tutorial/actions) allows us to
// progressively enhance a <form> that already works without JS
/**
 * @param {HTMLFormElement} form
 * @param {{
 *   pending?: ({ data, form }: { data: FormData; form: HTMLFormElement }) => void;
 *   error?: ({
 *     data,
 *     form,
 *     response,
 *     error
 *   }: {
 *     data: FormData;
 *     form: HTMLFormElement;
 *     response: Response | null;
 *     error: Error | null;
 *   }) => void;
 *   result?: ({
 *     data,
 *     form,
 *     response
 *   }: {
 *     data: FormData;
 *     response: Response;
 *     form: HTMLFormElement;
 *   }) => void;
 * }} opts
 */
export function enhance(
	form: HTMLFormElement,
	{
		pending,
		error,
		result
	}: {
		pending?: ({ data, form }: { data: FormData; form: HTMLFormElement }) => void;
		error?: ({
			data,
			form,
			response,
			error
		}: {
			data: FormData;
			form: HTMLFormElement;
			response: Response | null;
			error: Error | null;
		}) => void;
		result?: ({
			data,
			form,
			response
		}: {
			data: FormData;
			response: Response;
			form: HTMLFormElement;
		}) => void;
	} = {}
) {
	let current_token: unknown;

	/** @param {SubmitEvent} event */
	async function handle_submit(event: SubmitEvent) {
		const token = (current_token = {});

		event.preventDefault();

		const data = new FormData(form);

		if (pending) pending({ data, form });

		try {
			const response = await fetch(form.action, {
				method: form.method,
				headers: {
					accept: 'application/json'
				},
				body: data
			});

			if (token !== current_token) return;

			if (response.ok) {
				if (result) result({ data, form, response });
				invalidate();
			} else if (error) {
				error({ data, form, error: null, response });
			} else {
				console.error(await response.text());
			}
		} catch (err: unknown) {
			if (error && err instanceof Error) {
				error({ data, form, error: err, response: null });
			} else {
				throw err;
			}
		}
	}

	form.addEventListener('submit', handle_submit);

	return {
		destroy() {
			form.removeEventListener('submit', handle_submit);
		}
	};
}
