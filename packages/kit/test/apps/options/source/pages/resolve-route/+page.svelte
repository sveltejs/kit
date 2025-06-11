<script>
	import { resolve, resolveRoute } from '$app/paths';
	import SharedCss from '$lib/SharedCSS.svelte';

	const inter = 'interpolation';
	const links = [
		{
			label: 'resolveRoute (deprecated)',
			href: resolveRoute('/resolve-route/[foo]', { foo: 'resolveRoute' }),
			description: 'resolveRoute is deprecated',
			ok: true
		},
		{
			label: 'resolve',
			href: resolve('/resolve-route/[foo]', { foo: 'resolve' }),
			description: 'resolve is the new way to resolve routes, foo is of type string by default',
			ok: true
		},
		{
			label: 'interpolation',
			href: resolve(`/resolve-route/${inter}`),
			description: 'simple interpolation',
			ok: true
		},
		{
			label: 'interpolation yes but?',
			href: resolve(`/resolve-route/humm`),
			description:
				'interpolation is nice, but we can also have a typo and miss the "typecheck", no?',
			ok: false,
			indeterminate: true
		},
		{
			label: 'interpolation 2',
			href: resolve(`/resolve-route/i/${inter}/${inter}`),
			description: 'second interpolation',
			ok: true
		},
		{
			label: "resolve('/resolve-route/gp/(gpA)')",
			href: resolve('/resolve-route/gp/(gpA)'),
			description: "(gpA) is a group, and it's kept in the route id (DELTA WITH KITROUTES)",
			ok: false,
			indeterminate: true
		},
		{
			label: "resolve('/resolve-route/optional-params/[[lang]]', { lang: 'fr' })",
			href: resolve('/resolve-route/optional-params/[[lang]]', { lang: 'fr' }),
			description: 'optional-params lang is optional',
			ok: true
		},
		{
			label: "resolve('/resolve-route/optional-params/[[lang]]')",
			href: '', //resolve('/resolve-route/optional-params/[[lang]]'),
			description: 'We should not have a type error here ?',
			ok: false
		},
		{
			label: "resolve('/resolve-route/optional-params/[[lang]]', { lang: 'en' })",
			href: resolve('/resolve-route/optional-params/[[lang]]', { lang: 'en' }),
			description: '[[lang]] is optional, and it s kept in the route id (DELTA WITH KITROUTES)',
			ok: false,
			indeterminate: true
		},
		{
			label: "resolve('/resolve-route/numeric/[number=numeric]', { number: 123 })",
			href: '', //resolve('/resolve-route/numeric/[number=numeric]', { number: 123 }),
			description: 'type error',
			ok: false
		},
		{
			label: "resolve('/resolve-route/matched/[letter=lowercase]', { letter: 'A' })",
			href: resolve('/resolve-route/matched/[letter=lowercase]', { letter: 'A' }),
			description: 'Would be great to have the matcher ?',
			ok: false
		},
		{
			label: "resolve('/resolve-route/matched/[id=ab]', { id: 'c' })",
			href: resolve('/resolve-route/matched/[id=ab]', { id: 'c' }),
			description: 'Would be great to have the matcher ?',
			ok: false
		},
		{
			label: "resolve('/resolve-route/api/graphql')",
			href: resolve('/resolve-route/api/graphql'),
			description: 'server files',
			ok: true
		},
		{
			label: "resolve('/resolve-route/a/[...rest]/z', { rest: 'a' })",
			href: resolve('/resolve-route/a/[...rest]/z', { rest: 'a' }),
			description: 'catches all route',
			ok: true
		},
		{
			label: "resolve('/resolve-route/site')",
			href: resolve('/resolve-route/site'),
			description: 'We have an action there, maybe resolve should be a bit more specific ?',
			ok: false,
			indeterminate: true
		}
	];

	const idfy = (id) => id.replace(/[^a-zA-Z0-9]/g, '-');
</script>

<ul>
	{#each links as { label, href, ok, indeterminate, description }}
		<li>
			<input type="checkbox" checked={ok} {indeterminate} />
			<div>
				<a data-id="target-{idfy(label)}" {href}>{label}</a>
				<i>{description}</i>
			</div>
		</li>
	{/each}
</ul>

<hr />

<SharedCss />

<style>
	li {
		/* height: 33px; */
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem 0;
	}

	div {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	input[type='checkbox'] {
		accent-color: green;
		width: 2rem;
		height: 2rem;
	}

	input[type='checkbox']:indeterminate {
		accent-color: blue;
	}
</style>
