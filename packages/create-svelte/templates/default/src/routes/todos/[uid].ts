import type { RequestHandler } from "@sveltejs/kit";
import { api } from "./_api";

export const get: RequestHandler = async ({ locals, params }) => {
	const response = await api('get', `todos/${locals.userid}`);
  
	if (response.status === 404) {
		return {
			headers: { Location: '/todos' },
			status: 302
		}
	}

  const todos: any[] = await response.json();
  const index = todos.findIndex(t=>t.uid === params.uid);
	
  let previousUid = null;
  let nextUid = null;
  if(index === -1){
    return {
			headers: { Location: '/todos' },
			status: 302
		}
  } else if(index === 0) {
    nextUid = todos[index+1].uid;
  }else if(index === todos.length-1) {
    previousUid = todos[index-1].uid;
  } else {
    previousUid = todos[index-1].uid;
    nextUid = todos[index+1].uid;
  }
	
	if (response.status === 200) {
		return {
			body: {
				todo: todos[index],
        previousUid,
        nextUid,
			}
		};
	}

	return {
		status: response.status
	};
};