import { ComponentProps, onMount } from "solid-js";
import { initGame } from "../game";

export const GameContainer = (props: ComponentProps<"main">) => {
  let container;

  onMount(() => {
    initGame(container!);
  });

  return <main {...props} ref={container}></main>;
};
