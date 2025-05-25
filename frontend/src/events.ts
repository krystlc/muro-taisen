const startSinglePlayer = new CustomEvent("app/start-single-player");

export const emitStartSinglePlayer = () =>
  window.dispatchEvent(startSinglePlayer);

export const listenToStartSinglePlayer = (
  callback: EventListenerOrEventListenerObject
) => window.addEventListener("app/start-single-player", callback);
