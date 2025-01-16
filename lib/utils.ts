import type { Message, MessageFilter, MessageListener } from "./messages.ts";
import { State } from "@dinosaur/state";

export class Socket {

    private _listeners: MessageListener[] = [];
    private _messageQueue: Message[] = [];
    private _handle?: WebSocket;
    private _state = new State(false);
    reconnectInterval = 5000;
    
    constructor(
        handle: WebSocket,
        private _reconnectToUrl?: string | URL
    ) {
        this._init(handle);
    }

    static connect(url: string | URL, reconnect = true) {
        return new Socket(new WebSocket(url), reconnect ? url : undefined);
    }
    
    send<T extends Message>(message: T) {
        if (!this._handle) {
            this._messageQueue.push(message);
            return;
        }
        this._handle.send(JSON.stringify(message));
    }

    async expect<T extends Message>(filter: MessageFilter<T>) {
        const waiter = Promise.withResolvers<T>();
        const listener = [filter, waiter.resolve] as MessageListener;
        this._listeners.push(listener);
        const result = await waiter.promise;
        this._listeners.splice(this._listeners.indexOf(listener), 1);
        return result;
    }

    async * expectMany<T extends Message>(filter: MessageFilter<T>) {
        while (true) {
            yield await this.expect(filter);
        }
    }

    private _init(handle: WebSocket) {
        handle.addEventListener('error', () => {
            console.error('WebSocket Error');
            this._maybeReconnect();
        });
        handle.addEventListener('open', () => {
            this._handle = handle;
            while (this._messageQueue.length) {
                this.send(this._messageQueue.shift()!);
            }
        });
        handle.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);
            for (const [filter, respond] of this._listeners) {
                if (checkMessage(data, filter)) {
                    respond(data);
                }
            }
        });
        handle.addEventListener('close', () => {
            this._handle = undefined;
            this._maybeReconnect();
        });
    }
    
    private async _maybeReconnect() {
        if (!this._reconnectToUrl) return;
        await new Promise((resolve) => setTimeout(resolve, this.reconnectInterval));
        console.log(`Reconnecting to ${this._reconnectToUrl}`);
        this._init(new WebSocket(this._reconnectToUrl));
    }

    get connected() {
        return this._state.value;
    }
    watchState() {
        return this._state.watch();
    }

}

function checkMessage<T extends Message>(msg: T, filter: MessageFilter<T>) {
    for (const [key, value] of Object.entries(filter)) {
        // @ts-ignore - This is a recursive call
        const ref = msg[key];
        if (typeof value === 'object') {
            if (typeof ref !== 'object') return false;
            if (!checkMessage(ref, value)) return false;
        } else if (ref !== value) {
            return false;
        }
    }
    return true;
}
