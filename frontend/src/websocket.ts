/**
 * Represents a singleton WebSocket client for managing a single WebSocket connection.
 */
class WebSocketClient {
  private static instance: WebSocketClient;
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectInterval: number = 5000; // 5 seconds
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  // Using Phaser's EventEmitter is a great choice here!
  // Assuming you pass it in, or create a global one.
  public events: Phaser.Events.EventEmitter;

  /**
   * Private constructor to prevent direct instantiation.
   * Use `WebSocketClient.getInstance()` instead.
   * @param url The URL of the WebSocket server.
   */
  private constructor(eventEmitter?: Phaser.Events.EventEmitter) {
    this.url = "ws://localhost:8000/ws";
    // If no emitter provided, create a new one. In a Phaser context, you'd likely pass a shared one.
    this.events = eventEmitter || new Phaser.Events.EventEmitter();
  }

  /**
   * Returns the singleton instance of the WebSocketClient.
   * If an instance does not exist, it creates one.
   * @param url The URL of the WebSocket server. This parameter is only used
   * when the instance is first created.
   * @returns The singleton instance of WebSocketClient.
   */
  public static getInstance(
    eventEmitter?: Phaser.Events.EventEmitter
  ): WebSocketClient {
    if (!WebSocketClient.instance) {
      WebSocketClient.instance = new WebSocketClient(eventEmitter);
    }
    return WebSocketClient.instance;
  }

  /**
   * Establishes the WebSocket connection.
   */
  public connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log("WebSocket is already connected.");
      this.events.emit("websocket/open"); // Emit a generic "websocket/open" event
      return;
    }

    console.log(`Attempting to connect to WebSocket at ${this.url}...`);
    this.ws = new WebSocket(this.url);

    this.ws.onopen = (_event: Event) => {
      console.log("WebSocket connected successfully!");
      this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
      // You can emit an event here or call a callback for other parts of your app
      this.events.emit("websocket/open"); // Emit a generic "websocket/open" event
    };

    this.ws.onmessage = (event: MessageEvent) => {
      console.log("WebSocket message received:", event.data);
      // You can process the message here, or forward it to other parts of your app
      // e.g., using a Deno.CustomEvent or a callback

      try {
        const message = JSON.parse(event.data);
        // Emit a general message event
        this.events.emit("websocket/message", message);
        // Also emit specific events based on message type (if structured this way)
        if (message && message.type) {
          this.events.emit(`websocket/${message.type}`, message);
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };

    this.ws.onclose = (event: CloseEvent) => {
      console.warn(
        `WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`
      );
      this.ws = null; // Clear the WebSocket instance
      this.events.emit("websocket/close", {
        code: event.code,
        reason: event.reason,
      });
      this.attemptReconnect();
    };

    this.ws.onerror = (event: Event | ErrorEvent) => {
      console.error("WebSocket error:", event);
      this.events.emit("websocket/error", event);
      // The `onclose` event will typically follow an `onerror` event,
      // which will trigger the reconnection logic.
    };
  }

  /**
   * Sends a message over the WebSocket connection.
   * @param message The message to send.
   */
  public send(message: string | ArrayBufferLike | Blob): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
      console.log("Message sent:", message);
    } else {
      console.warn("WebSocket is not open. Cannot send message.");
      // Optionally, you might want to queue messages or reconnect
    }
  }

  /**
   * Closes the WebSocket connection.
   */
  public close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      console.log("WebSocket connection closed by client.");
    }
  }

  /**
   * Attempts to reconnect to the WebSocket server.
   * Implements a basic exponential backoff with a maximum number of attempts.
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay =
        this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
      console.log(
        `Attempting to reconnect in ${delay / 1000} seconds... (Attempt ${
          this.reconnectAttempts
        })`
      );
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error(
        "Maximum reconnect attempts reached. Giving up on WebSocket connection."
      );
    }
  }

  /**
   * Checks if the WebSocket connection is currently open.
   * @returns True if the WebSocket is open, false otherwise.
   */
  public isOpen(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export { WebSocketClient };
