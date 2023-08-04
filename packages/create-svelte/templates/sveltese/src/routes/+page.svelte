<script lang="ts">
	import Logo from '$lib/shared/Logo.svelte'
</script>

<nav class="absolute top-0 right-0 pt-4 pr-4">
	<a href="/login" class="text-gray-600 hover:text-gray-800 font-medium mr-4">Login</a>
	<a href="/register" class="text-gray-600 hover:text-gray-800 font-medium mr-4">Register</a>
</nav>

<div class="mx-auto lg:mt-64 content">
	<div class="flex justify-center items-center my-8">
		<Logo />
	</div>
</div>
<div class=" lg:mx-28 my-8 content">
	<div class="grid sm:grid-cols-2 grid-rows-2 gap-6 px-8">
		<!-- Templates -->
		<div class="bg-white shadow-md rounded-lg px-6 py-8">
			<a href="https://github.com/sveltese/sveltese">
				<div class="w-full mb-6">
					<div
						class="h-16 w-16 bg-orange-50 dark:bg-orange-800/20 flex items-center justify-center rounded-full"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="w-6 h-6 text-orange-500 dark:text-orange-400"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
							/>
						</svg>
					</div>
				</div>
				<h2 class="text-xl font-bold mb-2">Templates</h2>
				<p class="text-gray-500">
					Get a jumpstart on your coding with Sveltese. Use our GitHub template to start building
					your project quickly and efficiently.
				</p>
			</a>
		</div>
		<!-- Auth -->
		<div class="bg-white shadow-md rounded-lg px-6 py-8">
			<div class="w-full mb-6">
				<div
					class="h-16 w-16 bg-orange-50 dark:bg-orange-800/20 flex items-center justify-center rounded-full"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="w-6 h-6 text-orange-500 dark:text-orange-400"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
						/>
					</svg>
				</div>
			</div>
			<h2 class="text-xl font-bold mb-2">Authentication</h2>
			<p class="text-gray-500">
				Streamline your app development with Authentication Built In and a comprehensive set of
				pre-built resources to accelerate your development process with ease.
			</p>
		</div>
		<!-- Env -->
		<div class="bg-white shadow-md rounded-lg px-6 py-8">
			<div class="w-full mb-6">
				<div
					class="h-16 w-16 bg-orange-50 dark:bg-orange-800/20 flex items-center justify-center rounded-full"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="w-6 h-6 text-orange-500 dark:text-orange-400"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
						/>
					</svg>
				</div>
			</div>
			<h2 class="text-xl font-bold mb-2">Environments</h2>
			<p class="text-gray-500">
				Take control of your app's environment with Sveltese's easy-to-use .env file management,
				allowing for predictable and efficient production and development configurations.
			</p>
		</div>
		<!-- Mirgatation -->
		<div class="bg-white shadow-md rounded-lg px-6 py-8">
			<div class="w-full mb-6">
				<div
					class="h-16 w-16 bg-orange-50 dark:bg-orange-800/20 flex items-center justify-center rounded-full"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="w-6 h-6 text-orange-500 dark:text-orange-400"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"
						/>
					</svg>
				</div>
			</div>
			<h2 class="text-xl font-bold mb-2">Migrations</h2>
			<p class="text-gray-500">
				Effortlessly manage your initial database migrations with Sveltese's Prisma and xod stack,
				providing a streamlined and efficient development workflow.
			</p>
		</div>
	</div>
	<div class="flex justify-center mt-16 px-6 sm:items-center sm:justify-between">
		<div class="text-center text-sm text-gray-500 dark:text-gray-400 sm:text-left">
			<div class="flex items-center gap-4">
				<a
					href="https://github.com/sponsors/edanisko"
					class="group inline-flex items-center hover:text-gray-700 dark:hover:text-white focus:outline focus:outline-2 focus:rounded-sm focus:outline-red-500"
					><svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						class="-mt-px mr-1 w-5 h-5 stroke-gray-400 dark:stroke-gray-600 group-hover:stroke-gray-600 dark:group-hover:stroke-gray-400"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
						/></svg
					> Sponsor
				</a>
			</div>
		</div>
		<div class="ml-4 text-center text-sm text-gray-500 dark:text-gray-400 sm:text-right sm:ml-0">
			Sveltese v0.0.1 (SvelteKit v1.15.7)
		</div>
	</div>
</div>
