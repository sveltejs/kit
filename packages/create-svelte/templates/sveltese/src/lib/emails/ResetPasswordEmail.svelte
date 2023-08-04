<script lang="ts">
	import { PUBLIC_APP_URL } from '$env/static/public'
	import Logo from '$lib/shared/Logo.svelte'
	export let token: String
	export let email: String
	const resetLink = `${PUBLIC_APP_URL}/reset-password/${token}?email=${email}`
</script>

<div class="card max-w-sm">
	<p>Hello,</p>
	<p class="text-sm text-gray-500 py-4">
		This email is being sent to you because a request to reset the password for your account has
		been received.
	</p>
	<a href={resetLink} class="default bg-gray-800">Reset Password</a>
	<p>
		The link to reset your password will be valid for only 60 minutes. If you did not initiate the
		request for resetting the password, you can disregard this message and take no further action.
	</p>
	<p>Best regards,</p>
	<p>Sveltese</p>
	<div class="divider" />
	<p>
		In case you encounter difficulties clicking the "Reset Password" button, please try copying and
		pasting the URL provided below into your web browser: <a href={resetLink}>{resetLink}</a>
	</p>
</div>

<style>
	.card {
		padding: 1rem;
		border-radius: 0.5rem;
		box-shadow: 0 0 0.5rem rgba(0, 0, 0, 0.1);
		background-color: #fff;
	}

	.divider {
		margin: 1rem 0;
		border-bottom: 1px solid #e2e8f0;
	}

	.default {
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		background-color: rgb(31, 41, 55);
		border: 1px solid #e2e8f0;
		color: #fff;
		font-weight: 600;
	}
</style>
