// deno-lint-ignore-file no-explicit-any
import { Socket } from "./utils.ts";
import type {
    MessageGeneratorNext,
    MessageGeneratorStarted,
    BackendDescription,
    MessageBackendDescription,
    MessageGeneratorDone,
    MessageMethodCall,
    MessageMethodError,
    MessageMethodResult,
} from "./messages.ts"
import type {
    ApiSchema,
    BackendSchema,
    Serializable,
    SerializableArray
} from "./types.ts";

export * from "./types.ts";

let returnId = 0;

/**
 * Connect to a WebSocket server and create an API from a backend schema.
 * @example
 * ```ts
 * import { connectSocket } from "jsr:@dinosaur/socket/server"
 * import type backend from "./backend.ts";
import { SerializableArray, ApiGeneratorMethod, ApiMethod } from './types';
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
    const socket = Socket.connect(url);
    const { module } = await socket.expect<MessageBackendDescription>({ type: 'description' });
    return buildModule(socket, module);
}

function buildModule (
    socket: Socket,
    structure: BackendDescription,
    _prefix?: string
) {
    const module = {} as any;
    for (const [key, value] of Object.entries(structure)) {
        const name = _prefix ? _prefix + '.' + key : key;
        if (value === 'function') {
            module[key] = buildMethod(socket, name);
        } else if (value === 'generator') {
            module[key] = buildGeneratorMethod(socket, name);
        } else {
            module[key] = buildModule(socket, value as BackendDescription, name);
        }
    }
    return module;
}

function buildMethod (
    socket: Socket,
    name: string
) {
    return async (...args: any[]) => {
        const id = returnId++;
        socket.send<MessageMethodCall>({ type: 'method call', id, method: name, args });
        const { error, result } = await socket.expect<
            & MessageMethodResult 
            & MessageMethodError
        >({ type: 'method result', id });
        if (error) throw new Error(error);
        return result;
    }
}

function buildGeneratorMethod (
    socket: Socket,
    name: string
) {
    return async function * (...args: SerializableArray) {
        const id = returnId++;
        socket.send<MessageMethodCall>({ type: 'method call', id, method: name, args });
        let yieldArgs: Serializable | undefined;
        await socket.expect<MessageGeneratorStarted>({ type: 'method start', id });
        while (true) {
            socket.send<MessageGeneratorNext>({ type: 'method next', id, args: yieldArgs });
            const { error, result, done } = await socket.expect <
                & MessageMethodResult 
                & MessageGeneratorDone 
                & MessageMethodError 
            > ({ type: 'method result', id });
            if (error) throw new Error(error);
            if (done) return result;
            yieldArgs = yield result;
        }
    }
}