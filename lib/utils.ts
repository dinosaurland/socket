import type { Message } from "./messages.ts";

export async function socketConnected (socket: WebSocket) {
    if (socket.readyState === WebSocket.OPEN) return true;
    return await new Promise<true>((resolve, reject) => {
        socket.addEventListener('open', () => resolve(true), { once: true });
        socket.addEventListener('error', () => reject('WebSocket Error'), { once: true });
    });
}

export async function expectMessage <T extends Message = Message> (
    socket: WebSocket, 
    filter: { type: T['type'] } & Partial<T>
): Promise<T> {
    return await new Promise((resolve) => {
        const handler = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (checkMessage(data, filter)) {
                socket.removeEventListener('message', handler);
                resolve(data);
            }
        }
        socket.addEventListener('message', handler);
    });
}

export async function * expectMessages <T extends Message = Message> (
    socket: WebSocket,
    filter: { type: T['type'] } & Partial<T>
): AsyncGenerator<T, void, void> {
    while (true) {
        yield await expectMessage(socket, filter);
    }
}

export function sendMessage <T extends Message> (socket: WebSocket, message: T) {
    socket.send(JSON.stringify(message));
}

export function checkMessage <T extends Message> (object: T, filter: Partial<T>) {
    for (const [key, value] of Object.entries(filter)) {
        // @ts-ignore - This is a recursive call
        const ref = object[key];
        if (typeof value === 'object') {
            if (typeof ref !== 'object') return false;
            if (!checkMessage(ref, value)) return false;
        } else if (ref !== value) {
            return false;
        }
    }
    return true;
}