import {
  Application,
  Router,
  Context,
} from "https://deno.land/x/oak@v12.0.0/mod.ts";

// --- WebSocket-related interfaces ---
interface User {
  id: string;
  username: string;
  socket: WebSocket; // Native WebSocket object
  status: "online" | "playing" | "offline";
  invitations: Invitation[];
}

interface Invitation {
  id: string;
  senderId: string;
  senderUsername: string;
  receiverId: string;
  status: "pending" | "accepted" | "declined";
  gameId?: string;
}

interface Game {
  id: string;
  player1Id: string;
  player2Id: string;
  state: any;
}

// --- High Score API interfaces ---
interface RegisteredUser {
  id: string; // The stateless token
  username: string;
}

interface Score {
  username: string;
  score: number;
}

class GameServer {
  private app: Application;
  private router: Router;
  // WebSocket state
  private users: Map<string, User> = new Map(); // ws-connection-userId -> User object
  private games: Map<string, Game> = new Map(); // gameId -> Game object
  private invitations: Map<string, Invitation> = new Map(); // invitationId -> Invitation object

  // High score state (in-memory)
  private registeredUsers: Map<string, RegisteredUser> = new Map(); // token -> RegisteredUser
  private highScores: Score[] = [];

  constructor() {
    this.app = new Application();
    this.router = new Router();
    this.setupRoutes();
    this.setupMiddleware();
  }

  private setupMiddleware() {
    this.app.use(this.router.routes());
    this.app.use(this.router.allowedMethods());
  }

  private setupRoutes() {
    // WebSocket route
    this.router.get("/ws", this.handleWebSocketConnection.bind(this));

    // High score API routes
    this.router.post("/register", this.handleRegister.bind(this));
    this.router.post("/scores", this.handleSubmitScore.bind(this));
    this.router.get("/scores", this.handleGetScores.bind(this));
    this.router.get("/me", this.handleGetMe.bind(this));
  }

  // --- High Score API Handlers ---

  private handleGetMe(ctx: Context) {
    const token = ctx.request.headers.get("Authorization")?.split(" ")[1];
    if (!token || !this.registeredUsers.has(token)) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Unauthorized. Invalid token." };
      return;
    }
    const user = this.registeredUsers.get(token)!;
    ctx.response.status = 200;
    ctx.response.body = { username: user.username };
  }

  private async handleRegister(ctx: Context) {
    try {
      const body = ctx.request.body({ type: "json" });
      const { username } = await body.value;

      if (!username || typeof username !== "string" || username.length < 3) {
        ctx.response.status = 400;
        ctx.response.body = {
          error: "Invalid username. Must be a string of at least 3 characters.",
        };
        return;
      }

      const token = crypto.randomUUID();
      const newUser: RegisteredUser = { id: token, username };
      this.registeredUsers.set(token, newUser);

      console.log(`New user registered: ${username} with token ${token}`);

      ctx.response.status = 201;
      ctx.response.body = { token };
    } catch (e) {
      console.error("Error during registration:", e);
      ctx.response.status = 500;
      ctx.response.body = { error: "Internal server error." };
    }
  }

  private async handleSubmitScore(ctx: Context) {
    try {
      const token = ctx.request.headers.get("Authorization")?.split(" ")[1];
      if (!token || !this.registeredUsers.has(token)) {
        ctx.response.status = 401;
        ctx.response.body = { error: "Unauthorized. Invalid token." };
        return;
      }

      const user = this.registeredUsers.get(token)!;
      const body = ctx.request.body({ type: "json" });
      const { score } = await body.value;

      if (typeof score !== "number") {
        ctx.response.status = 400;
        ctx.response.body = { error: "Invalid score. Must be a number." };
        return;
      }

      this.highScores.push({ username: user.username, score });
      // Keep the list sorted and trimmed
      this.highScores.sort((a, b) => b.score - a.score);
      if (this.highScores.length > 100) {
        this.highScores = this.highScores.slice(0, 100);
      }

      console.log(`New score of ${score} submitted for ${user.username}`);

      ctx.response.status = 201;
      ctx.response.body = { message: "Score submitted successfully." };
    } catch (e) {
      console.error("Error submitting score:", e);
      ctx.response.status = 500;
      ctx.response.body = { error: "Internal server error." };
    }
  }

  private handleGetScores(ctx: Context) {
    ctx.response.status = 200;
    ctx.response.body = this.highScores.slice(0, 10); // Return top 10
  }

  // --- WebSocket Handlers ---

  private async handleWebSocketConnection(ctx: Context) {
    const ws = await ctx.upgrade();
    const userId = crypto.randomUUID();

    console.log(`New potential connection from an unknown user.`);

    ws.onmessage = async (event) => {
      if (typeof event.data !== "string") {
        console.warn(
          `Received non-string WebSocket message from ${userId}. Ignoring.`,
        );
        return;
      }

      const message = JSON.parse(event.data);

      if (message.type === "register" && message.username) {
        if (!this.users.has(userId)) {
          const user: User = {
            id: userId,
            username: message.username,
            socket: ws,
            status: "online",
            invitations: [],
          };
          this.users.set(userId, user);
          console.log(
            `User ${user.username} (${userId}) connected and registered for WebSocket.`,
          );

          this.sendToUser(userId, {
            type: "connected",
            userId: userId,
            username: user.username,
          });
          this.sendOnlineUsersUpdate();
        } else {
          console.warn(
            `User ${message.username} (${userId}) sent another register message.`,
          );
        }
      } else {
        const user = this.users.get(userId);
        if (user) {
          this.handleWebSocketMessage(userId, message);
        } else {
          console.warn(
            `Unregistered user (${userId}) sent message: ${message.type}. Asking to register.`,
          );
          this.sendToSocket(ws, {
            type: "error",
            message: "Please register your username first.",
          });
        }
      }
    };

    ws.onclose = () => {
      console.log(`User ${userId} disconnected.`);
      this.removeUser(userId);
      this.sendOnlineUsersUpdate();
    };

    ws.onerror = (event) => {
      console.error(`WebSocket error for user ${userId}:`, event);
      this.removeUser(userId);
      this.sendOnlineUsersUpdate();
    };
  }

  private handleWebSocketMessage(userId: string, message: any) {
    const user = this.users.get(userId);
    if (!user) {
      console.error(`Message received for unknown user ID: ${userId}`);
      return;
    }

    switch (message.type) {
      case "invite_player":
        this.handleInvitePlayer(userId, message.targetUserId);
        break;
      case "accept_invite":
        this.handleAcceptInvite(userId, message.invitationId);
        break;
      case "decline_invite":
        this.handleDeclineInvite(userId, message.invitationId);
        break;
      case "game_state_update":
        this.handleGameStateUpdate(userId, message.gameId, message.state);
        break;
      case "get_online_users":
        this.sendOnlineUsers(userId);
        break;
      case "get_invitations":
        this.sendInvitations(userId);
        break;
      default:
        console.warn(
          `Unknown message type from user ${user.username}: ${message.type}`,
        );
        this.sendToUser(userId, {
          type: "error",
          message: "Unknown message type.",
        });
    }
  }

  private sendToUser(userId: string, message: any) {
    const user = this.users.get(userId);
    if (user && user.socket.readyState === WebSocket.OPEN) {
      try {
        user.socket.send(JSON.stringify(message));
      } catch (e) {
        console.error(`Error sending message to user ${userId}:`, e);
        user.socket.close();
      }
    }
  }

  private sendToSocket(socket: WebSocket, message: any) {
    if (socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(message));
      } catch (e) {
        console.error(`Error sending message to socket:`, e);
      }
    }
  }

  private sendOnlineUsersUpdate() {
    const onlineUsers = Array.from(this.users.values())
      .filter((u) => u.status === "online")
      .map((u) => ({ id: u.id, username: u.username }));

    this.users.forEach((user) => {
      if (user.status === "online" || user.status === "playing") {
        this.sendToUser(user.id, {
          type: "online_users_update",
          users: onlineUsers,
        });
      }
    });
  }

  private sendOnlineUsers(userId: string) {
    const onlineUsers = Array.from(this.users.values())
      .filter((u) => u.status === "online")
      .map((u) => ({ id: u.id, username: u.username }));
    this.sendToUser(userId, { type: "online_users", users: onlineUsers });
  }

  private sendInvitations(userId: string) {
    const user = this.users.get(userId);
    if (user) {
      const pendingInvitations = user.invitations.filter(
        (inv) => inv.status === "pending",
      );
      this.sendToUser(userId, {
        type: "your_invitations",
        invitations: pendingInvitations,
      });
    }
  }

  private removeUser(userId: string) {
    const user = this.users.get(userId);
    if (user) {
      user.status = "offline";
      user.socket.close();
      this.users.delete(userId);

      this.invitations.forEach((inv, invId) => {
        if (inv.senderId === userId || inv.receiverId === userId) {
          this.invitations.delete(invId);
          if (
            inv.senderId === userId &&
            inv.receiverId &&
            inv.status === "pending"
          ) {
            this.sendToUser(inv.receiverId, {
              type: "invitation_cancelled",
              invitationId: invId,
              reason: "sender_disconnected",
            });
          } else if (
            inv.receiverId === userId &&
            inv.senderId &&
            inv.status === "pending"
          ) {
            this.sendToUser(inv.senderId, {
              type: "invitation_cancelled",
              invitationId: invId,
              reason: "receiver_disconnected",
            });
          }
        }
      });
      this.games.forEach((game, gameId) => {
        if (game.player1Id === userId || game.player2Id === userId) {
          this.endGame(gameId, "player_disconnected");
        }
      });
    }
  }

  private handleInvitePlayer(senderId: string, targetId: string) {
    const sender = this.users.get(senderId);
    const target = this.users.get(targetId);

    if (!sender || sender.status !== "online") {
      this.sendToUser(senderId, {
        type: "error",
        message: "You are not online or available to send invitations.",
      });
      return;
    }
    if (!target || target.status !== "online") {
      this.sendToUser(senderId, {
        type: "error",
        message: "Target user is not online or available.",
      });
      return;
    }
    if (senderId === targetId) {
      this.sendToUser(senderId, {
        type: "error",
        message: "You cannot invite yourself.",
      });
      return;
    }

    const existingInvite = Array.from(this.invitations.values()).find(
      (inv) =>
        (inv.senderId === senderId &&
          inv.receiverId === targetId &&
          inv.status === "pending") ||
        (inv.senderId === targetId &&
          inv.receiverId === senderId &&
          inv.status === "pending"),
    );

    if (existingInvite) {
      this.sendToUser(senderId, {
        type: "error",
        message:
          "An invitation is already pending between you and this player.",
      });
      return;
    }

    const invitationId = crypto.randomUUID();
    const newInvitation: Invitation = {
      id: invitationId,
      senderId: senderId,
      senderUsername: sender.username,
      receiverId: targetId,
      status: "pending",
    };
    this.invitations.set(invitationId, newInvitation);
    target.invitations.push(newInvitation);

    this.sendToUser(targetId, {
      type: "invitation_received",
      invitationId: invitationId,
      senderId: senderId,
      senderUsername: sender.username,
    });
    this.sendToUser(senderId, {
      type: "invitation_sent",
      targetUsername: target.username,
    });
  }

  private handleAcceptInvite(receiverId: string, invitationId: string) {
    const invitation = this.invitations.get(invitationId);
    const receiver = this.users.get(receiverId);

    if (
      !invitation ||
      invitation.receiverId !== receiverId ||
      invitation.status !== "pending"
    ) {
      this.sendToUser(receiverId, {
        type: "error",
        message: "Invalid or expired invitation.",
      });
      return;
    }
    if (!receiver || receiver.status !== "online") {
      this.sendToUser(receiverId, {
        type: "error",
        message: "You are not online or available.",
      });
      this.invitations.delete(invitationId);
      this.sendToUser(invitation.senderId, {
        type: "invitation_failed",
        invitationId: invitationId,
        reason: "receiver_unavailable",
      });
      return;
    }

    const sender = this.users.get(invitation.senderId);
    if (!sender || sender.status !== "online") {
      this.sendToUser(receiverId, {
        type: "error",
        message: "The inviter is no longer online or available.",
      });
      invitation.status = "declined";
      this.removeInvitationFromUser(receiverId, invitationId);
      this.invitations.delete(invitationId);
      return;
    }

    sender.status = "playing";
    receiver.status = "playing";

    const gameId = crypto.randomUUID();
    const newGame: Game = {
      id: gameId,
      player1Id: sender.id,
      player2Id: receiver.id,
      state: {},
    };
    this.games.set(gameId, newGame);

    invitation.status = "accepted";
    invitation.gameId = gameId;

    this.removeInvitationFromUser(receiverId, invitationId);
    this.invitations.delete(invitationId);

    this.sendToUser(sender.id, {
      type: "game_started",
      gameId: gameId,
      opponentId: receiver.id,
      opponentUsername: receiver.username,
      isPlayer1: true,
    });
    this.sendToUser(receiver.id, {
      type: "game_started",
      gameId: gameId,
      opponentId: sender.id,
      opponentUsername: sender.username,
      isPlayer1: false,
    });

    this.sendOnlineUsersUpdate();
  }

  private handleDeclineInvite(receiverId: string, invitationId: string) {
    const invitation = this.invitations.get(invitationId);

    if (
      !invitation ||
      invitation.receiverId !== receiverId ||
      invitation.status !== "pending"
    ) {
      this.sendToUser(receiverId, {
        type: "error",
        message: "Invalid or expired invitation.",
      });
      return;
    }

    invitation.status = "declined";
    this.removeInvitationFromUser(receiverId, invitationId);
    this.invitations.delete(invitationId);

    this.sendToUser(invitation.senderId, {
      type: "invitation_declined",
      invitationId: invitationId,
      declinerUsername: this.users.get(receiverId)?.username || "Unknown User",
    });
    this.sendToUser(receiverId, {
      type: "invitation_declined_confirm",
      invitationId: invitationId,
    });
  }

  private removeInvitationFromUser(userId: string, invitationId: string) {
    const user = this.users.get(userId);
    if (user) {
      user.invitations = user.invitations.filter(
        (inv) => inv.id !== invitationId,
      );
    }
  }

  private handleGameStateUpdate(senderId: string, gameId: string, state: any) {
    const game = this.games.get(gameId);
    if (!game) {
      this.sendToUser(senderId, { type: "error", message: "Game not found." });
      return;
    }

    if (senderId !== game.player1Id && senderId !== game.player2Id) {
      this.sendToUser(senderId, {
        type: "error",
        message: "You are not part of this game.",
      });
      return;
    }

    game.state = state;

    const otherPlayerId =
      senderId === game.player1Id ? game.player2Id : game.player1Id;
    this.sendToUser(otherPlayerId, {
      type: "opponent_game_state_update",
      gameId: gameId,
      state: state,
    });
  }

  private endGame(gameId: string, reason: string) {
    const game = this.games.get(gameId);
    if (!game) return;

    const player1 = this.users.get(game.player1Id);
    const player2 = this.users.get(game.player2Id);

    if (player1 && player1.status === "playing") {
      player1.status = "online";
      this.sendToUser(player1.id, {
        type: "game_ended",
        gameId: gameId,
        reason: reason,
      });
    }
    if (player2 && player2.status === "playing") {
      player2.status = "online";
      this.sendToUser(player2.id, {
        type: "game_ended",
        gameId: gameId,
        reason: reason,
      });
    }

    this.games.delete(gameId);
    this.sendOnlineUsersUpdate();
    console.log(`Game ${gameId} ended due to: ${reason}`);
  }

  public async start(port: number) {
    console.log(`Game server listening on http://localhost:${port}`);
    await this.app.listen({ port });
  }
}

if (import.meta.main) {
  const gameServer = new GameServer();
  gameServer.start(8000);
}
