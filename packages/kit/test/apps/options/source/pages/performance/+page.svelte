<script>
	import Image from './favicon.png?no-inline';
</script>

<p>
	this app has paths.assets set so it should not use relative paths for imported assets in the
	client code
</p>

<img src={Image} alt="svelte logo" />
