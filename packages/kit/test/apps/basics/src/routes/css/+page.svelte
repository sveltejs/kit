<script>
	import './_styles.css';
	import './_manual.css?url';
	import './_manual.css?raw';
	import './_manual.css?inline';
	import 'virtual:styles.css';
</script>

<div class="styled">this text is red</div>

<div class="also-styled">this text is blue</div>

<div class="overridden">this text is green</div>

<div class="not">this text is black</div>

<div class="virtual">this text is orange</div>

<a href="/css/other">other</a>

<style>
	.also-styled {
		color: blue;
	}
</style>
