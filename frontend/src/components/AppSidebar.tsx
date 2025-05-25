import { createSignal, onCleanup, onMount } from "solid-js";
import { WebSocketClient } from "../websocket";
import OnlinePlayersList from "./OnlinePlayersList";
import { emitStartSinglePlayer } from "../events";

const myUsername = prompt("Please enter your name") || "Anonymous";
const url = new URL(`/ws?username=${myUsername}`, "ws://localhost:8080");

const AppSidebar = () => {
  let wsClient: WebSocketClient | null = null;
  const [players, setPlayers] = createSignal<string[]>([]);
  const [isConnected, setIsConnected] = createSignal(false);

  onMount(() => {
    wsClient = WebSocketClient.getInstance(url);

    wsClient.events.on("websocket/open", () => {
      console.log("WebSocket connection established!");
      setIsConnected(true);
    });

    wsClient.events.on(
      "websocket/update-users",
      ({ usernames }: { usernames: string[] }) => {
        setPlayers(usernames.filter((u) => u !== myUsername));
      }
    );
  });

  function handleConnect() {
    wsClient?.connect();
  }

  onCleanup(() => {
    setIsConnected(false);
    wsClient = null;
  });

  const [selectedOpponent, setSelectedOpponent] = createSignal("");

  return (
    <>
      <div>
        {!isConnected() && (
          <button
            type="button"
            class="btn"
            on:click={handleConnect}
            disabled={isConnected()}
          >
            Connect
          </button>
        )}
      </div>
      <div class="bg-black/10 border border-blue-800 rounded-4xl p-2">
        <OnlinePlayersList
          players={players()}
          selectedOpponent={selectedOpponent()}
          onSelectOpponent={setSelectedOpponent}
        />
        <button
          type="button"
          class="btn"
          disabled={!isConnected() || !selectedOpponent()}
        >
          Send challenge
        </button>
      </div>
      <div class="space-y-2">
        <button type="button" class="btn" on:click={emitStartSinglePlayer}>
          1 Player
        </button>
        <button type="button" class="btn" disabled>
          Options
        </button>
      </div>
    </>
  );
};

export default AppSidebar;
