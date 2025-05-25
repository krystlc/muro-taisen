import { GameContainer } from "./components/GameContainer";
import AppSidebar from "./components/AppSidebar";

const App = () => {
  return (
    <div class="w-screen h-screen flex flex-col">
      <header class="text-center py-4">
        <h1 class="font-extrabold tracking-tighter uppercase">
          Muro Taisen <span class="text-pink-700">戦略</span>
        </h1>
      </header>
      <div class="flex-1 flex p-2 gap-2 items-center">
        <aside class="w-60 bg-black/10 border border-blue-800 p-2 rounded-4xl space-y-2">
          <AppSidebar />
        </aside>
        <main class="flex-1 overflow-auto">
          <GameContainer />
        </main>
      </div>
      <footer class="bg-black/10">
        <div class="p-6">
          <p class="text-center text-[10px] text-blue-600 uppercase tracking-widest">
            Dedicated to my son, 🧢 Enzo
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
