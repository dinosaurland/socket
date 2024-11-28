import { createSocket } from "../lib/server.ts";
import { bundle } from "jsr:@libs/bundle/ts";
import backend from "./backend.ts";

const script = await bundle(new URL("./frontend.ts", import.meta.url));
const html = `<!DOCTYPE html>
<html>
    <head>
        <title>Remote Function Example</title>
    </head>
    <body>
        <script type="module">${script}</script>
    </body>
</html>`;

Deno.serve({ port: 8000 }, (req) => {
    switch (new URL(req.url).pathname) {
        case "/ws": {
            return createSocket(req, backend);
        }
        case "/": {
            return new Response(html, {
                headers: {
                    "content-type": "text/html",
                },
            });
        }
        default: {
            return new Response(null, {
                status: 404,
                statusText: "Not Found",
            });
        }
    }
});
