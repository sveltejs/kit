import { json } from '@sveltejs/kit';

interface TypedResponse<A> extends Response {
    json(): Promise<A>;
}

// A typed json wrapper (this could probably just replace `json`
function typed_json<A>(data: A): TypedResponse<A> {
    return json(data)
}

export async function GET(): Promise<TypedResponse<{ foo: string }>> {
    return typed_json({ foo: 'bar' })
}