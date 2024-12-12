<!-- Append to the end of page -->
### PageProps

For defining types of `$props` rune in `page.svelte`, you would normally do the following

```svelte
<!--- file: page.svelte --->
<script>
  import { PageData } from './$types';

  interface Props {
    data: PageData;
  }

	let { data }: Props = $props();
</script>
```

If you don't want to write this for every page, you can do the following instead

```svelte
<!--- file: page.svelte --->
<script>
	import { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>
```