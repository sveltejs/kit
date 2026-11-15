import { rules } from '../../eslint/index.js';
import { svelte, tester } from './_rule-tester.js';

tester.run('css-variable-prefix', rules['css-variable-prefix'], {
	valid: [
		svelte(`<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable="--font-inter" preload />
`),
		svelte(`<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable="--font-sans" />
<Font cssVariable="--font-a" />
`),
		svelte(`<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
	let x = '--font-inter';
</script>

<Font cssVariable={x} />
`),
		svelte(`<script>
	import Font from '$lib/other-font.svelte';
</script>

<Font cssVariable="--heading" />
`),
		svelte(`<script>
	import KitFont from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<KitFont cssVariable="--font-inter" />
`)
	],
	invalid: [
		{
			...svelte(`<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable="--heading" />
`),
			errors: [{ messageId: 'prefix', data: { cssVariable: '--heading' } }]
		},
		{
			...svelte(`<script>
	import KitFont from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<KitFont cssVariable="--heading" />
`),
			errors: [{ messageId: 'prefix', data: { cssVariable: '--heading' } }]
		},
		{
			...svelte(`<script>
	import { default as KitFont } from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<KitFont cssVariable="--test" />
`),
			errors: [{ messageId: 'prefix', data: { cssVariable: '--test' } }]
		},
		{
			...svelte(`<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable="--heading-font" />
`),
			errors: [{ messageId: 'prefix', data: { cssVariable: '--heading-font' } }]
		},
		{
			...svelte(`<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable="font-inter" />
`),
			errors: [{ messageId: 'prefix', data: { cssVariable: 'font-inter' } }]
		},
		{
			...svelte(`<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable="--font" />
`),
			errors: [{ messageId: 'prefix', data: { cssVariable: '--font' } }]
		},
		{
			...svelte(`<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable="--font-" />
`),
			errors: [{ messageId: 'prefix', data: { cssVariable: '--font-' } }]
		},
		{
			...svelte(`<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable="--test" />
`),
			errors: [{ messageId: 'prefix', data: { cssVariable: '--test' } }]
		},
		{
			...svelte(`<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable="--font:inter" />
`),
			errors: [{ messageId: 'prefix', data: { cssVariable: '--font:inter' } }]
		},
		{
			...svelte(`<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable="--font inter" />
`),
			errors: [{ messageId: 'prefix', data: { cssVariable: '--font inter' } }]
		},
		{
			...svelte(`<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable={'--heading'} />
`),
			errors: [{ messageId: 'prefix', data: { cssVariable: '--heading' } }]
		}
	]
});
