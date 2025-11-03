import { ComponentProps, createSignal, onCleanup, onMount } from "solid-js";
import { WebSocketClient } from "../websocket";
import OnlinePlayersList from "./OnlinePlayersList";
import { emitStartSinglePlayer } from "../events";
import { createModal } from "../hooks/createModal";
import { currentUser } from "../hooks/CurrentUser";
import { Bell, Camera, Gamepad, Users, Wifi, WifiOff } from "lucide-solid";

const AppHeader = ({ children, ...props }: ComponentProps<"header">) => {
  let wsClient: WebSocketClient | null = null;
  const [players, setPlayers] = createSignal<
    { id: string; username: string }[]
  >([]);
  const [isConnected, setIsConnected] = createSignal(false);
  const [selectedOpponentId, setSelectedOpponentId] = createSignal("");
  const { Modal, openModal } = createModal();

  onMount(() => {
    wsClient = WebSocketClient.getInstance();

    wsClient.events.on("websocket/open", () => {
      console.log("WebSocket connection established!");
      setIsConnected(true);
      // --- Important: Send the register message immediately after opening ---
      registerUsername();
    });

    wsClient.events.on(
      "websocket/online_users_update",
      (data: { users: { id: string; username: string }[] }) => {
        setPlayers(data.users);
      }
    );

    wsClient.events.on(
      "websocket/online_users",
      (data: { users: { id: string; username: string }[] }) => {
        setPlayers(data.users);
      }
    );

    wsClient.events.on(
      "websocket/invitation_received",
      (message: { senderUsername: string }) => {
        openModal(true);
        alert(`You received an invitation from ${message.senderUsername}!`);
        // Request updated invitations to render them
        wsClient?.send(JSON.stringify({ type: "get_invitations" }));
      }
    );

    wsClient.events.on(
      "websocket/your_invitations",
      (message: { invitations: any }) => {
        renderInvitations(message.invitations);
      }
    );

    wsClient.events.on(
      "websocket/invitation_declined",
      (message: { declinerUsername: any }) => {
        alert(`${message.declinerUsername} declined your invitation.`);
        // Request updated invitations (if any were sent by us)
        wsClient?.send(JSON.stringify({ type: "get_invitations" }));
      }
    );

    wsClient.events.on("websocket/invitation_declined_confirm", () => {
      // Request updated invitations to clear it from our list
      wsClient?.send(JSON.stringify({ type: "get_invitations" }));
    });

    wsClient.events.on(
      "websocket/invitation_cancelled",
      (message: { senderUsername: string }) => {
        alert(
          `Invitation from ${message.senderUsername} was cancelled because they disconnected.`
        );
        wsClient?.send(JSON.stringify({ type: "get_invitations" })); // Refresh invitations
      }
    );

    wsClient.events.on(
      "websocket/invitation_failed",
      (message: { reason: string }) => {
        alert(`Invitation failed: ${message.reason}`);
        // No need to request invitations here, as the invitation was already removed from our side
      }
    );
  });

  function registerUsername() {
    wsClient?.send(
      JSON.stringify({ type: "register", username: currentUser.getUsername() })
    );
    wsClient?.send(JSON.stringify({ type: "get_online_users" }));
    wsClient?.send(JSON.stringify({ type: "get_invitations" }));
  }

  function handleSendChallengeClick() {
    sendInvite(selectedOpponentId());
  }
  // --- Functions to send messages to the server ---
  function sendInvite(targetUserId: string) {
    if (wsClient && wsClient.isOpen()) {
      wsClient.send(
        JSON.stringify({ type: "invite_player", targetUserId: targetUserId })
      );
    } else {
      alert("Not connected to the server.");
    }
  }

  function acceptInvitation(invitationId: string) {
    if (wsClient && wsClient.isOpen()) {
      wsClient.send(
        JSON.stringify({ type: "accept_invite", invitationId: invitationId })
      );
    } else {
      alert("Not connected to the server.");
    }
  }

  function declineInvitation(invitationId: string) {
    if (wsClient && wsClient.isOpen()) {
      wsClient.send(
        JSON.stringify({ type: "decline_invite", invitationId: invitationId })
      );
    } else {
      alert("Not connected to the server.");
    }
  }

  function sendGameState(gameId: string, state: any) {
    if (wsClient && wsClient.isOpen()) {
      wsClient.send(
        JSON.stringify({
          type: "game_state_update",
          gameId: gameId,
          state: state,
        })
      );
    } else {
      alert("Not connected to the server.");
    }
  }

  function renderInvitations(
    invitations: { senderUsername: string; id: string }[]
  ) {
    // invitationsList.innerHTML = '';
    // if (invitations.length === 0) {
    //     invitationsList.innerHTML = '<li>No pending invitations.</li>';
    //     return;
    // }
    // invitations.forEach(inv => {
    //     const li = document.createElement('li');
    //     li.textContent = `Invitation from ${inv.senderUsername}`;
    //     const acceptBtn = document.createElement('button');
    //     acceptBtn.textContent = 'Accept';
    //     acceptBtn.onclick = () => acceptInvitation(inv.id);
    //     li.appendChild(acceptBtn);
    //     const declineBtn = document.createElement('button');
    //     declineBtn.textContent = 'Decline';
    //     declineBtn.onclick = () => declineInvitation(inv.id);
    //     li.appendChild(declineBtn);
    //     invitationsList.appendChild(li);
    // });
  }

  function handleConnect() {
    wsClient?.connect();
  }

  onCleanup(() => {
    setIsConnected(false);
    wsClient = null;
  });

  return (
    <>
      <header {...props} class="p-4 flex justify-between">
        <div>
          <h1 class="font-extrabold tracking-tighter uppercase">
            Muro Taisen <span class="text-pink-700">戦略</span>
          </h1>
        </div>
        <nav class="flex items-center gap-2">
          {isConnected() ? (
            <>
              <button type="button" class="btn-icon">
                <Users size={16} /> <span class="sr-only">Users</span>
              </button>
              <button type="button" class="btn-icon">
                <Bell size={16} /> <span class="sr-only">Notifications</span>
              </button>
              <button
                type="button"
                class="flex gap-2 items-center bg-blue-800 h-10 px-4 rounded-full"
              >
                <Gamepad size={16} /> <span>{currentUser.getUsername()}</span>
              </button>
            </>
          ) : (
            <button type="button" on:click={handleConnect} class="btn-icon">
              <Wifi size={16} /> <span class="sr-only">Connect</span>
            </button>
          )}
        </nav>
        {/* {isConnected() && (
          <div class="bg-black/10 border border-blue-800 p-1">
            <OnlinePlayersList
              players={players()}
              selectedOpponentId={selectedOpponentId()}
              onSelectOpponentId={setSelectedOpponentId}
            />
            <button
              type="button"
              class="btn"
              disabled={!isConnected() || !selectedOpponentId()}
              on:click={handleSendChallengeClick}
            >
              Send challenge
            </button>
          </div>
        )}
        <div class="space-y-1">
          <button type="button" class="btn" on:click={emitStartSinglePlayer}>
            1 Player
          </button>
          <button type="button" class="btn" disabled>
            Options
          </button>
        </div> */}
        <Modal>
          <div class="mt-4">
            <p class="text-pretty text-gray-700">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              Pellentesque euismod, nisi eu consectetur. Sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua.
            </p>

            <label for="Confirm" class="mt-4 block">
              <span class="text-sm font-medium text-gray-700">
                Please type "Confirm" to complete action
              </span>

              <input
                type="text"
                id="Confirm"
                class="mt-0.5 w-full rounded border-gray-300 shadow-sm sm:text-sm"
              />
            </label>
          </div>

          <footer class="mt-6 flex justify-end gap-2">
            <button
              type="button"
              class="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              Cancel
            </button>

            <button
              type="button"
              class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Done
            </button>
          </footer>
        </Modal>
        {children}
      </header>
    </>
  );
};

export default AppHeader;
