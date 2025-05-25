import { Context } from "@oak/oak";

type WebSocketWithUsername = WebSocket & { username: string };
type AppEvent = {
  type: "send-message" | "update-users";
  [key: string]: unknown;
};

export default class ChatServer {
  private connectedClients = new Map<string, WebSocketWithUsername>();

  public async handleConnection(ctx: Context) {
    const socket = (await ctx.upgrade()) as WebSocketWithUsername;
    const username = ctx.request.url.searchParams.get("username") ?? "foo";

    if (this.connectedClients.has(username)) {
      socket.close(1008, `Username ${username} is already taken`);
      return;
    }

    socket.username = username;
    socket.onopen = this.broadcastUsernames.bind(this);
    socket.onclose = () => {
      this.clientDisconnected(socket.username);
    };
    socket.onmessage = (m) => {
      this.send(socket.username, m);
    };
    this.connectedClients.set(username, socket);

    console.log(`New client connected: ${username}`);
  }

  private send(username: string, message: any) {
    const data = JSON.parse(message.data);
    if (data.type !== "send-message") {
      return;
    }

    this.broadcast({
      type: "send-message",
      username: username,
      message: data.message,
    });
  }

  private clientDisconnected(username: string) {
    this.connectedClients.delete(username);
    this.broadcastUsernames();

    console.log(`Client ${username} disconnected`);
  }

  private broadcastUsernames() {
    const usernames = [...this.connectedClients.keys()];
    this.broadcast({ type: "update-users", usernames });

    console.log("Sent username list:", JSON.stringify(usernames));
  }

  private broadcast(message: AppEvent) {
    const messageString = JSON.stringify(message);
    for (const client of this.connectedClients.values()) {
      client.send(messageString);
    }
  }
}
