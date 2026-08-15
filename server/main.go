package main

import (
	"encoding/json"
	"log"
	"net/http"
	"slices"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Message contract matching your frontend protocol
type IncomingMessage struct {
	Type   string          `json:"type"`
	Token  string          `json:"token,omitempty"`
	Action json.RawMessage `json:"action,omitempty"`
}

type OutgoingMessage struct {
	Type          string      `json:"type"`
	OnlinePlayers int         `json:"onlinePlayers,omitempty"`
	Status        string      `json:"status,omitempty"`
	Seed          int64       `json:"seed,omitempty"`
	Players       []string    `json:"players,omitempty"`
	Action        interface{} `json:"action,omitempty"`
	Error         string      `json:"error,omitempty"`
}

// Client represents a single active websocket connection
type Client struct {
	conn     *websocket.Conn
	send     chan []byte
	roomID   string
	username string
	mu       sync.Mutex
	isClosed bool
}

// GameHub coordinates client connections, queues, and game rooms safely across goroutines
type GameHub struct {
	clients    map[*Client]bool
	queue      []*Client
	rooms      map[string][]*Client
	mu         sync.RWMutex
	register   chan *Client
	unregister chan *Client
}

var hub = GameHub{
	clients:    make(map[*Client]bool),
	rooms:      make(map[string][]*Client),
	register:   make(chan *Client),
	unregister: make(chan *Client),
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins for client dev; tighten this for strict production domains if needed
		return true
	},
}

// Add this middleware function to main.go
func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Allow any origin during local development, or lock it to your production domain later
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}

		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// Handle preflight OPTIONS requests instantly
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func main() {
	go hub.run()

	// Wrap endpoints with CORS middleware
	http.HandleFunc("/api/auth/guest", enableCORS(handleGuestAuth))
	http.HandleFunc("/", enableCORS(handleWebSocketUpgrade))

	log.Println("Go Game Server running on :8080...")
	if err := http.ListenAndServe("0.0.0.0:8080", nil); err != nil {
		log.Fatal("ListenAndServe error: ", err)
	}

	// 1. Guest Authentication Endpoint
	http.HandleFunc("/api/auth/guest", handleGuestAuth)

	// 2. WebSocket Connection Handler Route
	http.HandleFunc("/", handleWebSocketUpgrade)

	log.Println("Go Game Server running on :8080...")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal("ListenAndServe error: ", err)
	}
}

func handleGuestAuth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"token": "guest_jwt_token_" + time.Now().Format("20060102150405"),
	})
}

func handleWebSocketUpgrade(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v\n", err)
		return
	}

	client := &Client{
		conn: conn,
		send: make(chan []byte, 256),
	}

	// Step A: First message MUST be AUTH frame
	_ = conn.SetReadDeadline(time.Now().Add(5 * time.Second))
	_, msg, err := conn.ReadMessage()
	if err != nil {
		conn.Close()
		return
	}

	var authReq IncomingMessage
	if json.Unmarshal(msg, &authReq) != nil || authReq.Type != "AUTH" || authReq.Token == "" {
		_ = conn.WriteJSON(OutgoingMessage{Error: "Unauthorized: Missing or invalid AUTH frame"})
		conn.Close()
		return
	}
	_ = conn.SetReadDeadline(time.Time{}) // Reset read deadline after successful auth

	// Successfully authenticated
	// Generate a unique user ID/name based on timestamp/randomness
	client.username = "guest_" + time.Now().Format("150405.999")

	// Step B: Confirm Authentication Success
	hub.register <- client
	client.safeWrite(OutgoingMessage{
		Type:          "AUTH_SUCCESS",
		OnlinePlayers: hub.getOnlineCount(),
	})

	// Spin up concurrent pumps for read/write handling
	go client.writePump()
	client.readPump()
}

func (hub *GameHub) run() {
	for {
		select {
		case client := <-hub.register:
			hub.mu.Lock()
			hub.clients[client] = true
			hub.mu.Unlock()
			hub.broadcastGlobalState()

		case client := <-hub.unregister:
			hub.mu.Lock()
			if hub.clients[client] {
				delete(hub.clients, client)
				close(client.send)
				hub.removeFromQueueLocked(client)
				hub.removeFromRoomLocked(client)
			}
			hub.mu.Unlock()
			hub.broadcastGlobalState()
		}
	}
}

func (c *Client) readPump() {
	defer func() {
		hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512 * 1024) // 512KB max message frame

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			break
		}

		var req IncomingMessage
		if json.Unmarshal(message, &req) != nil {
			continue
		}

		switch req.Type {
		case "QUICK_MATCH":
			hub.handleQuickMatch(c)
		case "GAME_ACTION":
			hub.handleGameAction(c, req.Action)
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) safeWrite(msg OutgoingMessage) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.isClosed {
		return
	}
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	select {
	case c.send <- data:
	default:
		// Channel full, drop or close connection
	}
}

func (hub *GameHub) handleQuickMatch(c *Client) {
	hub.mu.Lock()
	defer hub.mu.Unlock()

	// Prevent duplicate queue entries
	if slices.Contains(hub.queue, c) {
		return
	}

	hub.queue = append(hub.queue, c)
	c.safeWrite(OutgoingMessage{
		Type:   "QUEUE_STATUS",
		Status: "Searching for opponent...",
	})

	// Matchmake when 2 players are available in queue
	if len(hub.queue) >= 2 {
		p1 := hub.queue[0]
		p2 := hub.queue[1]
		hub.queue = hub.queue[2:]

		roomID := "room_" + time.Now().Format("150405.000")
		p1.roomID = roomID
		p2.roomID = roomID
		hub.rooms[roomID] = []*Client{p1, p2}

		seed := time.Now().UnixNano()

		// Send customized start message to Player 1 (their view: [P1, P2])
		p1.safeWrite(OutgoingMessage{
			Type:    "START_MATCH",
			Seed:    seed,
			Players: []string{p1.username, p2.username},
		})

		// Send customized start message to Player 2 (their view flipped: [P2, P1] so local state aligns)
		p2.safeWrite(OutgoingMessage{
			Type:    "START_MATCH",
			Seed:    seed,
			Players: []string{p2.username, p1.username},
		})
	}
}

func (hub *GameHub) handleGameAction(c *Client, action json.RawMessage) {
	hub.mu.RLock()
	roomID := c.roomID
	peers, exists := hub.rooms[roomID]
	hub.mu.RUnlock()

	if !exists {
		return
	}

	// Relay client actions to the other peer in the room
	for _, peer := range peers {
		if peer != c {
			peer.safeWrite(OutgoingMessage{
				Type:   "OPPONENT_ACTION",
				Action: action,
			})
		}
	}
}

func (hub *GameHub) getOnlineCount() int {
	hub.mu.RLock()
	defer hub.mu.RUnlock()
	return len(hub.clients)
}

func (hub *GameHub) broadcastGlobalState() {
	count := hub.getOnlineCount()
	hub.mu.RLock()
	defer hub.mu.RUnlock()

	msg, _ := json.Marshal(OutgoingMessage{
		Type:          "GLOBAL_STATE",
		OnlinePlayers: count,
	})

	for client := range hub.clients {
		select {
		case client.send <- msg:
		default:
		}
	}
}

func (hub *GameHub) removeFromQueueLocked(target *Client) {
	for i, c := range hub.queue {
		if c == target {
			hub.queue = append(hub.queue[:i], hub.queue[i+1:]...)
			break
		}
	}
}

func (hub *GameHub) removeFromRoomLocked(target *Client) {
	if target.roomID == "" {
		return
	}
	peers, exists := hub.rooms[target.roomID]
	if !exists {
		return
	}

	newPeers := []*Client{}
	for _, p := range peers {
		if p != target {
			newPeers = append(newPeers, p)
		}
	}

	if len(newPeers) == 0 {
		delete(hub.rooms, target.roomID)
	} else {
		hub.rooms[target.roomID] = newPeers
	}
}
