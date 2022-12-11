<!--
-----------------------------------------------
	svg icon
	- https://github.com/jacobmischka/svelte-feather-icon
	- https://feathericons.com/
-----------------------------------------------
-->
<script>
	export let name;
	export let size = 20;
</script>

<svg class="icon" width={size} height={size}>
	<use xlink:href="#{name}" />
</svg>

<style>
	.icon {
		position: relative;
		overflow: hidden;
		vertical-align: middle;
		-o-object-fit: contain;
		object-fit: contain;
		-webkit-transform-origin: center center;
		transform-origin: center center;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
		fill: none;
	}
</style>
