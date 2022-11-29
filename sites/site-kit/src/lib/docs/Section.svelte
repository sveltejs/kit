<script>
	import Icon from '../components/Icon.svelte';

	export let section;
	export let edit;
</script>

<section data-id={section.slug}>
	<h2 id={section.slug}>
		{@html section.title}

		<small>
			<a href={edit} title="edit this section">
				<Icon name="edit" />
			</a>
		</small>
	</h2>

	{@html section.content}
</section>
