import { onMount } from "solid-js";
import { initGame } from "../game";

export const GameContainer = () => {
  let container;

  onMount(() => {
    const puzzleGame = initGame(container!);
    console.log(puzzleGame);
  });

  return <div ref={container}></div>;
};
