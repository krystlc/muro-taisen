import { game } from "./game";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
  <header class="text-center py-8">
    <h1 class="font-extrabold tracking-tighter uppercase">Muro Taisen <span class="text-pink-700">戦略</span></h1>
  </header>
    <div id="game-container" class="flex justify-center"></div>
  </div>
`;

const puzzleGame = game(document.querySelector("#game-container")!);
console.log(puzzleGame);
