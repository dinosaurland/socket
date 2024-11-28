/**
 * @module
 * Connect to your backend from browser
*/

// deno-lint-ignore-file no-explicit-any
import type {
    BackendDescription,
    MessageBackendDescription,
    MessageMethodCall,
    MessageMethodError,
    MessageMethodResult,
} from "./messages.ts"
import type { ApiSchema, BackendSchema } from "./types.ts";
import { expectMessage, sendMessage, socketConnected } from "./utils.ts";

export * from "./types.ts";

let returnId = 0;

/**
 * Connect to a WebSocket server and create an API from a backend schema.
 * @example
 * ```ts
 * import { connectSocket } from "jsr:@dinosaur/socket/server"
 * import type backend from "./backend.ts";
 * 
 * export const api = await connectSocket<typeof backend>("/ws");
 * 
 * console.log(await api.greet("world")); // > Hello, world!
 * console.log(await api.math.add(1, 2)); // > 3
 * ```
 */
export async function connectSocket <
    T extends BackendSchema
> (url: string): Promise<ApiSchema<T>> {
    const socket = new WebSocket(url);
    await socketConnected(socket);
    const { module } = await expectMessage<MessageBackendDescription>(socket, { type: 'description' });
    return buildModule(socket, module);
}

function buildModule (
    socket: WebSocket,
    structure: BackendDescription,
    _prefix?: string
) {
    const module = {} as any;
    for (const [key, value] of Object.entries(structure)) {
        const name = _prefix ? _prefix + '.' + key : key;
        if (value === true) {
            module[key] = async (...args: any[]) => {
                const id = returnId++;
                sendMessage<MessageMethodCall>(socket, { type: 'method call', id, method: name, args });
                const { error, result } = await expectMessage<MessageMethodResult & MessageMethodError>(
                    socket, 
                    { type: 'method result', id }
                );
                if (error) throw new Error(error);
                return result;
            }
        } else {
            module[key] = buildModule(socket, value as BackendDescription, name);
        }
    }
    return module;
}