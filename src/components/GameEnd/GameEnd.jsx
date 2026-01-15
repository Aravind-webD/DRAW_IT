import { useState, useEffect } from 'react';
import { Icons } from '../Icons';
import useGameStore from '../../store/gameStore';
import socketService from '../../services/socket';
import './GameEnd.css';

// Confetti particle
const Confetti = ({ delay }) => {
    const colors = ['#8b5cf6', '#06b6d4', '#22c55e', '#f97316', '#ec4899', '#eab308'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const animationDuration = 2 + Math.random() * 2;
    const size = 8 + Math.random() * 8;

    return (
        <div
            className="confetti"
            style={{
                '--left': `${left}%`,
                '--color': color,
                '--delay': `${delay}s`,
                '--duration': `${animationDuration}s`,
                '--size': `${size}px`
            }}
        />
    );
};

const GameEnd = ({ onPlayAgain, onQuit }) => {
    const [showConfetti, setShowConfetti] = useState(true);

    const { players, scores, syncGameState } = useGameStore();

    // Setup socket event listeners
    useEffect(() => {
        const socket = socketService.socket;
        if (!socket) return;

        // Game restarted
        const handleRestarted = ({ gameState }) => {
            syncGameState(gameState);
        };

        socket.on('game:restarted', handleRestarted);

        return () => {
            socket.off('game:restarted', handleRestarted);
        };
    }, [syncGameState]);

    useEffect(() => {
        // Stop confetti after 5 seconds
        const timer = setTimeout(() => setShowConfetti(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    const getLeaderboard = () => {
        return players
            .map(p => ({ ...p, score: scores[p.id] || 0 }))
            .sort((a, b) => b.score - a.score);
    };

    const leaderboard = getLeaderboard();
    const winner = leaderboard[0] || null;

    const getMedal = (index) => {
        if (index === 0) return '🥇';
        if (index === 1) return '🥈';
        if (index === 2) return '🥉';
        return `#${index + 1}`;
    };

    const handlePlayAgain = () => {
        socketService.playAgain();
        onPlayAgain?.();
    };

    const handleQuit = () => {
        socketService.leaveGame();
        onQuit?.();
    };

    return (
        <div className="game-end-overlay">
            {/* Confetti */}
            {showConfetti && (
                <div className="confetti-container">
                    {Array.from({ length: 50 }).map((_, i) => (
                        <Confetti key={i} delay={i * 0.1} />
                    ))}
                </div>
            )}

            <div className="game-end-modal">
                {/* Winner Section */}
                <div className="winner-section">
                    <div className="winner-crown">👑</div>
                    <div className="winner-trophy">
                        <div className="trophy-glow"></div>
                        🏆
                    </div>
                    <h1 className="winner-title">Winner!</h1>
                    <div className="winner-name">{winner?.name || 'Unknown'}</div>
                    <div className="winner-score">
                        <Icons.Star size={24} />
                        <span>{winner?.score || 0} points</span>
                    </div>
                </div>

                {/* Final Leaderboard */}
                <div className="final-leaderboard">
                    <h2>
                        <Icons.Star size={20} />
                        <span>Final Standings</span>
                    </h2>
                    <div className="standings-list">
                        {leaderboard.map((player, index) => (
                            <div
                                key={player.id}
                                className={`standing-item ${index === 0 ? 'winner' : ''}`}
                            >
                                <span className="standing-rank">{getMedal(index)}</span>
                                <div className="standing-player">
                                    <div
                                        className="standing-avatar"
                                        style={{ background: player.color || `hsl(${(index * 45) % 360}, 70%, 60%)` }}
                                    >
                                        {player.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="standing-name">{player.name}</span>
                                </div>
                                <span className="standing-score">{player.score}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="game-end-actions">
                    <button className="action-btn restart" onClick={handlePlayAgain}>
                        <Icons.Sync size={20} />
                        <span>Play Again</span>
                    </button>
                    <button className="action-btn quit" onClick={handleQuit}>
                        <Icons.LogOut size={20} />
                        <span>Quit to Menu</span>
                    </button>
                </div>

                {/* Decorative sparkles */}
                <div className="sparkles">
                    <div className="sparkle s1">✨</div>
                    <div className="sparkle s2">⭐</div>
                    <div className="sparkle s3">✨</div>
                    <div className="sparkle s4">⭐</div>
                </div>
            </div>
        </div>
    );
};

export default GameEnd;
