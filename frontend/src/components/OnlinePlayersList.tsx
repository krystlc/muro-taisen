import { For } from "solid-js";

type Props = {
  players: string[];
  selectedOpponent: string;
  onSelectOpponent: (name: string) => void;
};

const OnlinePlayersList = (props: Props) => {
  return (
    <ul class=" text-center mb-4 h-24 divide-y divide-blue-700 overflow-scroll">
      <For each={props.players} fallback={<li>No online players</li>}>
        {(item) => (
          <li class=" truncate text-ellipsis py-1 text-sm">
            <button
              type="button"
              classList={{
                "cursor-pointer": true,
                "underline text-yellow-500": props.selectedOpponent === item,
              }}
              on:click={() => props.onSelectOpponent(item)}
            >
              {item}
            </button>
          </li>
        )}
      </For>
    </ul>
  );
};

export default OnlinePlayersList;
