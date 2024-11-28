# @dinosaur/socket

Create schema of backend methods and expose them to the client via WebSocket. Intended to be used with `Deno.serve`.

## Usage

[See full example here](https://jsr.io/@dinosaur/socket/0.1.4/example)

Create your backend methods.

```ts
// backend.ts
export default {
    math: {
        add: (a: number, b: number) => a + b,
        sub: (a: number, b: number) => a - b,
    },
    greet: (name: string) => `Hello, ${name}!`,
}
```

Create a server. On the `/ws` route, create a socket exposing the backend methods.

```ts
// server.ts
import { createSocket } from 'jsr:@dinosaur/socket/server'
import backend from './backend.ts'

Deno.serve({ port: 8000 }, (req) => {
    switch (new URL(req.url).pathname) {
        case "/ws": {
            return createSocket(req, backend);
        }
        // ...other routes
        default: {
            return new Response("Not Found", { status: 404 });
        }
    }
});
```

On the client, connect to the server and call the backend methods. Types are automatically inferred, and all functions are async.

```ts
// frontend.ts
import { connectSocket } from "jsr:@dinosaur/socket/client";
import type backend from "./backend.ts";

export const api = await connectSocket<typeof backend>("/ws");

console.log(await api.greet("world")); // > Hello, world!
console.log(await api.math.add(1, 2)); // > 3
```

