import { Application, Context, Router } from "@oak/oak";
import ChatServer from "./ChatServer.ts";

const app = new Application();
const port = 8080;
const router = new Router();
const server = new ChatServer();

router.get("/", (ctx) => (ctx.response.body = "ok"));
router.get("/ws", (ctx: Context) => server.handleConnection(ctx));

app.use(router.routes());
app.use(router.allowedMethods());

console.log("Listening at http://localhost:" + port);
await app.listen({ port });
