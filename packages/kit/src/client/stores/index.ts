import { writable, Readable } from 'svelte/store';

/** Callback to inform of a value updates. */
type Subscriber<T> = (value: T) => void;

/** Unsubscribes from value updates. */
type Unsubscriber = () => void;

/** Writable interface for both updating and subscribing. */
interface PageStore<T> extends Readable<T> {
	/**
	 * Inform subscribers.
	 */
	notify(): void;

	/**
	 * Set value without informing subscribers.
	 * @param value to set
	 */
	set(value: T): void;
}

export function page_store<T>(value: T): PageStore<T> {
	const store = writable(value);
	let ready = true;

	function notify(): void {
		ready = true;
		store.update(val => val);
	}

	function set(new_value: T): void {
		ready = false;
		store.set(new_value);
	}

	function subscribe(run: Subscriber<T>): Unsubscriber {
		let old_value;
		return store.subscribe((new_value) => {
			if (old_value === undefined || (ready && new_value !== old_value)) {
				run(old_value = new_value);
			}
		});
	}

	return { notify, set, subscribe };
}
