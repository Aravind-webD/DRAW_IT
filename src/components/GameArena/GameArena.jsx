import { useState, useEffect, useRef, useCallback } from 'react';
import { Icons } from '../Icons';
import useGameStore from '../../store/gameStore';
import socketService from '../../services/socket';
import './GameArena.css';

const GameArena = ({ onQuit }) => {
    const [guess, setGuess] = useState('');
    const [currentWord, setCurrentWord] = useState(null);
    const canvasRef = useRef(null);
    const chatRef = useRef(null);

    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
    const [brushColor, setBrushColor] = useState('#1e1e1e');
    const [brushSize, setBrushSize] = useState(4);

    const {
        currentRound,
        totalRounds,
        wordHint,
        timeLeft,
        currentDrawerId,
        localPlayerId,
        players,
        scores,
        messages,
        correctGuessers,
        settings,
        gameStatus,
        syncGameState
    } = useGameStore();

    const isDrawer = currentDrawerId === localPlayerId;
    const currentDrawer = players.find(p => p.id === currentDrawerId);
    const hasGuessedCorrectly = correctGuessers.includes(localPlayerId);

    const getLeaderboard = () => {
        return players
            .map(p => ({ ...p, score: scores[p.id] || 0 }))
            .sort((a, b) => b.score - a.score);
    };

    const leaderboard = getLeaderboard();

    // Setup socket event listeners
    useEffect(() => {
        const socket = socketService.socket;
        if (!socket) return;

        // Timer update
        const handleTimer = ({ timeLeft }) => {
            useGameStore.getState().updateTimeLeft(timeLeft);
        };

        // Receive word (drawer only)
        const handleWord = ({ word }) => {
            setCurrentWord(word);
        };

        // Guess result
        const handleGuessResult = ({ gameState }) => {
            syncGameState(gameState);
        };

        // Remote drawing
        const handleDraw = (data) => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            ctx.beginPath();
            ctx.moveTo(data.lastX, data.lastY);
            ctx.lineTo(data.x, data.y);
            ctx.strokeStyle = data.color;
            ctx.lineWidth = data.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        };

        // Clear canvas
        const handleClearCanvas = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        };

        // Turn end
        const handleTurnEnd = ({ word, result, gameState }) => {
            setCurrentWord(null);
            syncGameState(gameState);
        };

        // New turn
        const handleNewTurn = ({ gameState }) => {
            setCurrentWord(null);
            // Clear canvas for new turn
            handleClearCanvas();
            syncGameState(gameState);
        };

        // Game ended
        const handleGameEnded = ({ gameState }) => {
            setCurrentWord(null);
            syncGameState(gameState);
        };

        // Game restarted
        const handleRestarted = ({ gameState }) => {
            setCurrentWord(null);
            syncGameState(gameState);
        };

        socket.on('game:timer', handleTimer);
        socket.on('game:word', handleWord);
        socket.on('game:guess-result', handleGuessResult);
        socket.on('game:draw', handleDraw);
        socket.on('game:clear-canvas', handleClearCanvas);
        socket.on('game:turn-end', handleTurnEnd);
        socket.on('game:new-turn', handleNewTurn);
        socket.on('game:ended', handleGameEnded);
        socket.on('game:restarted', handleRestarted);

        return () => {
            socket.off('game:timer', handleTimer);
            socket.off('game:word', handleWord);
            socket.off('game:guess-result', handleGuessResult);
            socket.off('game:draw', handleDraw);
            socket.off('game:clear-canvas', handleClearCanvas);
            socket.off('game:turn-end', handleTurnEnd);
            socket.off('game:new-turn', handleNewTurn);
            socket.off('game:ended', handleGameEnded);
            socket.off('game:restarted', handleRestarted);
        };
    }, [syncGameState]);

    // Auto-scroll chat
    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [messages]);

    // Clear canvas when drawer changes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }, [currentDrawerId]);

    // Setup canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resize = () => {
            const container = canvas.parentElement;
            const rect = container.getBoundingClientRect();
            const aspectRatio = 4 / 3;

            let width = rect.width - 20;
            let height = width / aspectRatio;

            if (height > rect.height - 20) {
                height = rect.height - 20;
                width = height * aspectRatio;
            }

            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
        };

        resize();
        window.addEventListener('resize', resize);

        // Fill with white
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        return () => window.removeEventListener('resize', resize);
    }, []);

    // Drawing functions
    const getCanvasPos = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }, []);

    const startDrawing = useCallback((e) => {
        if (!isDrawer) return;
        e.preventDefault();

        setIsDrawing(true);
        const pos = getCanvasPos(e);
        setLastPos(pos);
    }, [isDrawer, getCanvasPos]);

    const draw = useCallback((e) => {
        if (!isDrawing || !isDrawer) return;
        e.preventDefault();

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const pos = getCanvasPos(e);

        // Draw locally
        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Send to server
        socketService.emitGameDraw({
            lastX: lastPos.x,
            lastY: lastPos.y,
            x: pos.x,
            y: pos.y,
            color: brushColor,
            size: brushSize
        });

        setLastPos(pos);
    }, [isDrawing, isDrawer, lastPos, brushColor, brushSize, getCanvasPos]);

    const stopDrawing = useCallback(() => {
        setIsDrawing(false);
    }, []);

    const clearCanvas = useCallback(() => {
        if (!isDrawer) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Send to server
        socketService.emitGameClear();
    }, [isDrawer]);

    const handleGuessSubmit = (e) => {
        e.preventDefault();
        if (!guess.trim() || isDrawer || hasGuessedCorrectly) return;

        socketService.submitGuess(guess.trim());
        setGuess('');
    };

    const handleLeaveGame = () => {
        socketService.leaveGame();
        onQuit?.();
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getTimeColor = () => {
        if (timeLeft <= 10) return '#ef4444';
        if (timeLeft <= 20) return '#f97316';
        return '#22c55e';
    };

    const colors = ['#1e1e1e', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'];
    const sizes = [2, 4, 8, 16, 24];

    return (
        <div className="game-arena">
            {/* Top Bar */}
            <div className="arena-top-bar">
                <div className="round-info">
                    <span className="round-badge">
                        Round {currentRound}/{totalRounds}
                    </span>
                </div>

                <div className="timer" style={{ '--timer-color': getTimeColor() }}>
                    <div className="timer-circle">
                        <svg viewBox="0 0 36 36">
                            <circle
                                cx="18" cy="18" r="16"
                                fill="none"
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="2"
                            />
                            <circle
                                cx="18" cy="18" r="16"
                                fill="none"
                                stroke={getTimeColor()}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeDasharray={`${(timeLeft / (settings?.roundTime || 60)) * 100} 100`}
                                transform="rotate(-90 18 18)"
                            />
                        </svg>
                        <span className="timer-text">{formatTime(timeLeft)}</span>
                    </div>
                </div>

                <div className="drawer-info">
                    <span className="drawer-label">{isDrawer ? 'You are drawing!' : 'Drawing:'}</span>
                    <span className="drawer-name">{currentDrawer?.name || 'Unknown'}</span>
                </div>
            </div>

            {/* Word Display */}
            <div className="word-bar">
                {isDrawer ? (
                    <div className="drawer-word">
                        <span className="word-label">Your word:</span>
                        <span className="word-reveal">{currentWord || '...'}</span>
                    </div>
                ) : (
                    <div className="guesser-hint">
                        <span className="word-label">Guess the word:</span>
                        <span className="word-hint">{wordHint}</span>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="arena-content">
                {/* Canvas Area */}
                <div className="canvas-area">
                    {/* Drawing Tools - Only for drawer */}
                    {isDrawer && (
                        <div className="drawing-tools">
                            <div className="tool-group colors">
                                {colors.map(c => (
                                    <button
                                        key={c}
                                        className={`color-btn ${brushColor === c ? 'active' : ''}`}
                                        style={{ backgroundColor: c }}
                                        onClick={() => setBrushColor(c)}
                                    />
                                ))}
                            </div>
                            <div className="tool-group sizes">
                                {sizes.map(s => (
                                    <button
                                        key={s}
                                        className={`size-btn ${brushSize === s ? 'active' : ''}`}
                                        onClick={() => setBrushSize(s)}
                                    >
                                        <span style={{ width: s, height: s }} />
                                    </button>
                                ))}
                            </div>
                            <button className="clear-btn" onClick={clearCanvas}>
                                <Icons.Trash size={16} />
                                Clear
                            </button>
                        </div>
                    )}

                    {/* Canvas */}
                    <div className="canvas-container">
                        <canvas
                            ref={canvasRef}
                            className="game-canvas"
                            width={800}
                            height={600}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                        />
                        {!isDrawer && (
                            <div className="canvas-overlay">
                                <span>👀 Watch and guess!</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Side Panel */}
                <div className="side-panel">
                    {/* Leaderboard */}
                    <div className="leaderboard-panel">
                        <div className="panel-header">
                            <Icons.Star size={16} />
                            <span>Leaderboard</span>
                        </div>
                        <div className="leaderboard-list">
                            {leaderboard.map((player, index) => (
                                <div
                                    key={player.id}
                                    className={`leaderboard-item 
                                        ${index === 0 ? 'first' : ''} 
                                        ${index === 1 ? 'second' : ''} 
                                        ${index === 2 ? 'third' : ''}
                                        ${player.id === currentDrawerId ? 'drawing' : ''}
                                        ${player.id === localPlayerId ? 'you' : ''}
                                        ${correctGuessers.includes(player.id) ? 'guessed' : ''}`}
                                >
                                    <span className="rank">
                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                    </span>
                                    <span className="name">{player.name}</span>
                                    <span className="score">{player.score}</span>
                                    {player.id === currentDrawerId && <span className="drawing-icon">🎨</span>}
                                    {correctGuessers.includes(player.id) && <span className="guessed-icon">✓</span>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Chat / Guesses */}
                    <div className="chat-panel">
                        <div className="panel-header">
                            <Icons.MessageCircle size={16} />
                            <span>Chat</span>
                        </div>
                        <div className="chat-messages" ref={chatRef}>
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`chat-message ${msg.type}`}
                                >
                                    <span className="msg-name">{msg.playerName}:</span>
                                    <span className="msg-text">{msg.message}</span>
                                </div>
                            ))}
                            {messages.length === 0 && (
                                <div className="chat-empty">
                                    No messages yet...
                                </div>
                            )}
                        </div>

                        {/* Guess Input */}
                        {!isDrawer && (
                            <form className="guess-form" onSubmit={handleGuessSubmit}>
                                <input
                                    type="text"
                                    value={guess}
                                    onChange={(e) => setGuess(e.target.value)}
                                    placeholder={hasGuessedCorrectly ? "You've guessed it! 🎉" : "Type your guess..."}
                                    autoComplete="off"
                                    disabled={hasGuessedCorrectly}
                                />
                                <button type="submit" disabled={!guess.trim() || hasGuessedCorrectly}>
                                    <Icons.Send size={18} />
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            {/* Correct Guessers Notification */}
            {correctGuessers.length > 0 && (
                <div className="correct-notification">
                    <Icons.Check size={16} />
                    <span>
                        {correctGuessers.length} player{correctGuessers.length > 1 ? 's' : ''} guessed correctly!
                    </span>
                </div>
            )}

            {/* Leave Button */}
            <button className="leave-game-btn" onClick={handleLeaveGame}>
                <Icons.LogOut size={16} />
            </button>
        </div>
    );
};

export default GameArena;
