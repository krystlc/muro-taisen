import AppHeader from "./components/AppHeader";
import { GameContainer } from "./components/GameContainer";

const App = () => {
  return (
    <div class="w-screen h-screen flex flex-col">
      <AppHeader />
      <GameContainer class="flex-1 overflow-auto w-screen" />
      <footer>
        <div class="p-1 md:p-6">
          <p class="text-center text-[10px] text-blue-600 uppercase tracking-widest">
            Dedicated to my son, 🧢 Enzo
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
