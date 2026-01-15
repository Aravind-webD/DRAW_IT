import { io } from 'socket.io-client';

// Dynamically determine socket URL based on current host
// This allows mobile devices on the same network to connect
const getSocketUrl = () => {
    // 1. In Production: Use the environment variable
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    // 2. In Development: Use the dynamic local network address
    const { hostname, protocol } = window.location;
    return `${protocol}//${hostname}:3001`;
};

const SOCKET_URL = getSocketUrl();

class SocketService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.roomCode = null;
        this.gameCode = null;
        this.listeners = new Map();
    }

    connect() {
        if (this.socket?.connected) return;

        this.socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
            console.log('🔌 Connected to server');
            this.isConnected = true;
            this._notifyListeners('connection', { connected: true });
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 Disconnected from server');
            this.isConnected = false;
            this._notifyListeners('connection', { connected: false });
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this._notifyListeners('error', { message: 'Failed to connect to server' });
        });

        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.roomCode = null;
            this.gameCode = null;
        }
    }

    // Room operations (whiteboard mode)
    createRoom(userName, userId = null) {
        return new Promise((resolve, reject) => {
            if (!this.socket?.connected) {
                reject(new Error('Not connected to server'));
                return;
            }

            this.socket.emit('create-room', { userName, userId }, (response) => {
                if (response.success) {
                    this.roomCode = response.roomCode;
                    resolve(response);
                } else {
                    reject(new Error(response.error || 'Failed to create room'));
                }
            });
        });
    }

    joinRoom(roomCode, userName, userId = null) {
        return new Promise((resolve, reject) => {
            if (!this.socket?.connected) {
                reject(new Error('Not connected to server'));
                return;
            }

            this.socket.emit('join-room', { roomCode, userName, userId }, (response) => {
                if (response.success) {
                    this.roomCode = response.roomCode;
                    resolve(response);
                } else {
                    reject(new Error(response.error || 'Failed to join room'));
                }
            });
        });
    }

    leaveRoom() {
        if (this.socket?.connected && this.roomCode) {
            this.socket.emit('leave-room');
            this.roomCode = null;
        }
    }

    // ========================================
    // GAME MODE OPERATIONS
    // ========================================

    // Create a game room
    createGame(userName, settings) {
        return new Promise((resolve, reject) => {
            if (!this.socket?.connected) {
                reject(new Error('Not connected to server'));
                return;
            }

            this.socket.emit('game:create', { userName, settings }, (response) => {
                if (response.success) {
                    this.gameCode = response.gameCode;
                    resolve(response);
                } else {
                    reject(new Error(response.error || 'Failed to create game'));
                }
            });
        });
    }

    // Join a game room
    joinGame(gameCode, userName) {
        return new Promise((resolve, reject) => {
            if (!this.socket?.connected) {
                reject(new Error('Not connected to server'));
                return;
            }

            this.socket.emit('game:join', { gameCode, userName }, (response) => {
                if (response.success) {
                    this.gameCode = response.gameCode;
                    resolve(response);
                } else {
                    reject(new Error(response.error || 'Failed to join game'));
                }
            });
        });
    }

    // Leave game
    leaveGame() {
        if (this.socket?.connected && this.gameCode) {
            this.socket.emit('game:leave');
            this.gameCode = null;
        }
    }

    // Toggle ready status
    toggleReady(isReady) {
        if (this.socket?.connected && this.gameCode) {
            this.socket.emit('game:ready', { isReady });
        }
    }

    // Host starts the game
    startGame() {
        return new Promise((resolve, reject) => {
            if (!this.socket?.connected || !this.gameCode) {
                reject(new Error('Not in a game'));
                return;
            }

            this.socket.emit('game:start', {}, (response) => {
                if (response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response.error || 'Failed to start game'));
                }
            });
        });
    }

    // Submit a guess
    submitGuess(guess) {
        if (this.socket?.connected && this.gameCode) {
            this.socket.emit('game:guess', { guess });
        }
    }

    // Send drawing data
    emitGameDraw(data) {
        if (this.socket?.connected && this.gameCode) {
            this.socket.emit('game:draw', data);
        }
    }

    // Clear game canvas
    emitGameClear() {
        if (this.socket?.connected && this.gameCode) {
            this.socket.emit('game:clear-canvas');
        }
    }

    // Request next round
    nextRound() {
        if (this.socket?.connected && this.gameCode) {
            this.socket.emit('game:next-round');
        }
    }

    // Play again
    playAgain() {
        if (this.socket?.connected && this.gameCode) {
            this.socket.emit('game:restart');
        }
    }

    // ========================================
    // WHITEBOARD DRAWING OPERATIONS
    // ========================================

    emitDraw(data) {
        if (this.socket?.connected && this.roomCode) {
            this.socket.emit('draw', data);
        }
    }

    emitStrokeEnd() {
        if (this.socket?.connected && this.roomCode) {
            this.socket.emit('stroke-end');
        }
    }

    emitClearCanvas() {
        if (this.socket?.connected && this.roomCode) {
            this.socket.emit('clear-canvas');
        }
    }

    emitCursorMove(data) {
        if (this.socket?.connected && this.roomCode) {
            this.socket.emit('cursor-move', data);
        }
    }

    // Event listeners
    on(event, callback) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event, callback) {
        if (this.socket) {
            this.socket.off(event, callback);
        }
    }

    // Internal listener management for connection state
    addListener(id, callback) {
        this.listeners.set(id, callback);
    }

    removeListener(id) {
        this.listeners.delete(id);
    }

    _notifyListeners(event, data) {
        this.listeners.forEach((callback) => {
            callback(event, data);
        });
    }

    get connected() {
        return this.socket?.connected || false;
    }

    get socketId() {
        return this.socket?.id || null;
    }
}

// Singleton instance
export const socketService = new SocketService();
export default socketService;
