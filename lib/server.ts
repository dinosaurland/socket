/**
 * @module
 * Create a socket on your Deno server
 */

// deno-lint-ignore-file no-explicit-any
import type { BackendSchema, BackendMethod } from "./types.ts";
import type { MessageBackendDescription, MessageMethodCall } from "./messages.ts";
import { expectMessages, sendMessage, socketConnected } from "./utils.ts";

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
export function createSocket (
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

async function buildBackend (
    socket: WebSocket,
    structure: BackendSchema
) {
    await socketConnected(socket);
    const module = buildBackendModule(socket, structure);
    sendMessage<MessageBackendDescription>(socket, { type: 'description', module });
}

function buildBackendModule (
    socket: WebSocket,
    structure: BackendSchema,
    _prefix?: string
) {
    const module = {} as any;
    for (const [key, value] of Object.entries(structure)) {
        const name = _prefix ? _prefix + "." + key : key;
        if (typeof value === "function") {
            module[key] = true;
            buildBackendFunction(socket, value, name);
        } else {
            module[key] = buildBackendModule(socket, value, name);
        }
    }
    return module;
}

async function buildBackendFunction (
    socket: WebSocket, 
    func: BackendMethod,
    method: string,
) {
    const messages = expectMessages<MessageMethodCall>(socket, { type: 'method call', method });
    for await (const message of messages) {
        const { id, args } = message;
        try {
            let result = func(...args);
            if (result instanceof Promise) {
                result = await result;
            }
            sendMessage(socket, { type: 'method result', id, result });
        } catch (error: any) {
            sendMessage(socket, { type: 'method result', id, error: error.message });
        }
    }
}
