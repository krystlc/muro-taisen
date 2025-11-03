import {
  Application,
  Router,
  Context,
} from "https://deno.land/x/oak@v12.0.0/mod.ts";

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

class GameServer {
  private app: Application;
  private router: Router;
  private users: Map<string, User> = new Map(); // userId -> User object
  private games: Map<string, Game> = new Map(); // gameId -> Game object
  private invitations: Map<string, Invitation> = new Map(); // invitationId -> Invitation object

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
    this.router.get("/ws", this.handleWebSocketConnection.bind(this));
  }

  // --- MODIFIED handleWebSocketConnection ---
  private async handleWebSocketConnection(ctx: Context) {
    // Oak's Context.upgrade() handles the WebSocket upgrade
    const ws = await ctx.upgrade();
    const userId = crypto.randomUUID();

    console.log(`New potential connection from an unknown user.`);

    // Set up native WebSocket event listeners
    ws.onmessage = async (event) => {
      // In Deno's native WebSocket, event.data can be string (for text) or ArrayBuffer (for binary)
      if (typeof event.data !== "string") {
        console.warn(
          `Received non-string WebSocket message from ${userId}. Ignoring.`
        );
        return;
      }

      const message = JSON.parse(event.data);

      if (message.type === "register" && message.username) {
        // If the user isn't registered yet, register them
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
            `User ${user.username} (${userId}) connected and registered.`
          );

          this.sendToUser(userId, {
            type: "connected",
            userId: userId,
            username: user.username,
          });
          this.sendOnlineUsersUpdate();
        } else {
          // User already registered, perhaps a redundant register message?
          console.warn(
            `User ${message.username} (${userId}) sent another register message.`
          );
        }
      } else {
        // Handle other messages only if user is already registered
        const user = this.users.get(userId);
        if (user) {
          this.handleWebSocketMessage(userId, message);
        } else {
          console.warn(
            `Unregistered user (${userId}) sent message: ${message.type}. Asking to register.`
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
      this.removeUser(userId); // Consider removing the user on error as well
      this.sendOnlineUsersUpdate();
    };

    // No need for the `for await (const message of ws)` loop with native WebSocket `onmessage`
    // The `ws` object itself manages the lifecycle and message reception via its event handlers.
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
          `Unknown message type from user ${user.username}: ${message.type}`
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
        // It's often good practice to close a socket if sending fails,
        // as it might be in a bad state. The onclose will then clean up.
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
      // Only send updates to users who are currently online and not playing
      if (user.status === "online" || user.status === "playing") {
        // Or just 'online' if you only update lobby view
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
        (inv) => inv.status === "pending"
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
      // It's important to set the status to 'offline' before closing the socket
      // so other parts of the cleanup don't try to send to a closing socket.
      user.status = "offline";
      user.socket.close(); // Ensure the socket is closed
      this.users.delete(userId);

      // Clean up any pending invitations involving this user
      this.invitations.forEach((inv, invId) => {
        if (inv.senderId === userId || inv.receiverId === userId) {
          this.invitations.delete(invId);
          // Notify the other party about the cancelled invitation if still relevant
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
      // Handle active games if the user was playing
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
          inv.status === "pending")
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
      // Clean up the invitation as receiver is no longer available
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
      this.invitations.delete(invitationId); // Remove from main map
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
    this.invitations.delete(invitationId); // Remove from main map once handled

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
    this.invitations.delete(invitationId); // Remove from main map once handled

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
        (inv) => inv.id !== invitationId
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
      // Only reset status if they were playing
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
