import { useState, useEffect } from 'react';
import { Icons } from '../Icons';
import useGameStore from '../../store/gameStore';
import socketService from '../../services/socket';
import './GameLobby.css';

const GameLobby = ({ onQuit }) => {
    const [copied, setCopied] = useState(false);
    const [shareUrlCopied, setShareUrlCopied] = useState(false);

    const {
        gameCode,
        players,
        hostId,
        localPlayerId,
        settings,
        isHost,
        gameStatus,
        syncGameState
    } = useGameStore();

    const canStart = players.length >= 2;
    const shareUrl = `${window.location.origin}?join=${gameCode}`;

    // Setup socket event listeners
    useEffect(() => {
        const socket = socketService.socket;
        if (!socket) return;

        // Player joined
        const handlePlayerJoined = ({ gameState }) => {
            syncGameState(gameState);
        };

        // Player left
        const handlePlayerLeft = ({ gameState }) => {
            syncGameState(gameState);
        };

        // Player ready
        const handlePlayerReady = ({ gameState }) => {
            syncGameState(gameState);
        };

        // Game started
        const handleGameStarted = ({ gameState }) => {
            syncGameState({
                ...gameState,
                isGameMode: true
            });
        };

        // Host changed
        const handleHostChanged = ({ gameState }) => {
            syncGameState({
                ...gameState,
                isHost: gameState.hostId === localPlayerId
            });
        };

        socket.on('game:player-joined', handlePlayerJoined);
        socket.on('game:player-left', handlePlayerLeft);
        socket.on('game:player-ready', handlePlayerReady);
        socket.on('game:started', handleGameStarted);
        socket.on('game:host-changed', handleHostChanged);

        return () => {
            socket.off('game:player-joined', handlePlayerJoined);
            socket.off('game:player-left', handlePlayerLeft);
            socket.off('game:player-ready', handlePlayerReady);
            socket.off('game:started', handleGameStarted);
            socket.off('game:host-changed', handleHostChanged);
        };
    }, [localPlayerId, syncGameState]);

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(gameCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleCopyShareUrl = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setShareUrlCopied(true);
            setTimeout(() => setShareUrlCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleStartGame = async () => {
        try {
            await socketService.startGame();
        } catch (err) {
            console.error('Failed to start game:', err);
        }
    };

    const handleToggleReady = () => {
        const currentPlayer = players.find(p => p.id === localPlayerId);
        if (currentPlayer && !currentPlayer.isHost) {
            socketService.toggleReady(!currentPlayer.isReady);
        }
    };

    const handleLeaveGame = () => {
        socketService.leaveGame();
        onQuit?.();
    };

    return (
        <div className="game-lobby-container">
            <div className="game-lobby-card">
                {/* Left Panel - Players & Code */}
                <div className="lobby-left-panel">
                    {/* Compact Header with Logo */}
                    <div className="lobby-brand">
                        <div className="brand-icon">🎨</div>
                        <span className="brand-text">DrawBoard</span>
                    </div>

                    {/* Game Code - Prominent */}
                    <div className="game-code-box">
                        <div className="code-header">
                            <span className="code-label">ROOM CODE</span>
                            <div className="code-share-actions">
                                <button className="icon-btn" onClick={handleCopyCode} title="Copy code">
                                    {copied ? <Icons.Check size={14} /> : <Icons.Copy size={14} />}
                                </button>
                                <button className="icon-btn share" onClick={handleCopyShareUrl} title="Share link">
                                    <Icons.Share size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="code-value-large">{gameCode}</div>
                        {(copied || shareUrlCopied) && (
                            <span className="copy-toast">{shareUrlCopied ? 'Link copied!' : 'Code copied!'}</span>
                        )}
                    </div>

                    {/* Players Grid */}
                    <div className="players-area">
                        <div className="players-title">
                            <Icons.Users size={16} />
                            <span>Players</span>
                            <span className="player-count">{players.length}/{settings.maxPlayers}</span>
                        </div>

                        <div className="players-grid">
                            {players.map((player, index) => (
                                <div
                                    key={player.id}
                                    className={`player-card ${player.isHost ? 'host' : ''} ${player.isReady ? 'ready' : ''} ${player.id === localPlayerId ? 'you' : ''}`}
                                >
                                    <div className="player-avatar-circle" style={{
                                        background: player.color || `hsl(${(index * 60) % 360}, 65%, 55%)`
                                    }}>
                                        {player.avatar || player.name.charAt(0).toUpperCase()}
                                        {player.isHost && <span className="crown-badge">👑</span>}
                                    </div>
                                    <span className="player-card-name">{player.name}</span>
                                    <span className={`player-card-status ${player.isReady ? 'ready' : ''}`}>
                                        {player.isHost ? 'Host' : player.isReady ? '✓ Ready' : 'Waiting'}
                                    </span>
                                </div>
                            ))}

                            {/* Empty Slots */}
                            {Array.from({ length: Math.min(settings.maxPlayers - players.length, 3) }).map((_, i) => (
                                <div key={`empty-${i}`} className="player-card empty">
                                    <div className="player-avatar-circle empty">
                                        <Icons.Users size={16} />
                                    </div>
                                    <span className="player-card-name">Empty</span>
                                    <span className="player-card-status">Slot</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Panel - Settings & Actions */}
                <div className="lobby-right-panel">
                    <div className="panel-header">
                        <h2>Game Settings</h2>
                        <p>Configure your match</p>
                    </div>

                    {/* Settings Display */}
                    <div className="settings-cards">
                        <div className="setting-card">
                            <div className="setting-card-icon rounds">🎯</div>
                            <div className="setting-card-content">
                                <span className="setting-card-value">{settings.totalRounds}</span>
                                <span className="setting-card-label">Rounds</span>
                            </div>
                        </div>

                        <div className="setting-card">
                            <div className="setting-card-icon timer">⏱️</div>
                            <div className="setting-card-content">
                                <span className="setting-card-value">{settings.roundTime}s</span>
                                <span className="setting-card-label">Per Turn</span>
                            </div>
                        </div>

                        <div className="setting-card">
                            <div className="setting-card-icon difficulty">📊</div>
                            <div className="setting-card-content">
                                <span className="setting-card-value">{settings.difficulty}</span>
                                <span className="setting-card-label">Difficulty</span>
                            </div>
                        </div>
                    </div>

                    {/* Game Status */}
                    <div className="game-status-bar">
                        <div className="status-indicator">
                            <span className={`status-dot ${canStart ? 'ready' : 'waiting'}`}></span>
                            <span>{canStart ? 'Ready to start!' : `Need ${2 - players.length} more player${2 - players.length > 1 ? 's' : ''}`}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="lobby-action-buttons">
                        {isHost ? (
                            <button
                                className="action-btn start"
                                onClick={handleStartGame}
                                disabled={!canStart}
                            >
                                <span className="action-btn-icon">▶</span>
                                <span className="action-btn-text">Start Game</span>
                            </button>
                        ) : (
                            <button
                                className={`action-btn ready ${players.find(p => p.id === localPlayerId)?.isReady ? 'is-ready' : ''}`}
                                onClick={handleToggleReady}
                            >
                                <Icons.Check size={20} />
                                <span className="action-btn-text">
                                    {players.find(p => p.id === localPlayerId)?.isReady ? "You're Ready!" : 'Ready Up'}
                                </span>
                            </button>
                        )}

                        <button className="action-btn leave" onClick={handleLeaveGame}>
                            <Icons.LogOut size={18} />
                            <span className="action-btn-text">Leave</span>
                        </button>
                    </div>

                    {/* Pro Tip */}
                    <div className="lobby-pro-tip">
                        <span className="tip-icon">💡</span>
                        <span>Share the code above with friends to invite them!</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameLobby;
