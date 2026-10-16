<script>
	import image from './image.svg?no-inline';
	let { data } = $props();
</script>

<img src={image} alt="Imported asset" />
<p>{data.contents}</p>
<a href={data.asset}>Server-only asset</a>
<a href={data.worker}>Worker asset</a>
