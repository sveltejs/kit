import { rules } from '../../eslint/index.js';
import { svelte, tester } from './_rule-tester.js';

tester.run('no-duplicate-font', rules['no-duplicate-font'], {
	valid: [
		svelte(`<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable="--font-inter" preload />
`),
		svelte(
			`<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable="--font-inter" />
<Font cssVariable="--font-display" />
`,
			'src/routes/display/+page.svelte'
		),
		svelte(`<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
	let x = '--font-inter';
</script>

<Font cssVariable={x} />
<Font cssVariable={x} />
`),
		svelte(`<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
	let x = '--font-inter';
</script>

<Font cssVariable="--font-inter" />
<Font cssVariable={x} />
`),
		svelte(`<script>
	import Font from '$lib/other-font.svelte';
</script>

<Font cssVariable="--font-inter" />
<Font cssVariable="--font-inter" />
`),
		svelte(`<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
	import OtherFont from '$lib/other-font.svelte';
</script>

<Font cssVariable="--font-inter" />
<OtherFont cssVariable="--font-inter" />
`)
	],
	invalid: [
		{
			...svelte(`<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable="--font-inter" />
<Font cssVariable="--font-inter" preload />
`),
			errors: [{ messageId: 'duplicateFont', data: { cssVariable: '--font-inter' } }]
		},
		{
			...svelte(`<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable="--font-inter" />
<Font cssVariable={'--font-inter'} />
<Font cssVariable="--font-inter" />
`),
			errors: [
				{ messageId: 'duplicateFont', data: { cssVariable: '--font-inter' } },
				{ messageId: 'duplicateFont', data: { cssVariable: '--font-inter' } }
			]
		},
		{
			...svelte(`<script>
	import KitFont from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<KitFont cssVariable="--font-inter" />
<KitFont cssVariable="--font-inter" />
`),
			errors: [{ messageId: 'duplicateFont', data: { cssVariable: '--font-inter' } }]
		}
	]
});
