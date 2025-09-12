<script>
	import { isHttpError } from '@sveltejs/kit';
	import {
		validated_query_no_args,
		validated_query_with_arg,
		validated_prerendered_query_no_args,
		validated_prerendered_query_with_arg,
		validated_command_no_args,
		validated_command_with_arg,
		validated_batch_query_no_validation,
		validated_batch_query_with_validation
	} from './validation.remote.js';

	function validate_result(result) {
		if (result !== 'success') {
			throw new Error('Remote function called with invalid arguments');
		}
	}

	let status = $state('pending');
</script>

<p>{status}</p>

<button
	onclick={async () => {
		status = 'pending';
		try {
			validate_result(await validated_query_no_args());
			validate_result(await validated_prerendered_query_no_args());
			validate_result(await validated_command_no_args());

			validate_result(await validated_query_with_arg('valid'));
			validate_result(await validated_prerendered_query_with_arg('valid'));
			validate_result(await validated_command_with_arg('valid'));

			validate_result(await validated_batch_query_no_validation('valid'));
			validate_result(await validated_batch_query_with_validation('valid'));

			status = 'success';
		} catch (e) {
			status = 'error';
		}
	}}
>
	valid
</button>

<button
	onclick={async () => {
		status = 'pending';
		try {
			// @ts-expect-error
			await validated_query_no_args('invalid');
			status = 'error';
		} catch {
			try {
				// @ts-expect-error
				await validated_prerendered_query_no_args('invalid');
				status = 'error';
			} catch {
				try {
					// @ts-expect-error
					await validated_command_no_args('invalid');
					status = 'error';
				} catch {
					status = 'success';
				}
			}
		}
	}}
>
	invalid (arg when no args expected)
</button>

<button
	onclick={async () => {
		status = 'pending';
		try {
			// @ts-expect-error
			await validated_query_with_arg(1);
			status = 'error';
		} catch (e) {
			if (!isHttpError(e) || e.body.message !== 'Input must be a string') {
				status = 'wrong error message';
				return;
			}
			try {
				// @ts-expect-error
				await validated_prerendered_query_with_arg(1);
				status = 'error';
			} catch (e) {
				if (!isHttpError(e) || e.body.message !== 'Input must be a string') {
					status = 'wrong error message';
					return;
				}
				try {
					// @ts-expect-error
					await validated_command_with_arg(1);
					status = 'error';
				} catch (e) {
					if (!isHttpError(e) || e.body.message !== 'Input must be a string') {
						status = 'wrong error message';
						return;
					}

					try {
						// @ts-expect-error
						await validated_batch_query_with_validation(123);
						status = 'error';
					} catch (e) {
						if (!isHttpError(e) || e.body.message !== 'Input must be a string') {
							status = 'wrong error message';
							return;
						}
						status = 'success';
					}
				}
			}
		}
	}}
>
	invalid (wrong arg type)
</button>

<button
	onclick={async () => {
		status = 'pending';
		try {
			// @ts-expect-error
			validate_result(await validated_query_with_arg('valid', 'ignored'));
			// @ts-expect-error
			validate_result(await validated_prerendered_query_with_arg('valid', 'ignored'));
			// @ts-expect-error
			validate_result(await validated_command_with_arg('valid', 'ignored'));
			// @ts-expect-error
			validate_result(await validated_batch_query_no_validation('valid', 'ignored'));

			status = 'success';
		} catch (e) {
			status = 'error';
		}
	}}
>
	ignored (more than one arg, only one sent to backend)
</button>
