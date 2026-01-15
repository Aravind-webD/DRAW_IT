import { useState, useEffect, useRef } from 'react';
import { Icons } from '../Icons';
import AuthModal from '../AuthModal';
import socketService from '../../services/socket';
import useRoomStore from '../../store/roomStore';
import useAuthStore from '../../store/authStore';
import useGameStore from '../../store/gameStore';
import './WelcomeModal.css';

// Custom Plasma Background Component
const PlasmaBackground = () => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const mouseRef = useRef({ x: 0.5, y: 0.5 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let time = 0;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const handleMouseMove = (e) => {
            mouseRef.current = {
                x: e.clientX / window.innerWidth,
                y: e.clientY / window.innerHeight
            };
        };

        resize();
        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', handleMouseMove);

        const animate = () => {
            time += 0.01;
            const { x: mx, y: my } = mouseRef.current;

            const gradient = ctx.createRadialGradient(
                canvas.width * mx, canvas.height * my, 0,
                canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.8
            );

            const hue1 = (time * 20 + mx * 60) % 360;
            const hue2 = (hue1 + 60) % 360;
            const hue3 = (hue1 + 120) % 360;

            gradient.addColorStop(0, `hsla(${hue1}, 70%, 25%, 1)`);
            gradient.addColorStop(0.3, `hsla(${hue2}, 60%, 20%, 1)`);
            gradient.addColorStop(0.6, `hsla(${hue3}, 50%, 15%, 1)`);
            gradient.addColorStop(1, `hsla(260, 40%, 8%, 1)`);

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < 5; i++) {
                const orbX = (Math.sin(time * 0.5 + i * 1.5) * 0.3 + 0.5) * canvas.width;
                const orbY = (Math.cos(time * 0.4 + i * 1.2) * 0.3 + 0.5) * canvas.height;
                const orbRadius = 100 + Math.sin(time + i) * 50;

                const orbGradient = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbRadius);
                orbGradient.addColorStop(0, `hsla(${(hue1 + i * 30) % 360}, 80%, 50%, 0.15)`);
                orbGradient.addColorStop(1, 'transparent');

                ctx.fillStyle = orbGradient;
                ctx.beginPath();
                ctx.arc(orbX, orbY, orbRadius, 0, Math.PI * 2);
                ctx.fill();
            }

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationRef.current);
        };
    }, []);

    return <canvas ref={canvasRef} className="plasma-canvas" />;
};

// Click Spark Effect Component
const ClickSparkEffect = ({ children }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const createSpark = (e) => {
            const colors = ['#8b5cf6', '#ec4899', '#6366f1', '#f59e0b', '#10b981'];
            const sparkCount = 8;

            for (let i = 0; i < sparkCount; i++) {
                const spark = document.createElement('div');
                spark.className = 'click-spark';
                spark.style.left = `${e.clientX}px`;
                spark.style.top = `${e.clientY}px`;
                spark.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

                const angle = (i / sparkCount) * Math.PI * 2;
                const distance = 30 + Math.random() * 20;
                spark.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
                spark.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);

                document.body.appendChild(spark);
                setTimeout(() => spark.remove(), 600);
            }
        };

        container.addEventListener('click', createSpark);
        return () => container.removeEventListener('click', createSpark);
    }, []);

    return <div ref={containerRef} className="spark-container">{children}</div>;
};

// Animated Gradient Text
const AnimatedGradientText = ({ children }) => {
    return <span className="animated-gradient-text">{children}</span>;
};

// Magnet Button Wrapper
const MagnetButton = ({ children, disabled, ...props }) => {
    const buttonRef = useRef(null);

    const handleMouseMove = (e) => {
        if (disabled || !buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        buttonRef.current.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
    };

    const handleMouseLeave = () => {
        if (buttonRef.current) {
            buttonRef.current.style.transform = 'translate(0, 0)';
        }
    };

    return (
        <div
            ref={buttonRef}
            className="magnet-wrapper"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            {...props}
        >
            {children}
        </div>
    );
};

const WelcomeModal = () => {
    const [userName, setUserName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [activeTab, setActiveTab] = useState('create'); // create, join, local, game-create, game-join
    const [error, setError] = useState('');
    const [showAuthModal, setShowAuthModal] = useState(false);

    const {
        showWelcomeModal,
        isLoading,
        setIsLoading,
        joinRoom,
        startLocalMode,
        setIsConnected,
        setUserName: setStoreUserName,
        isConnected
    } = useRoomStore();

    const { user, isAuthenticated, logout, loginWithGoogle } = useAuthStore();
    const { createGame, settings, updateSettings, setLocalPlayerId } = useGameStore();

    // Game settings state
    const [gameSettings, setGameSettings] = useState({
        rounds: 3,
        turnTime: 60,
        difficulty: 'medium'
    });

    useEffect(() => {
        if (isAuthenticated && user?.name && !userName) {
            setUserName(user.name);
        }
    }, [isAuthenticated, user, userName]);

    useEffect(() => {
        if (showWelcomeModal && !['local', 'game-create', 'game-join'].includes(activeTab)) {
            socketService.connect();
            const checkConnection = setInterval(() => {
                setIsConnected(socketService.connected);
            }, 500);
            return () => clearInterval(checkConnection);
        }
    }, [showWelcomeModal, activeTab, setIsConnected]);

    const handleCreateRoom = async () => {
        if (!userName.trim()) {
            setError('Please enter your name');
            return;
        }
        setError('');
        setIsLoading(true);

        try {
            if (!socketService.connected) {
                socketService.connect();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            const response = await socketService.createRoom(userName.trim(), user?.id);
            setStoreUserName(userName.trim());
            joinRoom(response.roomCode, response.participants, true);
        } catch (err) {
            setError(err.message || 'Failed to create room');
            setIsLoading(false);
        }
    };

    const handleJoinRoom = async () => {
        if (!userName.trim()) {
            setError('Please enter your name');
            return;
        }
        if (!roomCode.trim()) {
            setError('Please enter a room code');
            return;
        }
        setError('');
        setIsLoading(true);

        try {
            if (!socketService.connected) {
                socketService.connect();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            const response = await socketService.joinRoom(roomCode.trim(), userName.trim(), user?.id);
            setStoreUserName(userName.trim());
            joinRoom(response.roomCode, response.participants, response.hostId === socketService.socket?.id);
        } catch (err) {
            setError(err.message || 'Failed to join room');
            setIsLoading(false);
        }
    };

    const handleLocalMode = () => {
        if (!userName.trim()) {
            setError('Please enter your name');
            return;
        }
        startLocalMode(userName.trim());
    };

    const handleCreateGame = async () => {
        if (!userName.trim()) {
            setError('Please enter your name');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            // Connect to server
            if (!socketService.connected) {
                socketService.connect();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Create game on server
            const response = await socketService.createGame(userName.trim(), {
                totalRounds: gameSettings.rounds,
                roundTime: gameSettings.turnTime,
                difficulty: gameSettings.difficulty
            });

            // Update local state
            const playerId = socketService.socketId;
            useGameStore.getState().setLocalPlayerId(playerId);
            useGameStore.getState().updateSettings({
                totalRounds: gameSettings.rounds,
                roundTime: gameSettings.turnTime,
                difficulty: gameSettings.difficulty
            });
            useGameStore.getState().syncGameState({
                ...response.gameState,
                isGameMode: true,
                isHost: true,
                localPlayerId: playerId
            });

            setStoreUserName(userName.trim());
            useRoomStore.getState().setShowWelcomeModal(false);
            setIsLoading(false);

        } catch (err) {
            setError(err.message || 'Failed to create game');
            setIsLoading(false);
        }
    };

    const handleJoinGame = async () => {
        if (!userName.trim()) {
            setError('Please enter your name');
            return;
        }
        if (!roomCode.trim()) {
            setError('Please enter a game code');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            // Connect to server
            if (!socketService.connected) {
                socketService.connect();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Join game on server
            const response = await socketService.joinGame(roomCode.trim(), userName.trim());

            // Update local state
            const playerId = socketService.socketId;
            useGameStore.getState().setLocalPlayerId(playerId);
            useGameStore.getState().syncGameState({
                ...response.gameState,
                isGameMode: true,
                isHost: response.gameState.hostId === playerId,
                localPlayerId: playerId
            });

            setStoreUserName(userName.trim());
            useRoomStore.getState().setShowWelcomeModal(false);
            setIsLoading(false);

        } catch (err) {
            setError(err.message || 'Failed to join game');
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        setUserName('');
    };

    const handleGoogleSignIn = async () => {
        await loginWithGoogle();
    };

    const isGameMode = activeTab === 'game-create' || activeTab === 'game-join';

    if (!showWelcomeModal) return null;

    return (
        <>
            <ClickSparkEffect>
                <div className="welcome-container">
                    <PlasmaBackground />

                    <div className="fluid-glass-card">
                        {/* Card Header */}
                        <div className="card-header">
                            <div className="logo-section">
                                <div className="logo-icon">
                                    <Icons.Logo size={28} />
                                </div>
                                <span className="logo-text">DrawBoard</span>
                            </div>
                        </div>

                        {/* Title */}
                        <div className="title-section">
                            <h1>
                                {isGameMode ? (
                                    <AnimatedGradientText>Play Game</AnimatedGradientText>
                                ) : (
                                    'Get Started'
                                )}
                            </h1>
                            <p className="subtitle">
                                {isGameMode
                                    ? 'Draw, guess, and compete with friends'
                                    : 'Collaborate in real-time whiteboard'
                                }
                            </p>
                        </div>

                        {/* Mode Toggle */}
                        <div className="mode-toggle-container">
                            <div className="mode-toggle">
                                <button
                                    className={`mode-btn ${!isGameMode ? 'active' : ''}`}
                                    onClick={() => setActiveTab('create')}
                                >
                                    <Icons.Pen size={16} />
                                    Whiteboard
                                </button>
                                <button
                                    className={`mode-btn game ${isGameMode ? 'active' : ''}`}
                                    onClick={() => setActiveTab('game-create')}
                                >
                                    🎮 Game
                                </button>
                            </div>
                        </div>

                        {/* Sub-tabs */}
                        {!isGameMode ? (
                            <div className="sub-tabs">
                                {['create', 'join', 'local'].map((tab) => (
                                    <button
                                        key={tab}
                                        className={`sub-tab ${activeTab === tab ? 'active' : ''}`}
                                        onClick={() => { setActiveTab(tab); setError(''); }}
                                    >
                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="sub-tabs">
                                <button
                                    className={`sub-tab ${activeTab === 'game-create' ? 'active' : ''}`}
                                    onClick={() => { setActiveTab('game-create'); setError(''); }}
                                >
                                    🎨 Create Room
                                </button>
                                <button
                                    className={`sub-tab ${activeTab === 'game-join' ? 'active' : ''}`}
                                    onClick={() => { setActiveTab('game-join'); setError(''); }}
                                >
                                    🚀 Join Room
                                </button>
                            </div>
                        )}

                        {/* Form Fields */}
                        <div className="form-area">
                            <div className="input-field">
                                <label>YOUR NAME</label>
                                <input
                                    type="text"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    placeholder="Enter your name"
                                    maxLength={20}
                                />
                            </div>

                            {(activeTab === 'join' || activeTab === 'game-join') && (
                                <div className="input-field">
                                    <label>{activeTab === 'game-join' ? 'GAME CODE' : 'ROOM CODE'}</label>
                                    <input
                                        type="text"
                                        value={roomCode}
                                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                        placeholder="Enter code"
                                        maxLength={6}
                                        className="code-input"
                                    />
                                </div>
                            )}

                            {/* Game Settings - Only for Create Game */}
                            {activeTab === 'game-create' && (
                                <div className="game-settings">
                                    <div className="setting-row">
                                        <label>
                                            <Icons.Target size={14} />
                                            Rounds
                                        </label>
                                        <div className="setting-buttons">
                                            {[2, 3, 5, 7].map(n => (
                                                <button
                                                    key={n}
                                                    className={gameSettings.rounds === n ? 'active' : ''}
                                                    onClick={() => setGameSettings(s => ({ ...s, rounds: n }))}
                                                >
                                                    {n}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="setting-row">
                                        <label>
                                            <Icons.Zap size={14} />
                                            Turn Time
                                        </label>
                                        <div className="setting-buttons">
                                            {[30, 60, 90, 120].map(n => (
                                                <button
                                                    key={n}
                                                    className={gameSettings.turnTime === n ? 'active' : ''}
                                                    onClick={() => setGameSettings(s => ({ ...s, turnTime: n }))}
                                                >
                                                    {n}s
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="setting-row">
                                        <label>
                                            <Icons.Star size={14} />
                                            Difficulty
                                        </label>
                                        <div className="setting-buttons">
                                            {['easy', 'medium', 'hard'].map(d => (
                                                <button
                                                    key={d}
                                                    className={gameSettings.difficulty === d ? 'active' : ''}
                                                    onClick={() => setGameSettings(s => ({ ...s, difficulty: d }))}
                                                >
                                                    {d.charAt(0).toUpperCase() + d.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="error-alert">
                                    <Icons.AlertTriangle size={14} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <MagnetButton disabled={isLoading}>
                                <button
                                    className={`action-button ${isGameMode ? 'game-btn' : ''}`}
                                    onClick={
                                        activeTab === 'create' ? handleCreateRoom :
                                            activeTab === 'join' ? handleJoinRoom :
                                                activeTab === 'local' ? handleLocalMode :
                                                    activeTab === 'game-create' ? handleCreateGame :
                                                        handleJoinGame
                                    }
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Icons.Loader size={18} className="spin" />
                                    ) : (
                                        <>
                                            {activeTab === 'create' && 'Create Room'}
                                            {activeTab === 'join' && 'Join Room'}
                                            {activeTab === 'local' && 'Start Drawing'}
                                            {activeTab === 'game-create' && '🎮 Create Game'}
                                            {activeTab === 'game-join' && '🚀 Join Game'}
                                            <span className="btn-arrow">→</span>
                                        </>
                                    )}
                                </button>
                            </MagnetButton>
                        </div>

                        {/* Divider */}
                        <div className="divider-line">
                            <span>Or continue with</span>
                        </div>

                        {/* Social Login */}
                        <button className="google-btn" onClick={handleGoogleSignIn}>
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Sign in with Google
                        </button>

                        {/* Footer */}
                        <div className="card-footer">
                            {!['local', 'game-create', 'game-join'].includes(activeTab) && (
                                <div className={`connection-status ${isConnected ? 'online' : ''}`}>
                                    <div className="status-dot"></div>
                                    <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
                                </div>
                            )}

                            {isAuthenticated ? (
                                <div className="auth-status">
                                    <span>Signed in as <strong>{user?.name}</strong></span>
                                    <button onClick={handleLogout}>Logout</button>
                                </div>
                            ) : (
                                <p className="auth-link">
                                    Have an account? <button onClick={() => setShowAuthModal(true)}>Login</button>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </ClickSparkEffect>

            {/* Auth Modal */}
            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                onSuccess={() => setShowAuthModal(false)}
            />
        </>
    );
};

export default WelcomeModal;
