import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

// Routes
import authRoutes from './routes/auth.js';

// Models
import User from './models/User.js';
import Room from './models/Room.js';

const app = express();
const httpServer = createServer(app);

// Configure CORS - Allow network access for mobile testing
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // Allow localhost, 127.0.0.1, and any IP on the local network
        const allowedPatterns = [
            /^http:\/\/localhost(:\d+)?$/,
            /^http:\/\/127\.0\.0\.1(:\d+)?$/,
            /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,      // 10.x.x.x network
            /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,    // 192.168.x.x network
            /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+(:\d+)?$/,  // 172.16-31.x.x network
            /^https:\/\/.*\.vercel\.app$/,             // All Vercel deployments
            /^https:\/\/.*\.render\.com$/              // Internal Render calls
        ];

        const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
        if (isAllowed) {
            callback(null, true);
        } else if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
            callback(null, true);
        } else {
            console.log('Blocked CORS request from:', origin);
            callback(null, true); // Allow all in development
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

// Configure Socket.io
const io = new Server(httpServer, {
    cors: corsOptions
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Track if MongoDB is connected
let isMongoConnected = false;

// API Routes - Auth only works if MongoDB is connected
app.use('/api/auth', (req, res, next) => {
    if (!isMongoConnected) {
        return res.status(503).json({
            success: false,
            error: 'Authentication requires MongoDB. Please configure MONGODB_URI in .env file.'
        });
    }
    next();
}, authRoutes);

// Store active rooms in memory
const activeRooms = new Map();
const activeGames = new Map();

// Generate a short room code
const generateRoomCode = () => {
    return nanoid(6).toUpperCase();
};

// Word categories for game mode
const WORD_CATEGORIES = {
    easy: [
        'cat', 'dog', 'sun', 'moon', 'star', 'tree', 'house', 'car', 'fish', 'bird',
        'apple', 'banana', 'pizza', 'cake', 'flower', 'heart', 'rainbow', 'ball',
        'balloon', 'book', 'phone', 'clock', 'chair', 'table', 'door', 'window',
        'hat', 'shoe', 'boat', 'train', 'bus', 'bike', 'key', 'cup', 'fork', 'spoon'
    ],
    medium: [
        'elephant', 'giraffe', 'butterfly', 'dinosaur', 'rocket', 'airplane', 'submarine',
        'basketball', 'football', 'skateboard', 'guitar', 'piano', 'camera', 'television',
        'computer', 'headphones', 'umbrella', 'lighthouse', 'mountain', 'waterfall'
    ],
    hard: [
        'astronaut', 'skyscraper', 'rollercoaster', 'thunderstorm', 'helicopter',
        'firefighter', 'parachute', 'windmill', 'caterpillar', 'xylophone',
        'chandelier', 'trampoline', 'aquarium', 'carousel', 'escalator'
    ]
};

// Room class for whiteboard rooms
class ActiveRoom {
    constructor(code, hostId, hostName, dbRoom = null) {
        this.code = code;
        this.hostId = hostId;
        this.hostName = hostName;
        this.participants = new Map();
        this.drawHistory = [];
        this.createdAt = new Date();
        this.dbRoom = dbRoom;
    }

    addParticipant(socketId, odraw, name) {
        this.participants.set(socketId, {
            id: socketId,
            odraw: odraw,
            name,
            joinedAt: new Date(),
            isHost: socketId === this.hostId
        });
    }

    removeParticipant(socketId) {
        this.participants.delete(socketId);
    }

    getParticipantsList() {
        return Array.from(this.participants.values());
    }

    addDrawEvent(event) {
        this.drawHistory.push(event);
        if (this.drawHistory.length > 10000) {
            this.drawHistory = this.drawHistory.slice(-5000);
        }
    }

    clearHistory() {
        this.drawHistory = [];
    }
}

// Game class for game mode
class GameRoom {
    constructor(code, hostId, hostName, settings) {
        this.code = code;
        this.hostId = hostId;
        this.hostName = hostName;
        this.status = 'lobby'; // lobby, playing, roundEnd, gameEnd
        this.players = new Map();
        this.settings = {
            maxPlayers: settings.maxPlayers || 8,
            roundTime: settings.roundTime || 60,
            totalRounds: settings.totalRounds || 3,
            difficulty: settings.difficulty || 'medium'
        };
        this.currentRound = 0;
        this.currentTurn = 0;
        this.currentDrawerId = null;
        this.currentWord = null;
        this.wordHint = '';
        this.timeLeft = this.settings.roundTime;
        this.timerInterval = null;
        this.scores = {};
        this.correctGuessers = [];
        this.messages = [];
        this.usedWords = [];
        this.drawHistory = [];
        this.createdAt = new Date();
    }

    addPlayer(socketId, name) {
        const isHost = socketId === this.hostId;
        const color = `hsl(${this.players.size * 45}, 70%, 60%)`;

        this.players.set(socketId, {
            id: socketId,
            name,
            isHost,
            isReady: isHost, // Host is always ready
            avatar: name.charAt(0).toUpperCase(),
            color
        });

        this.scores[socketId] = 0;
        return this.players.get(socketId);
    }

    removePlayer(socketId) {
        this.players.delete(socketId);
        delete this.scores[socketId];
    }

    getPlayersList() {
        return Array.from(this.players.values());
    }

    setPlayerReady(socketId, isReady) {
        const player = this.players.get(socketId);
        if (player) {
            player.isReady = isReady;
        }
    }

    canStart() {
        return this.players.size >= 2;
    }

    startGame() {
        this.status = 'playing';
        this.currentRound = 1;
        this.currentTurn = 0;
        this.scores = {};
        this.players.forEach((_, id) => {
            this.scores[id] = 0;
        });
        this.startNewTurn();
    }

    getRandomWord() {
        const words = WORD_CATEGORIES[this.settings.difficulty];
        const availableWords = words.filter(w => !this.usedWords.includes(w));

        if (availableWords.length === 0) {
            this.usedWords = [];
            return words[Math.floor(Math.random() * words.length)];
        }

        const word = availableWords[Math.floor(Math.random() * availableWords.length)];
        this.usedWords.push(word);
        return word;
    }

    startNewTurn() {
        // Get players array
        const playersArray = this.getPlayersList();

        // Pick drawer based on turn
        const drawerIndex = this.currentTurn % playersArray.length;
        const drawer = playersArray[drawerIndex];

        this.currentDrawerId = drawer.id;
        this.currentWord = this.getRandomWord();
        this.wordHint = this.currentWord.split('').map(c => c === ' ' ? '  ' : '_').join(' ');
        this.timeLeft = this.settings.roundTime;
        this.correctGuessers = [];
        this.drawHistory = [];

        return {
            drawerId: this.currentDrawerId,
            drawerName: drawer.name,
            word: this.currentWord,
            hint: this.wordHint
        };
    }

    submitGuess(socketId, playerName, guess) {
        // Drawer can't guess
        if (socketId === this.currentDrawerId) {
            return { correct: false, isDrawer: true };
        }

        // Already guessed
        if (this.correctGuessers.includes(socketId)) {
            return { correct: false, alreadyGuessed: true };
        }

        const isCorrect = guess.toLowerCase().trim() === this.currentWord.toLowerCase().trim();

        // Add message
        this.messages.push({
            id: Date.now(),
            playerId: socketId,
            playerName,
            message: isCorrect ? '🎉 Guessed correctly!' : guess,
            type: isCorrect ? 'correct' : 'chat',
            timestamp: Date.now()
        });

        if (isCorrect) {
            // Calculate points
            const basePoints = 100;
            const timeBonus = Math.floor((this.timeLeft / this.settings.roundTime) * 50);
            const orderBonus = Math.max(0, 30 - (this.correctGuessers.length * 10));
            const points = basePoints + timeBonus + orderBonus;

            this.correctGuessers.push(socketId);
            this.scores[socketId] = (this.scores[socketId] || 0) + points;

            // Give drawer points
            const drawerPoints = 10 + (this.correctGuessers.length === 1 ? 15 : 0);
            this.scores[this.currentDrawerId] = (this.scores[this.currentDrawerId] || 0) + drawerPoints;

            return { correct: true, points };
        }

        return { correct: false };
    }

    endTurn() {
        const playersArray = this.getPlayersList();
        const turnsPerRound = playersArray.length;
        this.currentTurn++;

        // Check if round is complete
        if (this.currentTurn >= turnsPerRound * this.currentRound) {
            if (this.currentRound >= this.settings.totalRounds) {
                this.status = 'gameEnd';
                return 'gameEnd';
            } else {
                this.currentRound++;
                this.status = 'roundEnd';
                return 'roundEnd';
            }
        }

        return 'nextTurn';
    }

    getLeaderboard() {
        return this.getPlayersList()
            .map(p => ({ ...p, score: this.scores[p.id] || 0 }))
            .sort((a, b) => b.score - a.score);
    }

    getWinner() {
        const leaderboard = this.getLeaderboard();
        return leaderboard[0] || null;
    }

    getGameState() {
        return {
            gameCode: this.code,
            status: this.status,
            players: this.getPlayersList(),
            hostId: this.hostId,
            settings: this.settings,
            currentRound: this.currentRound,
            totalRounds: this.settings.totalRounds,
            currentTurn: this.currentTurn,
            currentDrawerId: this.currentDrawerId,
            wordHint: this.wordHint,
            timeLeft: this.timeLeft,
            scores: this.scores,
            correctGuessers: this.correctGuessers,
            messages: this.messages.slice(-50)
        };
    }

    restart() {
        this.status = 'lobby';
        this.currentRound = 0;
        this.currentTurn = 0;
        this.currentDrawerId = null;
        this.currentWord = null;
        this.wordHint = '';
        this.timeLeft = this.settings.roundTime;
        this.correctGuessers = [];
        this.messages = [];
        this.usedWords = [];
        this.drawHistory = [];
        this.scores = {};
        this.players.forEach((_, id) => {
            this.scores[id] = 0;
        });
    }
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    // ========================================
    // WHITEBOARD ROOM EVENTS
    // ========================================

    // Create a new room
    socket.on('create-room', async ({ userName, userId }, callback) => {
        try {
            const code = generateRoomCode();

            // Create DB room if user is authenticated
            let dbRoom = null;
            if (userId) {
                dbRoom = await Room.create({
                    code,
                    host: userId,
                    participants: [{ user: userId, role: 'editor' }]
                });

                await User.findByIdAndUpdate(userId, {
                    $inc: { 'stats.roomsCreated': 1 }
                });
            }

            const room = new ActiveRoom(code, socket.id, userName, dbRoom);
            room.addParticipant(socket.id, userId, userName);
            activeRooms.set(code, room);

            socket.join(code);
            socket.roomCode = code;
            socket.userId = userId;

            console.log(`🏠 Room created: ${code} by ${userName}`);

            callback({
                success: true,
                roomCode: code,
                participants: room.getParticipantsList()
            });
        } catch (err) {
            console.error('Create room error:', err);
            callback({ success: false, error: 'Failed to create room' });
        }
    });

    // Join an existing room
    socket.on('join-room', async ({ roomCode, userName, userId }, callback) => {
        try {
            const code = roomCode.toUpperCase();
            let room = activeRooms.get(code);

            if (!room) {
                const dbRoom = await Room.findOne({ code, isActive: true });
                if (dbRoom) {
                    const hostUser = await User.findById(dbRoom.host);
                    room = new ActiveRoom(code, null, hostUser?.name || 'Host', dbRoom);
                    activeRooms.set(code, room);
                }
            }

            if (!room) {
                callback({ success: false, error: 'Room not found' });
                return;
            }

            room.addParticipant(socket.id, userId, userName);
            socket.join(code);
            socket.roomCode = code;
            socket.userId = userId;

            console.log(`👤 ${userName} joined room: ${code}`);

            if (userId && room.dbRoom) {
                await room.dbRoom.addParticipant(userId);
                await User.findByIdAndUpdate(userId, {
                    $inc: { 'stats.roomsJoined': 1 }
                });
            }

            socket.to(code).emit('user-joined', {
                user: { id: socket.id, odraw: userId, name: userName },
                participants: room.getParticipantsList()
            });

            callback({
                success: true,
                roomCode: code,
                participants: room.getParticipantsList(),
                drawHistory: room.drawHistory,
                hostId: room.hostId
            });
        } catch (err) {
            console.error('Join room error:', err);
            callback({ success: false, error: 'Failed to join room' });
        }
    });

    // ========================================
    // GAME MODE EVENTS
    // ========================================

    // Create a game
    socket.on('game:create', ({ userName, settings }, callback) => {
        try {
            const code = generateRoomCode();
            const game = new GameRoom(code, socket.id, userName, settings || {});
            game.addPlayer(socket.id, userName);
            activeGames.set(code, game);

            socket.join(`game:${code}`);
            socket.gameCode = code;

            console.log(`🎮 Game created: ${code} by ${userName}`);

            callback({
                success: true,
                gameCode: code,
                gameState: game.getGameState()
            });
        } catch (err) {
            console.error('Create game error:', err);
            callback({ success: false, error: 'Failed to create game' });
        }
    });

    // Join a game
    socket.on('game:join', ({ gameCode, userName }, callback) => {
        try {
            const code = gameCode.toUpperCase();
            const game = activeGames.get(code);

            if (!game) {
                callback({ success: false, error: 'Game not found' });
                return;
            }

            if (game.status !== 'lobby') {
                callback({ success: false, error: 'Game already in progress' });
                return;
            }

            if (game.players.size >= game.settings.maxPlayers) {
                callback({ success: false, error: 'Game is full' });
                return;
            }

            const player = game.addPlayer(socket.id, userName);
            socket.join(`game:${code}`);
            socket.gameCode = code;

            console.log(`🎮 ${userName} joined game: ${code}`);

            // Notify other players
            socket.to(`game:${code}`).emit('game:player-joined', {
                player,
                gameState: game.getGameState()
            });

            callback({
                success: true,
                gameCode: code,
                gameState: game.getGameState()
            });
        } catch (err) {
            console.error('Join game error:', err);
            callback({ success: false, error: 'Failed to join game' });
        }
    });

    // Player ready toggle
    socket.on('game:ready', ({ isReady }) => {
        if (!socket.gameCode) return;

        const game = activeGames.get(socket.gameCode);
        if (!game) return;

        game.setPlayerReady(socket.id, isReady);

        io.to(`game:${socket.gameCode}`).emit('game:player-ready', {
            playerId: socket.id,
            isReady,
            gameState: game.getGameState()
        });
    });

    // Start game
    socket.on('game:start', ({ }, callback) => {
        if (!socket.gameCode) {
            callback({ success: false, error: 'Not in a game' });
            return;
        }

        const game = activeGames.get(socket.gameCode);
        if (!game) {
            callback({ success: false, error: 'Game not found' });
            return;
        }

        if (socket.id !== game.hostId) {
            callback({ success: false, error: 'Only host can start the game' });
            return;
        }

        if (!game.canStart()) {
            callback({ success: false, error: 'Need at least 2 players' });
            return;
        }

        game.startGame();

        // Start timer
        game.timerInterval = setInterval(() => {
            game.timeLeft--;

            io.to(`game:${socket.gameCode}`).emit('game:timer', {
                timeLeft: game.timeLeft
            });

            if (game.timeLeft <= 0) {
                clearInterval(game.timerInterval);
                handleTurnEnd(socket.gameCode);
            }
        }, 1000);

        // Send game started event with word only to drawer
        io.to(`game:${socket.gameCode}`).emit('game:started', {
            gameState: game.getGameState()
        });

        // Send word to drawer
        io.to(game.currentDrawerId).emit('game:word', {
            word: game.currentWord
        });

        console.log(`🎮 Game started: ${socket.gameCode}`);
        callback({ success: true });
    });

    // Submit guess
    socket.on('game:guess', ({ guess }) => {
        if (!socket.gameCode) return;

        const game = activeGames.get(socket.gameCode);
        if (!game || game.status !== 'playing') return;

        const player = game.players.get(socket.id);
        if (!player) return;

        const result = game.submitGuess(socket.id, player.name, guess);

        io.to(`game:${socket.gameCode}`).emit('game:guess-result', {
            playerId: socket.id,
            playerName: player.name,
            correct: result.correct,
            points: result.points || 0,
            message: result.correct ? '🎉 Guessed correctly!' : guess,
            gameState: game.getGameState()
        });

        // Check if all non-drawers have guessed
        const nonDrawers = game.getPlayersList().filter(p => p.id !== game.currentDrawerId);
        if (game.correctGuessers.length >= nonDrawers.length) {
            clearInterval(game.timerInterval);
            handleTurnEnd(socket.gameCode);
        }
    });

    // Drawing events
    socket.on('game:draw', (data) => {
        if (!socket.gameCode) return;

        const game = activeGames.get(socket.gameCode);
        if (!game || game.status !== 'playing') return;
        if (socket.id !== game.currentDrawerId) return;

        game.drawHistory.push(data);
        socket.to(`game:${socket.gameCode}`).emit('game:draw', data);
    });

    // Clear canvas
    socket.on('game:clear-canvas', () => {
        if (!socket.gameCode) return;

        const game = activeGames.get(socket.gameCode);
        if (!game || game.status !== 'playing') return;
        if (socket.id !== game.currentDrawerId) return;

        game.drawHistory = [];
        io.to(`game:${socket.gameCode}`).emit('game:clear-canvas');
    });

    // Next round
    socket.on('game:next-round', () => {
        if (!socket.gameCode) return;

        const game = activeGames.get(socket.gameCode);
        if (!game) return;

        game.status = 'playing';
        const turnInfo = game.startNewTurn();

        // Start timer
        game.timerInterval = setInterval(() => {
            game.timeLeft--;
            io.to(`game:${socket.gameCode}`).emit('game:timer', { timeLeft: game.timeLeft });
            if (game.timeLeft <= 0) {
                clearInterval(game.timerInterval);
                handleTurnEnd(socket.gameCode);
            }
        }, 1000);

        io.to(`game:${socket.gameCode}`).emit('game:new-turn', {
            gameState: game.getGameState()
        });

        io.to(game.currentDrawerId).emit('game:word', {
            word: game.currentWord
        });
    });

    // Restart game
    socket.on('game:restart', () => {
        if (!socket.gameCode) return;

        const game = activeGames.get(socket.gameCode);
        if (!game) return;

        game.restart();
        io.to(`game:${socket.gameCode}`).emit('game:restarted', {
            gameState: game.getGameState()
        });
    });

    // Leave game
    socket.on('game:leave', () => {
        handleLeaveGame(socket);
    });

    // ========================================
    // WHITEBOARD DRAWING EVENTS
    // ========================================

    socket.on('draw', (data) => {
        if (!socket.roomCode) return;

        const room = activeRooms.get(socket.roomCode);
        if (!room) return;

        room.addDrawEvent({
            ...data,
            odraw: socket.id,
            timestamp: Date.now()
        });

        socket.to(socket.roomCode).emit('draw', {
            ...data,
            odraw: socket.id
        });
    });

    socket.on('stroke-end', () => {
        if (!socket.roomCode) return;
        socket.to(socket.roomCode).emit('stroke-end', {
            odraw: socket.id,
            timestamp: Date.now()
        });
    });

    socket.on('clear-canvas', async () => {
        if (!socket.roomCode) return;

        const room = activeRooms.get(socket.roomCode);
        if (!room) return;

        room.clearHistory();
        socket.to(socket.roomCode).emit('clear-canvas');
        console.log(`🗑️ Canvas cleared in room: ${socket.roomCode}`);
    });

    socket.on('cursor-move', (data) => {
        if (!socket.roomCode) return;
        socket.to(socket.roomCode).emit('cursor-move', {
            odraw: socket.id,
            ...data
        });
    });

    socket.on('save-snapshot', async (data) => {
        if (!socket.roomCode) return;

        const room = activeRooms.get(socket.roomCode);
        if (!room || !room.dbRoom) return;

        try {
            room.dbRoom.snapshot = data.snapshot;
            await room.dbRoom.save();
            socket.emit('snapshot-saved', { success: true });
        } catch (err) {
            socket.emit('snapshot-saved', { success: false, error: err.message });
        }
    });

    socket.on('leave-room', () => {
        handleLeaveRoom(socket);
    });

    socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${socket.id}`);
        handleLeaveRoom(socket);
        handleLeaveGame(socket);
    });
});

// Helper function to handle turn end
function handleTurnEnd(gameCode) {
    const game = activeGames.get(gameCode);
    if (!game) return;

    const result = game.endTurn();

    io.to(`game:${gameCode}`).emit('game:turn-end', {
        word: game.currentWord,
        result,
        gameState: game.getGameState()
    });

    if (result === 'gameEnd') {
        io.to(`game:${gameCode}`).emit('game:ended', {
            winner: game.getWinner(),
            leaderboard: game.getLeaderboard(),
            gameState: game.getGameState()
        });
    }
}

// Helper function to handle leaving whiteboard room
async function handleLeaveRoom(socket) {
    if (!socket.roomCode) return;

    const room = activeRooms.get(socket.roomCode);
    if (!room) return;

    const userName = room.participants.get(socket.id)?.name || 'Unknown';
    room.removeParticipant(socket.id);

    if (socket.userId && room.dbRoom) {
        await room.dbRoom.removeParticipant(socket.userId);
    }

    socket.to(socket.roomCode).emit('user-left', {
        odraw: socket.id,
        userName,
        participants: room.getParticipantsList()
    });

    console.log(`👋 ${userName} left room: ${socket.roomCode}`);

    if (room.participants.size === 0) {
        activeRooms.delete(socket.roomCode);
        console.log(`🗑️ Room deleted: ${socket.roomCode}`);
    } else if (socket.id === room.hostId) {
        const newHost = room.getParticipantsList()[0];
        if (newHost) {
            room.hostId = newHost.id;
            io.to(socket.roomCode).emit('host-changed', {
                newHostId: newHost.id,
                newHostName: newHost.name
            });
            console.log(`👑 New host: ${newHost.name} in room: ${socket.roomCode}`);
        }
    }

    socket.leave(socket.roomCode);
    socket.roomCode = null;
    socket.userId = null;
}

// Helper function to handle leaving game
function handleLeaveGame(socket) {
    if (!socket.gameCode) return;

    const game = activeGames.get(socket.gameCode);
    if (!game) return;

    const player = game.players.get(socket.id);
    const playerName = player?.name || 'Unknown';

    game.removePlayer(socket.id);

    socket.to(`game:${socket.gameCode}`).emit('game:player-left', {
        playerId: socket.id,
        playerName,
        gameState: game.getGameState()
    });

    console.log(`🎮 ${playerName} left game: ${socket.gameCode}`);

    // If no players left, delete game
    if (game.players.size === 0) {
        if (game.timerInterval) clearInterval(game.timerInterval);
        activeGames.delete(socket.gameCode);
        console.log(`🗑️ Game deleted: ${socket.gameCode}`);
    }
    // If host left, transfer host
    else if (socket.id === game.hostId) {
        const newHost = game.getPlayersList()[0];
        if (newHost) {
            game.hostId = newHost.id;
            newHost.isHost = true;
            io.to(`game:${socket.gameCode}`).emit('game:host-changed', {
                newHostId: newHost.id,
                newHostName: newHost.name,
                gameState: game.getGameState()
            });
            console.log(`👑 New game host: ${newHost.name}`);
        }
    }
    // If current drawer left during game
    else if (game.status === 'playing' && socket.id === game.currentDrawerId) {
        if (game.timerInterval) clearInterval(game.timerInterval);
        handleTurnEnd(socket.gameCode);
    }

    socket.leave(`game:${socket.gameCode}`);
    socket.gameCode = null;
}

// REST API endpoints
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        activeRooms: activeRooms.size,
        activeGames: activeGames.size
    });
});

app.get('/api/rooms/:code', async (req, res) => {
    const code = req.params.code.toUpperCase();

    const activeRoom = activeRooms.get(code);
    if (activeRoom) {
        return res.json({
            code: activeRoom.code,
            participantCount: activeRoom.participants.size,
            createdAt: activeRoom.createdAt,
            isActive: true
        });
    }

    const dbRoom = await Room.findOne({ code, isActive: true });
    if (!dbRoom) {
        return res.status(404).json({ error: 'Room not found' });
    }

    res.json(dbRoom.toPublicJSON());
});

app.get('/api/games/:code', (req, res) => {
    const code = req.params.code.toUpperCase();

    const game = activeGames.get(code);
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }

    res.json({
        code: game.code,
        status: game.status,
        playerCount: game.players.size,
        maxPlayers: game.settings.maxPlayers,
        createdAt: game.createdAt
    });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 3001;

const startServer = async () => {
    if (process.env.MONGODB_URI) {
        try {
            await mongoose.connect(process.env.MONGODB_URI);
            isMongoConnected = true;
            console.log('📦 Connected to MongoDB');
        } catch (err) {
            console.log('⚠️ MongoDB connection failed:', err.message);
            console.log('⚠️ Running without database - auth features disabled');
            isMongoConnected = false;
        }
    } else {
        console.log('⚠️ No MongoDB URI provided, running without database');
        isMongoConnected = false;
    }

    httpServer.listen(PORT, () => {
        console.log(`
  ╔════════════════════════════════════════╗
  ║     🎨 DrawBoard Server v4.0           ║
  ╠════════════════════════════════════════╣
  ║  Port: ${PORT}                            ║
  ║  WebSocket: Ready                      ║
  ║  Game Mode: Enabled ✓                  ║
  ║  Auth: ${isMongoConnected ? 'Enabled ✓' : 'Disabled (No DB)'}                  ║
  ║  Time: ${new Date().toLocaleTimeString()}                       ║
  ╚════════════════════════════════════════╝
    `);
    });
};

process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    // Clear all game timers
    activeGames.forEach(game => {
        if (game.timerInterval) clearInterval(game.timerInterval);
    });
    if (isMongoConnected) {
        await mongoose.connection.close();
    }
    process.exit(0);
});

startServer();
