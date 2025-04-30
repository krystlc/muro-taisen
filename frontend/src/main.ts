// frontend/src/main.ts
import { initGame } from "./game";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="flex flex-col h-full">
    <header class="text-center py-4">
      <h1 class="font-extrabold tracking-tighter uppercase">Muro Taisen <span class="text-pink-700">戦略</span></h1>
    </header>
    <div id="game-container" class="flex-grow"></div>
  </div>
`;

// initGame will now FIT to the container and re-center on resize
const puzzleGame = initGame(document.querySelector("#game-container")!);
console.log(puzzleGame);
