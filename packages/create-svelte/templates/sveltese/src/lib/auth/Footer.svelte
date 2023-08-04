<script lang="ts">
	import { APP_NAME } from '$env/static/private'
</script>

<nav class="container-fluid">
	<ul>
		<li>
			<svg width="25" height="25" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				<path
					d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 4.81 11.57 5.47L12 6L12.43 5.47C13.09 4.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				/>
			</svg>
			<a href="https://github.com/sponsors/edanisko">Sponsor</a>
		</li>
	</ul>
	<ul>
		<li>
			{APP_NAME} v0.0.1 (SvelteKit v1.15.7)
		</li>
	</ul>
</nav>
