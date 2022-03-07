/// <reference types="@sveltejs/kit" />

// See https://kit.svelte.dev/docs/types#the-app-namespace
// for information about these interfaces
declare namespace App {
	interface Locals {
		userid: string;
	}

	// interface Platform {}

	// interface Session {}

	// interface Stuff {}
}

type Todo = {
	uid: string;
	created_at: Date;
	text: string;
	done: boolean;
	pending_delete: boolean;
};
