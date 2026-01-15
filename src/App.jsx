import { useState, useCallback, useEffect, useRef } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import WelcomeModal from './components/WelcomeModal';
import RoomInfo from './components/RoomInfo';
import ZoomControls from './components/ZoomControls';
import ShortcutsPanel from './components/ShortcutsPanel';
import StickyNote from './components/StickyNote';
import GameLobby from './components/GameLobby';
import GameArena from './components/GameArena';
import GameEnd from './components/GameEnd';
import { useToast } from './components/Toast';
import socketService from './services/socket';
import useRoomStore from './store/roomStore';
import useGameStore from './store/gameStore';
import './App.css';

function App() {
  // Drawing state
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#1e1e1e');
  const [brushSize, setBrushSize] = useState(4);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Sticky notes state
  const [stickyNotes, setStickyNotes] = useState([]);

  // Canvas ref for external access
  const canvasContainerRef = useRef(null);

  // History state for undo/redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Remote cursors
  const [remoteCursors, setRemoteCursors] = useState({});

  // Toast notifications
  const { success, error, info, ToastContainer } = useToast();

  // Room store
  const {
    isInRoom,
    roomCode,
    updateParticipants,
    participants,
    showWelcomeModal
  } = useRoomStore();

  // Game store
  const {
    isGameMode,
    gameStatus,
    quitGame
  } = useGameStore();

  // Setup socket event listeners when in a room
  useEffect(() => {
    if (!isInRoom || !roomCode) return;

    const socket = socketService.socket;
    if (!socket) return;

    // Handle remote drawing
    const handleRemoteDraw = (data) => {
      window.dispatchEvent(new CustomEvent('remoteDraw', { detail: data }));
    };

    // Handle remote stroke end
    const handleRemoteStrokeEnd = (data) => {
      window.dispatchEvent(new CustomEvent('remoteStrokeEnd', { detail: data }));
    };

    // Handle remote clear
    const handleRemoteClear = () => {
      window.dispatchEvent(new Event('clearCanvas'));
      info('Canvas was cleared by another user');
    };

    // Handle user joined
    const handleUserJoined = ({ user, participants: newParticipants }) => {
      updateParticipants(newParticipants);
      success(`${user.name} joined the room`);
    };

    // Handle user left
    const handleUserLeft = ({ userName, participants: newParticipants }) => {
      updateParticipants(newParticipants);
      info(`${userName} left the room`);
    };

    // Handle cursor movement
    const handleCursorMove = (data) => {
      setRemoteCursors(prev => ({
        ...prev,
        [data.odraw]: {
          x: data.x,
          y: data.y,
          name: participants.find(p => p.id === data.odraw)?.name || 'User',
          timestamp: Date.now()
        }
      }));
    };

    // Handle host changed
    const handleHostChanged = ({ newHostName }) => {
      info(`${newHostName} is now the host`);
    };

    // Subscribe to events
    socket.on('draw', handleRemoteDraw);
    socket.on('stroke-end', handleRemoteStrokeEnd);
    socket.on('clear-canvas', handleRemoteClear);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('cursor-move', handleCursorMove);
    socket.on('host-changed', handleHostChanged);

    return () => {
      socket.off('draw', handleRemoteDraw);
      socket.off('stroke-end', handleRemoteStrokeEnd);
      socket.off('clear-canvas', handleRemoteClear);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('cursor-move', handleCursorMove);
      socket.off('host-changed', handleHostChanged);
    };
  }, [isInRoom, roomCode, updateParticipants, participants, success, info, error]);

  // Clean up stale cursors
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRemoteCursors(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(id => {
          if (now - updated[id].timestamp > 3000) {
            delete updated[id];
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Undo handler
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
    }
  }, [historyIndex]);

  // Redo handler
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
    }
  }, [historyIndex, history.length]);

  // Clear handler
  const handleClear = useCallback(() => {
    window.dispatchEvent(new Event('clearCanvas'));
    if (isInRoom && roomCode) {
      socketService.emitClearCanvas();
    }
  }, [isInRoom, roomCode]);

  // Download handler
  const handleDownload = useCallback(() => {
    const canvas = document.querySelector('.drawing-canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `drawboard-${roomCode || 'sketch'}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    success('Image exported successfully!');
  }, [roomCode, success]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
      if (e.key === 'p' && !e.ctrlKey && !e.metaKey) {
        setTool('pen');
      }
      if (e.key === 'e' && !e.ctrlKey && !e.metaKey) {
        setTool('eraser');
      }
      if (e.key === 'l' && !e.ctrlKey && !e.metaKey) {
        setTool('line');
      }
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
        setTool('rectangle');
      }
      if (e.key === 'c' && !e.ctrlKey && !e.metaKey) {
        setTool('circle');
      }
      if (e.key === 'a' && !e.ctrlKey && !e.metaKey) {
        setTool('arrow');
      }
      if (e.key === 't' && !e.ctrlKey && !e.metaKey) {
        setTool('text');
      }
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        setTool('sticky');
      }
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
        setShowGrid(prev => !prev);
      }
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        setShowShortcuts(prev => !prev);
      }
      if (e.key === '[') {
        setBrushSize(prev => Math.max(1, prev - 2));
      }
      if (e.key === ']') {
        setBrushSize(prev => Math.min(50, prev + 2));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Sticky note handlers
  const handleAddStickyNote = useCallback((x, y) => {
    const newNote = {
      id: `note-${Date.now()}`,
      x,
      y,
      text: '',
      colorIndex: Math.floor(Math.random() * 6),
      author: useRoomStore.getState().userName || 'Anonymous',
      isEditing: true,
      createdAt: new Date()
    };
    setStickyNotes(prev => [...prev, newNote]);
    setTool('pen');
  }, []);

  const handleUpdateStickyNote = useCallback((id, updates) => {
    setStickyNotes(prev => prev.map(note =>
      note.id === id ? { ...note, ...updates, isEditing: false } : note
    ));
  }, []);

  const handleDeleteStickyNote = useCallback((id) => {
    setStickyNotes(prev => prev.filter(note => note.id !== id));
  }, []);

  const handleStickyNoteDragEnd = useCallback((id, x, y) => {
    setStickyNotes(prev => prev.map(note =>
      note.id === id ? { ...note, x, y } : note
    ));
  }, []);

  // Handle quit game
  const handleQuitGame = useCallback(() => {
    quitGame();
    useRoomStore.getState().setShowWelcomeModal(true);
  }, [quitGame]);

  // Get tool display name
  const getToolName = () => {
    const toolNames = {
      pen: 'Pen',
      eraser: 'Eraser',
      line: 'Line',
      rectangle: 'Rectangle',
      circle: 'Circle',
      arrow: 'Arrow',
      text: 'Text',
      laser: 'Laser',
      sticky: 'Sticky Note'
    };
    return toolNames[tool] || 'Pen';
  };

  // Render Game Mode UI
  if (isGameMode && !showWelcomeModal) {
    if (gameStatus === 'lobby') {
      return (
        <div className="app">
          <ToastContainer />
          <GameLobby onQuit={handleQuitGame} />
        </div>
      );
    }

    if (gameStatus === 'playing' || gameStatus === 'roundEnd') {
      return (
        <div className="app">
          <ToastContainer />
          <GameArena onQuit={handleQuitGame} />
        </div>
      );
    }

    if (gameStatus === 'gameEnd') {
      return (
        <div className="app">
          <ToastContainer />
          <GameEnd onPlayAgain={() => useGameStore.getState().restartGame()} onQuit={handleQuitGame} />
        </div>
      );
    }
  }

  return (
    <div className="app">
      {/* Toast Notifications */}
      <ToastContainer />

      {/* Welcome Modal */}
      <WelcomeModal />

      {/* Main App Content - Only show when in room and not in game mode */}
      {isInRoom && !isGameMode && (
        <>
          {/* Header */}
          <header className="app-header">
            <Toolbar
              tool={tool}
              setTool={setTool}
              color={color}
              setColor={setColor}
              brushSize={brushSize}
              setBrushSize={setBrushSize}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onClear={handleClear}
              onDownload={handleDownload}
              canUndo={historyIndex > 0}
              canRedo={historyIndex < history.length - 1}
            />

            {/* Room Info - Right side */}
            <div className="header-right">
              <RoomInfo />
            </div>
          </header>

          {/* Main Canvas Area */}
          <main className="app-main">
            <Canvas
              tool={tool}
              color={color}
              brushSize={brushSize}
              history={history}
              historyIndex={historyIndex}
              setHistory={setHistory}
              setHistoryIndex={setHistoryIndex}
              remoteCursors={remoteCursors}
              isInRoom={isInRoom && !!roomCode}
              showGrid={showGrid}
              onStickyAdd={handleAddStickyNote}
            />
          </main>

          {/* Floating Status */}
          <div className="status-bar">
            <div className="status-item">
              <span className="status-label">Tool:</span>
              <span className="status-value">{getToolName()}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Size:</span>
              <span className="status-value">{brushSize}px</span>
            </div>
            <div className="status-item">
              <span className="status-label">Color:</span>
              <span className="status-color" style={{ backgroundColor: color }} />
            </div>
            {isInRoom && roomCode && (
              <div className="status-item live-badge">
                <span className="live-dot" />
                <span className="status-value">Live</span>
              </div>
            )}
          </div>

          {/* Keyboard Shortcuts Hint */}
          <div className="shortcuts-hint">
            <span><kbd>P</kbd> Pen</span>
            <span><kbd>E</kbd> Eraser</span>
            <span><kbd>L</kbd> Line</span>
            <span><kbd>R</kbd> Rect</span>
            <span><kbd>[</kbd><kbd>]</kbd> Size</span>
          </div>

          {/* Zoom Controls */}
          <div className="zoom-wrapper">
            <ZoomControls
              zoom={zoom}
              setZoom={setZoom}
              onFitToScreen={() => setZoom(1)}
              onResetZoom={() => setZoom(1)}
            />
          </div>

          {/* Sticky Notes Layer */}
          {stickyNotes.map(note => (
            <StickyNote
              key={note.id}
              {...note}
              onUpdate={handleUpdateStickyNote}
              onDelete={handleDeleteStickyNote}
              onDragEnd={handleStickyNoteDragEnd}
              canEdit={true}
            />
          ))}
        </>
      )}

      {/* Keyboard Shortcuts Panel */}
      <ShortcutsPanel
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
}

export default App;
