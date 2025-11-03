import { render } from "solid-js/web";
import App from "./App";
import { currentUser } from "./hooks/CurrentUser";

if (!currentUser.getUsername()) {
  const username = prompt("Enter username") ?? "Anon";
  currentUser.setUsername(username);
}

render(() => <App />, document.getElementById("app")!);
