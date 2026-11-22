<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { consent, keyed, locked, plain } from './form.remote.ts';

	// rendered from the URL so that it can differ without JavaScript
	const show_extra = $derived(page.url.searchParams.has('extra'));
	const item = keyed.for('a b');

	let hydrated = $state(false);

	onMount(() => {
		hydrated = true;
	});
</script>

<div id="hydrated">{hydrated}</div>

<form id="plain" {...plain}>
	<input {...plain.fields.name.as('text')} />
	<input id="subscribe" {...plain.fields.subscribe.as('checkbox')} />

	{#each ['html', 'css', 'js'] as lang}
		<input {...plain.fields.langs.as('checkbox', lang)} />
	{/each}

	<select {...plain.fields.colors.as('select multiple')}>
		<option>red</option>
		<option>green</option>
	</select>

	{#each [0, 1, 2] as i}
		<input class="flag" {...plain.fields.flags[i].as('checkbox')} />
	{/each}

	<input id="notify" {...plain.fields.nested.notify.as('checkbox')} />

	{#if show_extra}
		<input id="extra" {...plain.fields.extra.as('checkbox')} />
	{/if}

	<button>submit</button>
</form>

<p id="plain-result">{JSON.stringify(plain.result ?? null)}</p>
<p id="plain-issues">{JSON.stringify(plain.fields.allIssues() ?? [])}</p>

<form id="consent" {...consent}>
	<input id="agree" {...consent.fields.agree.as('checkbox')} />
	<input id="terms" {...consent.fields.legal.terms.as('checkbox')} />
	<button>submit</button>
</form>

<p id="consent-result">{consent.result ?? 'none'}</p>
<p id="agree-issues">{JSON.stringify(consent.fields.agree.issues() ?? [])}</p>
<p id="terms-issues">{JSON.stringify(consent.fields.legal.terms.issues() ?? [])}</p>

<form id="keyed" {...item}>
	<input id="done" {...item.fields.done.as('checkbox')} />
	<button>submit</button>
</form>

<p id="keyed-result">{JSON.stringify(item.result ?? null)}</p>

<!-- the browser never submits a disabled control, checked or not -->
<form id="locked" {...locked}>
	<input disabled {...locked.fields.on.as('checkbox', true)} />
	<button>submit</button>
</form>

<p id="locked-result">{JSON.stringify(locked.result ?? null)}</p>
