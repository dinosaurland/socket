/**
 * Create a socket on your Deno server
 * @module
 */

// deno-lint-ignore-file no-explicit-any
import { Socket } from "./utils.ts";
import type {
    BackendDescription,
    MessageBackendDescription,
    MessageMethodCall,
    MessageGeneratorNext,
    MessageMethodResult,
    MessageMethodError,
    MessageGeneratorStarted,
} from "./messages.ts";
import type {
    BackendSchema,
    BackendMethod,
    BackendGeneratorMethod,
} from "./types.ts";

export * from "./types.ts";

/**
 * Create a WebSocket server from a backend schema.
 * @example
 * ```ts
 * import { createSocket } from "jsr:@dinosaur/socket/server"
 * 
 * Deno.serve({ port: 8000 }, (req) => {
 *     switch (new URL(req.url).pathname) {
 *         case "/ws": {
 *             return createSocket(req, {
 *                 add(a: number, b: number) {
 *                     return a + b;
 *                 },
 *             });
 *         }
 *         // ...
 *     }
 * }
 * ```
 */
export function createSocket(
    req: Request,
    structure: BackendSchema
): Response {
    if (req.headers.get("upgrade") !== "websocket") {
        return new Response(null, {
            status: 400,
            statusText: "Bad Request",
        });
    }
    const { socket, response } = Deno.upgradeWebSocket(req);
    buildBackend(socket, structure);
    return response;
}

function buildBackend(
    webSocket: WebSocket,
    structure: BackendSchema
) {
    const socket = new Socket(webSocket);
    const module = buildBackendModule(socket, structure);
    socket.send<MessageBackendDescription>({ type: 'description', module });
}

function buildBackendModule(
    socket: Socket,
    structure: BackendSchema,
    _prefix?: string
) {
    const module = {} as BackendDescription;
    for (const [key, value] of Object.entries(structure)) {
        const name = _prefix ? _prefix + "." + key : key;
        if (typeof value === "function") {
            if (value.constructor.name === "AsyncGeneratorFunction") {
                module[key] = "generator";
                buildGeneratorMethod(socket, value as BackendGeneratorMethod, name);
            } else {
                module[key] = "function";
                buildMethod(socket, value as BackendMethod, name);
            }
        } else {
            module[key] = buildBackendModule(socket, value, name);
        }
    }
    return module;
}

async function buildMethod(
    socket: Socket,
    func: BackendMethod,
    name: string,
) {
    const messages = socket.expectMany<MessageMethodCall>({ type: 'method call', method: name });
    for await (const message of messages) {
        const { id, args } = message;
        try {
            let result = func(...args);
            if (result instanceof Promise) {
                result = await result;
            }
            socket.send({ type: 'method result', id, result });
        } catch (error: any) {
            socket.send({ type: 'method result', id, error: error.message });
        }
    }
}

async function buildGeneratorMethod(
    socket: Socket,
    func: BackendGeneratorMethod,
    name: string
) {
    const messages = socket.expectMany<MessageMethodCall>({ type: 'method call', method: name });
    for await (const message of messages) {
        const { id, args } = message;
        runGeneratorMethod(socket, func, id, args);
    }
}

async function runGeneratorMethod<T extends BackendGeneratorMethod>(
    socket: Socket,
    func: T,
    id: number,
    args: Parameters<T>
) {
    const generator = func(...args);
    const messages = socket.expectMany<MessageGeneratorNext>({ type: 'method next', id });
    socket.send<MessageGeneratorStarted>({ type: 'method start', id });
    for await (const message of messages) {
        try {
            const { value, done = false } = await generator.next(message.args);
            socket.send<MessageMethodResult>({ type: 'method result', id, result: value });
            if (done) return;
        } catch (error: any) {
            socket.send<MessageMethodError>({ type: 'method result', id, error: error.message });
        }
    }
}
