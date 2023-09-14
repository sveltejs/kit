import * as devalue from 'devalue';
import { DEV } from 'esm-env';
import { invalidateAll } from './navigation.js';
import { applyAction } from '../client/client.js';

export { applyAction };

/**
 * Utilisez cette fonction pour désérialiser la réponse à une soumission de formulaire.
 * Usage:
 *
 * ```js
 * import { deserialize } from '$app/forms';
 *
 * async function handleSubmit(event) {
 *   const response = await fetch('/form?/action', {
 *     method: 'POST',
 *     body: new FormData(event.target)
 *   });
 *
 *   const result = deserialize(await response.text());
 *   // ...
 * }
 * ```
 * @template {Record<string, unknown> | undefined} Success
 * @template {Record<string, unknown> | undefined} Failure
 * @param {string} result
 * @returns {import('@sveltejs/kit').ActionResult<Success, Failure>}
 */
export function deserialize(result) {
	const parsed = JSON.parse(result);
	if (parsed.data) {
		parsed.data = devalue.parse(parsed.data);
	}
	return parsed;
}

/**
 * Shallow clone an element, so that we can access e.g. `form.action` without worrying
 * that someone has added an `<input name="action">` (https://github.com/sveltejs/kit/issues/7593)
 * @template {HTMLElement} T
 * @param {T} element
 * @returns {T}
 */
function clone(element) {
	return /** @type {T} */ (HTMLElement.prototype.cloneNode.call(element));
}

/**
 * Cette action améliore un élément `<form>` qui fonctionne même sans JavaScript.
 *
 * La fonction `submit` est appelée à la soumission avec l'objet `FormData` donné et l'`action` qui doit être déclenchée.
 * Si la fonction `cancel` est exécutée, le formulaire ne sera pas envoyé.
 * Vous pouvez utiliser le `controller` d'annulation pour annuler la soumission dans le cas où une autre soumission démarre.
 * Si une fonction est renvoyée, cette fonction est appelée avec la réponse du serveur.
 * Si rien n'est renvoyé, le comportement par défaut sera utilisé.
 *
 * Si cette fonction ou sa valeur de retour n'est pas définie, SvelteKit
 * - met à jour par défaut la propriété `form` avec la donnée renvoyée si l'action est sur la même page que le formulaire
 * - met à jour `$page.status`
 * - réinitialise l'élément `<form>` et invalide toutes les données dans le cas où la soumission est réussie sans redirection
 * - redirige en cas de réponse de redirection
 * - redirige vers la page d'erreur la plus proche dans le cas d'une erreur inattendue
 *
 * Si vous fournissez une fonction personnalisée avec un <span class='vo'>[callback](https://sveltefr.dev/docs/development#callback)</span> et voulez utiliser le comportement par défaut, exécutez `update` dans votre callback.
 * @template {Record<string, unknown> | undefined} Success
 * @template {Record<string, unknown> | undefined} Failure
 * @param {HTMLFormElement} form_element The form element
 * @param {import('@sveltejs/kit').SubmitFunction<Success, Failure>} submit Submit callback
 */
export function enhance(form_element, submit = () => {}) {
	if (DEV && clone(form_element).method !== 'post') {
		throw new Error('use:enhance can only be used on <form> fields with method="POST"');
	}

	/**
	 * @param {{
	 *   action: URL;
	 *   invalidateAll?: boolean;
	 *   result: import('@sveltejs/kit').ActionResult;
	 *   reset?: boolean
	 * }} opts
	 */
	const fallback_callback = async ({
		action,
		result,
		reset = true,
		invalidateAll: shouldInvalidateAll = true
	}) => {
		if (result.type === 'success') {
			if (reset) {
				// We call reset from the prototype to avoid DOM clobbering
				HTMLFormElement.prototype.reset.call(form_element);
			}
			if (shouldInvalidateAll) {
				await invalidateAll();
			}
		}

		// For success/failure results, only apply action if it belongs to the
		// current page, otherwise `form` will be updated erroneously
		if (
			location.origin + location.pathname === action.origin + action.pathname ||
			result.type === 'redirect' ||
			result.type === 'error'
		) {
			applyAction(result);
		}
	};

	/** @param {SubmitEvent} event */
	async function handle_submit(event) {
		const method = event.submitter?.hasAttribute('formmethod')
			? /** @type {HTMLButtonElement | HTMLInputElement} */ (event.submitter).formMethod
			: clone(form_element).method;
		if (method !== 'post') return;

		event.preventDefault();

		const action = new URL(
			// We can't do submitter.formAction directly because that property is always set
			event.submitter?.hasAttribute('formaction')
				? /** @type {HTMLButtonElement | HTMLInputElement} */ (event.submitter).formAction
				: clone(form_element).action
		);

		const form_data = new FormData(form_element);

		if (DEV && clone(form_element).enctype !== 'multipart/form-data') {
			for (const value of form_data.values()) {
				if (value instanceof File) {
					throw new Error(
						'Your form contains <input type="file"> fields, but is missing the necessary `enctype="multipart/form-data"` attribute. This will lead to inconsistent behavior between enhanced and native forms. For more details, see https://github.com/sveltejs/kit/issues/9819.'
					);
				}
			}
		}

		const submitter_name = event.submitter?.getAttribute('name');
		if (submitter_name) {
			form_data.append(submitter_name, event.submitter?.getAttribute('value') ?? '');
		}

		const controller = new AbortController();

		let cancelled = false;
		const cancel = () => (cancelled = true);

		const callback =
			(await submit({
				action,
				cancel,
				controller,
				formData: form_data,
				formElement: form_element,
				submitter: event.submitter
			})) ?? fallback_callback;
		if (cancelled) return;

		/** @type {import('@sveltejs/kit').ActionResult} */
		let result;

		try {
			const response = await fetch(action, {
				method: 'POST',
				headers: {
					accept: 'application/json',
					'x-sveltekit-action': 'true'
				},
				cache: 'no-store',
				body: form_data,
				signal: controller.signal
			});

			result = deserialize(await response.text());
			if (result.type === 'error') result.status = response.status;
		} catch (error) {
			if (/** @type {any} */ (error)?.name === 'AbortError') return;
			result = { type: 'error', error };
		}

		callback({
			action,
			formData: form_data,
			formElement: form_element,
			update: (opts) =>
				fallback_callback({
					action,
					result,
					reset: opts?.reset,
					invalidateAll: opts?.invalidateAll
				}),
			// @ts-expect-error generic constraints stuff we don't care about
			result
		});
	}

	// @ts-expect-error
	HTMLFormElement.prototype.addEventListener.call(form_element, 'submit', handle_submit);

	return {
		destroy() {
			// @ts-expect-error
			HTMLFormElement.prototype.removeEventListener.call(form_element, 'submit', handle_submit);
		}
	};
}
