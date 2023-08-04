<script lang="ts">
	import Logo from '$lib/shared/Logo.svelte'
	import { superForm } from 'sveltekit-superforms/client'
	import SuperDebug from 'sveltekit-superforms/client/SuperDebug.svelte'
	import { enhance } from '$app/forms'
	export let data
	const { form, errors, message } = superForm(data.form)
</script>

<div class="mx-auto sm:mt-64 my-8 content">
	<div class="flex justify-center items-center my-8">
		<Logo />
	</div>
</div>

<div class="card w-full max-w-lg mx-auto bg-white rounded-lg shadow-lg px-6 py-4">
	<SuperDebug {data} />
	<form method="POST" use:enhance>
		<input
			class="block w-full bg-white text-gray-700 border border-gray-200 rounded py-2 px-3 leading-tight focus:outline-none focus:bg-white"
			type="hidden"
			bind:value={$form.token}
			id="token"
			name="token"
		/>
		<div>
			<label class="block tracking-wide text-black text-sm mb-2" for="email"> Email </label>
			<input
				class="block w-full bg-white text-gray-700 border border-gray-200 rounded py-2 px-3 leading-tight focus:outline-none focus:bg-white"
				id="email"
				name="email"
				type="email"
				bind:value={$form.email}
			/>
			{#if $errors.email}
				<div class="mt-2">
					<p class="text-sm text-red-600">
						{$errors.email}
					</p>
				</div>
			{/if}
		</div>

		<div>
			<label class="block tracking-wide text-black text-sm mb-2" for="password"> Password </label>
			<input
				class="block w-full bg-white text-gray-700 border border-gray-200 rounded py-2 px-3 leading-tight focus:outline-none focus:bg-white"
				id="password"
				name="password"
				type="password"
			/>
			{#if $errors.password}
				<div class="mt-2">
					<p class="text-sm text-red-600">
						{$errors.password}
					</p>
				</div>
			{/if}
		</div>
		<div>
			<label class="block tracking-wide text-black text-sm mb-2" for="confirm-password">
				Confirm Password
			</label>
			<input
				class="block w-full bg-white text-gray-700 border border-gray-200 rounded py-2 px-3 leading-tight focus:outline-none focus:bg-white"
				id="confirmPassword"
				name="confirmPassword"
				type="password"
			/>
			{#if $errors.confirmPassword}
				<div class="mt-2">
					<p class="text-sm text-red-600">
						{$errors.confirmPassword}
					</p>
				</div>
			{/if}
			{#if $message && !$errors.email}
				<div class="mt-2">
					<p class="text-sm text-green-600">
						{$message}
					</p>
				</div>
			{/if}
		</div>

		<div class="flex items-center justify-end mt-4">
			<button
				type="submit"
				class="inline-flex items-center px-4 py-2 bg-gray-800 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-gray-700 focus:bg-gray-700 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150 ml-4"
			>
				Reset Password
			</button>
		</div>
	</form>
</div>
