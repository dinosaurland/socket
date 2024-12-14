import { connectSocket } from "../lib/client.ts";
import type backend from "./backend.ts";

export const api = await connectSocket<typeof backend>("/ws");

console.log(await api.greet("world")); // > Hello, world!
console.log(await api.math.add(1, 2)); // > 3

for await (const i of api.countTo(5)) {
    console.log('Counting', i);
}