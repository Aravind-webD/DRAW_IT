import { create } from 'zustand';

// Extensive word list for better randomization - all drawable words
const WORD_CATEGORIES = {
    easy: [
        'cat', 'dog', 'sun', 'moon', 'star', 'tree', 'house', 'car', 'fish', 'bird',
        'apple', 'banana', 'pizza', 'cake', 'flower', 'heart', 'rainbow', 'ball',
        'balloon', 'book', 'phone', 'clock', 'chair', 'table', 'door', 'window',
        'hat', 'shoe', 'boat', 'train', 'bus', 'bike', 'key', 'cup', 'fork', 'spoon',
        'bed', 'lamp', 'cloud', 'rain', 'snow', 'fire', 'water', 'grass', 'leaf',
        'egg', 'milk', 'bread', 'cheese', 'cookie', 'candy', 'ice', 'box', 'bag',
        'pen', 'pencil', 'paper', 'flag', 'bell', 'drum', 'smile', 'eye', 'nose',
        'ear', 'hand', 'foot', 'tooth', 'hair', 'baby', 'king', 'queen', 'crown'
    ],
    medium: [
        'elephant', 'giraffe', 'butterfly', 'dinosaur', 'rocket', 'airplane', 'submarine',
        'basketball', 'football', 'skateboard', 'guitar', 'piano', 'camera', 'television',
        'computer', 'headphones', 'umbrella', 'lighthouse', 'mountain', 'waterfall',
        'dolphin', 'penguin', 'octopus', 'turtle', 'rabbit', 'squirrel', 'kangaroo',
        'volcano', 'tornado', 'igloo', 'pyramid', 'castle', 'bridge', 'fountain',
        'rainbow', 'sunrise', 'sunset', 'beach', 'island', 'forest', 'desert',
        'snowman', 'scarecrow', 'robot', 'alien', 'ghost', 'wizard', 'pirate',
        'treasure', 'diamond', 'telescope', 'microscope', 'magnet', 'battery',
        'sandwich', 'hamburger', 'hotdog', 'popcorn', 'donut', 'cupcake', 'pancake',
        'spaghetti', 'sushi', 'taco', 'pretzel', 'lollipop', 'popsicle', 'milkshake'
    ],
    hard: [
        'astronaut', 'skyscraper', 'rollercoaster', 'thunderstorm', 'helicopter',
        'firefighter', 'parachute', 'windmill', 'caterpillar', 'xylophone',
        'chandelier', 'trampoline', 'aquarium', 'carousel', 'escalator',
        'accordion', 'saxophone', 'harmonica', 'tambourine', 'microphone',
        'graduation', 'celebration', 'meditation', 'imagination', 'constellation',
        'chameleon', 'porcupine', 'hedgehog', 'flamingo', 'peacock', 'scorpion',
        'jellyfish', 'seahorse', 'starfish', 'crab', 'lobster', 'shrimp',
        'laboratory', 'observatory', 'auditorium', 'colosseum', 'amphitheater',
        'agriculture', 'architecture', 'archaeology', 'photography', 'chemistry'
    ]
};

// Get all words flattened
const getAllWords = () => [
    ...WORD_CATEGORIES.easy,
    ...WORD_CATEGORIES.medium,
    ...WORD_CATEGORIES.hard
];

const useGameStore = create((set, get) => ({
    // Game State
    isGameMode: false,
    gameStatus: 'idle', // 'idle' | 'lobby' | 'playing' | 'roundEnd' | 'gameEnd'
    gameCode: null,
    isHost: false,

    // Players
    players: [],
    hostId: null,
    localPlayerId: null,
    currentDrawerId: null,

    // Round State
    currentRound: 0,
    totalRounds: 3,
    currentTurn: 0, // Turn within a round (each player draws once per round)
    currentWord: null,
    wordHint: '',
    timeLeft: 60,
    roundStartTime: null,
    usedWords: [], // Track used words to avoid repetition

    // Scores
    scores: {},
    roundScores: {},

    // Guessing/Chat
    guesses: [],
    correctGuessers: [],
    messages: [], // Chat messages

    // Settings (customizable)
    settings: {
        maxPlayers: 8,
        roundTime: 60, // Default 60s per turn
        difficulty: 'medium',
        totalRounds: 3,
        customWords: [], // User can add custom words
        hintsEnabled: true
    },

    // Actions
    setGameMode: (isGameMode) => set({ isGameMode }),

    updateSettings: (newSettings) => set(state => ({
        settings: { ...state.settings, ...newSettings }
    })),

    setLocalPlayerId: (id) => set({ localPlayerId: id }),

    createGame: (hostName, hostId) => {
        const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        set({
            isGameMode: true,
            gameStatus: 'lobby',
            gameCode,
            hostId,
            localPlayerId: hostId,
            isHost: true,
            players: [{
                id: hostId,
                name: hostName,
                isHost: true,
                isReady: true,
                avatar: hostName.charAt(0).toUpperCase(),
                color: `hsl(${Math.random() * 360}, 70%, 60%)`
            }],
            scores: { [hostId]: 0 },
            currentRound: 0,
            usedWords: [],
            messages: []
        });
        return gameCode;
    },

    joinGame: (gameCode, playerId, playerName) => {
        const { players, scores, settings } = get();
        if (players.length >= settings.maxPlayers) {
            return { success: false, error: 'Game is full' };
        }

        if (players.find(p => p.id === playerId)) {
            return { success: false, error: 'Already in game' };
        }

        set({
            gameCode,
            localPlayerId: playerId,
            isHost: false,
            players: [...players, {
                id: playerId,
                name: playerName,
                isHost: false,
                isReady: false,
                avatar: playerName.charAt(0).toUpperCase(),
                color: `hsl(${Math.random() * 360}, 70%, 60%)`
            }],
            scores: { ...scores, [playerId]: 0 }
        });
        return { success: true };
    },

    addPlayer: (playerId, playerName, isHost = false) => {
        const { players, scores } = get();
        if (players.find(p => p.id === playerId)) return;

        set({
            players: [...players, {
                id: playerId,
                name: playerName,
                isHost,
                isReady: false,
                avatar: playerName.charAt(0).toUpperCase(),
                color: `hsl(${players.length * 45}, 70%, 60%)`
            }],
            scores: { ...scores, [playerId]: 0 }
        });
    },

    removePlayer: (playerId) => {
        const { players, scores, hostId } = get();
        const newPlayers = players.filter(p => p.id !== playerId);
        const newScores = { ...scores };
        delete newScores[playerId];

        let newHostId = hostId;
        if (playerId === hostId && newPlayers.length > 0) {
            newHostId = newPlayers[0].id;
            newPlayers[0].isHost = true;
        }

        set({
            players: newPlayers,
            scores: newScores,
            hostId: newHostId
        });
    },

    setPlayerReady: (playerId, isReady) => {
        const { players } = get();
        set({
            players: players.map(p =>
                p.id === playerId ? { ...p, isReady } : p
            )
        });
    },

    startGame: () => {
        const { players, settings } = get();
        if (players.length < 2) {
            return { success: false, error: 'Need at least 2 players' };
        }

        set({
            gameStatus: 'playing',
            currentRound: 1,
            currentTurn: 0,
            totalRounds: settings.totalRounds,
            scores: players.reduce((acc, p) => ({ ...acc, [p.id]: 0 }), {}),
            usedWords: [],
            messages: []
        });

        get().startNewTurn();
        return { success: true };
    },

    getRandomWord: () => {
        const { settings, usedWords } = get();
        const wordPool = settings.customWords.length > 0
            ? [...settings.customWords, ...WORD_CATEGORIES[settings.difficulty]]
            : WORD_CATEGORIES[settings.difficulty];

        const availableWords = wordPool.filter(w => !usedWords.includes(w));

        if (availableWords.length === 0) {
            // Reset if all words used
            set({ usedWords: [] });
            return wordPool[Math.floor(Math.random() * wordPool.length)];
        }

        const word = availableWords[Math.floor(Math.random() * availableWords.length)];
        set(state => ({ usedWords: [...state.usedWords, word] }));
        return word;
    },

    startNewTurn: () => {
        const { players, currentTurn, settings } = get();

        // Pick drawer (rotate through players based on turn)
        const drawerIndex = currentTurn % players.length;
        const drawer = players[drawerIndex];

        // Pick random word
        const word = get().getRandomWord();

        // Create hint (show word length with underscores)
        const hint = word.split('').map(c =>
            c === ' ' ? '   ' : '_'
        ).join(' ');

        set({
            currentDrawerId: drawer.id,
            currentWord: word,
            wordHint: hint,
            timeLeft: settings.roundTime,
            roundStartTime: Date.now(),
            guesses: [],
            correctGuessers: [],
            roundScores: {}
        });

        return { drawer, word, hint };
    },

    revealHint: () => {
        const { currentWord, wordHint, timeLeft, settings } = get();
        if (!currentWord || !settings.hintsEnabled) return;

        // Reveal letters progressively based on time passed
        const progress = 1 - (timeLeft / settings.roundTime);
        const lettersToReveal = Math.floor(currentWord.length * progress * 0.5);

        const hintArray = wordHint.split(' ');
        const wordArray = currentWord.split('');
        let revealed = 0;

        for (let i = 0; i < wordArray.length && revealed < lettersToReveal; i++) {
            if (hintArray[i] === '_' && Math.random() > 0.5) {
                hintArray[i] = wordArray[i].toUpperCase();
                revealed++;
            }
        }

        set({ wordHint: hintArray.join(' ') });
    },

    addMessage: (playerId, playerName, message, type = 'chat') => {
        set(state => ({
            messages: [...state.messages.slice(-50), {
                id: Date.now(),
                playerId,
                playerName,
                message,
                type, // 'chat', 'system', 'correct'
                timestamp: Date.now()
            }]
        }));
    },

    submitGuess: (playerId, playerName, guess) => {
        const { currentWord, correctGuessers, timeLeft, settings, scores, currentDrawerId } = get();

        // Drawer can't guess
        if (playerId === currentDrawerId) {
            return { correct: false, isDrawer: true };
        }

        // Already guessed correctly
        if (correctGuessers.includes(playerId)) {
            return { correct: false, alreadyGuessed: true };
        }

        const guessLower = guess.toLowerCase().trim();
        const wordLower = currentWord.toLowerCase().trim();
        const isCorrect = guessLower === wordLower;

        // Add to guesses/chat
        get().addMessage(playerId, playerName, isCorrect ? '🎉 Guessed correctly!' : guess, isCorrect ? 'correct' : 'chat');

        if (isCorrect) {
            // Calculate points based on time remaining
            const basePoints = 100;
            const timeBonus = Math.floor((timeLeft / settings.roundTime) * 50);
            const orderBonus = Math.max(0, 30 - (correctGuessers.length * 10));
            const points = basePoints + timeBonus + orderBonus;

            set(state => ({
                correctGuessers: [...state.correctGuessers, playerId],
                scores: {
                    ...state.scores,
                    [playerId]: (state.scores[playerId] || 0) + points
                },
                roundScores: {
                    ...state.roundScores,
                    [playerId]: points
                }
            }));

            // Give drawer points too
            const drawerPoints = 10 + (correctGuessers.length === 0 ? 15 : 0); // Bonus for first guesser
            set(state => ({
                scores: {
                    ...state.scores,
                    [currentDrawerId]: (state.scores[currentDrawerId] || 0) + drawerPoints
                }
            }));

            return { correct: true, points };
        }

        // Check if guess is close (for hint)
        const isClose = wordLower.includes(guessLower) || guessLower.includes(wordLower);
        return { correct: false, isClose };
    },

    updateTimeLeft: (time) => set({ timeLeft: time }),

    endTurn: () => {
        const { currentRound, currentTurn, totalRounds, players } = get();
        const turnsPerRound = players.length;
        const nextTurn = currentTurn + 1;

        // Check if round is complete (all players have drawn)
        if (nextTurn >= turnsPerRound * currentRound) {
            // Check if game is complete
            if (currentRound >= totalRounds) {
                set({ gameStatus: 'gameEnd' });
            } else {
                set({
                    gameStatus: 'roundEnd',
                    currentRound: currentRound + 1
                });
            }
        } else {
            // Continue to next turn
            set({ currentTurn: nextTurn });
            get().startNewTurn();
        }
    },

    nextRound: () => {
        const { currentTurn } = get();
        set({ gameStatus: 'playing' });
        get().startNewTurn();
    },

    getWinner: () => {
        const { scores, players } = get();
        let maxScore = -1;
        let winnerId = null;

        Object.entries(scores).forEach(([id, score]) => {
            if (score > maxScore) {
                maxScore = score;
                winnerId = id;
            }
        });

        const winner = players.find(p => p.id === winnerId);
        return { ...winner, score: maxScore };
    },

    getLeaderboard: () => {
        const { scores, players } = get();
        return players
            .map(p => ({ ...p, score: scores[p.id] || 0 }))
            .sort((a, b) => b.score - a.score);
    },

    isCurrentDrawer: () => {
        const { currentDrawerId, localPlayerId } = get();
        return currentDrawerId === localPlayerId;
    },

    clearCanvas: () => {
        // Signal to clear the game canvas
        window.dispatchEvent(new Event('clearGameCanvas'));
    },

    restartGame: () => {
        const { players } = get();
        set({
            gameStatus: 'lobby',
            currentRound: 0,
            currentTurn: 0,
            scores: players.reduce((acc, p) => ({ ...acc, [p.id]: 0 }), {}),
            currentWord: null,
            wordHint: '',
            guesses: [],
            correctGuessers: [],
            usedWords: [],
            messages: []
        });
    },

    quitGame: () => {
        set({
            isGameMode: false,
            gameStatus: 'idle',
            gameCode: null,
            isHost: false,
            players: [],
            hostId: null,
            localPlayerId: null,
            currentDrawerId: null,
            currentRound: 0,
            currentTurn: 0,
            currentWord: null,
            wordHint: '',
            timeLeft: 60,
            scores: {},
            guesses: [],
            correctGuessers: [],
            usedWords: [],
            messages: [],
            settings: {
                maxPlayers: 8,
                roundTime: 60,
                difficulty: 'medium',
                totalRounds: 3,
                customWords: [],
                hintsEnabled: true
            }
        });
    },

    // Sync state from server
    syncGameState: (state) => set(state)
}));

export default useGameStore;
