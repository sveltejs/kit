import { trace } from '@opentelemetry/api';
import { FOO } from '$app/env/private';

trace.getTracer('adapter-cloudflare');

globalThis.__cloudflare_instrumentation = FOO;
