import { useRef, useEffect, useState, useCallback } from 'react';
import socketService from '../../services/socket';
import './Canvas.css';

const Canvas = ({
  tool,
  color,
  brushSize,
  history,
  historyIndex,
  setHistory,
  setHistoryIndex,
  remoteCursors = {},
  isInRoom = false,
  showGrid = true,
  onStickyAdd
}) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  const [shapeStart, setShapeStart] = useState(null);
  const [tempCanvas, setTempCanvas] = useState(null);
  const historyIndexRef = useRef(historyIndex);
  const hasInitialized = useRef(false);

  // Shape tools that need special handling
  const shapeTools = ['line', 'rectangle', 'circle', 'arrow'];
  const isShapeTool = shapeTools.includes(tool);

  // Keep ref in sync
  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  // Save canvas state to history
  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const imageData = canvas.toDataURL();

      setHistory(prev => {
        const newHistory = prev.slice(0, historyIndexRef.current + 1);
        newHistory.push(imageData);
        if (newHistory.length > 50) {
          newHistory.shift();
        }
        return newHistory;
      });
      setHistoryIndex(prev => Math.min(prev + 1, 49));
    } catch (err) {
      console.error('Error saving state:', err);
    }
  }, [setHistory, setHistoryIndex]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const setupCanvas = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = window.devicePixelRatio || 1;

      // Save current canvas content if already initialized
      let savedCanvas = null;
      let hadContent = false;
      if (hasInitialized.current && canvas.width > 0 && canvas.height > 0) {
        savedCanvas = document.createElement('canvas');
        savedCanvas.width = canvas.width;
        savedCanvas.height = canvas.height;
        const savedCtx = savedCanvas.getContext('2d');
        savedCtx.drawImage(canvas, 0, 0);
        hadContent = true;
      }

      // Set canvas size
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const context = canvas.getContext('2d');
      context.scale(dpr, dpr);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.imageSmoothingEnabled = true;

      // Fill with white background
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, rect.width, rect.height);

      // Restore content if we had any
      if (hadContent && savedCanvas) {
        context.drawImage(savedCanvas, 0, 0, rect.width, rect.height);
      }

      contextRef.current = context;

      // Save initial state only once
      if (!hasInitialized.current) {
        hasInitialized.current = true;
        setTimeout(saveState, 50);
      }
    };

    const timer = setTimeout(setupCanvas, 10);

    window.addEventListener('resize', setupCanvas);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', setupCanvas);
    };
  }, [saveState]);

  // Restore state from history (for undo/redo)
  useEffect(() => {
    if (history.length === 0 || historyIndex < 0) return;
    if (!history[historyIndex]) return;

    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const img = new Image();
    img.onload = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      context.clearRect(0, 0, width, height);
      context.drawImage(img, 0, 0, width, height);
    };
    img.src = history[historyIndex];
  }, [historyIndex, history]);

  // Get position from event
  const getPosition = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);

  // Draw shapes
  const drawShape = useCallback((context, startX, startY, endX, endY, shapeType, strokeColor, strokeWidth) => {
    context.strokeStyle = strokeColor;
    context.lineWidth = strokeWidth;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    context.beginPath();

    switch (shapeType) {
      case 'line':
        context.moveTo(startX, startY);
        context.lineTo(endX, endY);
        break;

      case 'rectangle':
        const width = endX - startX;
        const height = endY - startY;
        context.strokeRect(startX, startY, width, height);
        return; // strokeRect doesn't need stroke()

      case 'circle':
        const radiusX = Math.abs(endX - startX) / 2;
        const radiusY = Math.abs(endY - startY) / 2;
        const centerX = startX + (endX - startX) / 2;
        const centerY = startY + (endY - startY) / 2;
        context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        break;

      case 'arrow':
        // Draw line
        context.moveTo(startX, startY);
        context.lineTo(endX, endY);
        context.stroke();

        // Draw arrowhead
        const angle = Math.atan2(endY - startY, endX - startX);
        const headLength = Math.min(20, Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)) / 3);

        context.beginPath();
        context.moveTo(endX, endY);
        context.lineTo(
          endX - headLength * Math.cos(angle - Math.PI / 6),
          endY - headLength * Math.sin(angle - Math.PI / 6)
        );
        context.moveTo(endX, endY);
        context.lineTo(
          endX - headLength * Math.cos(angle + Math.PI / 6),
          endY - headLength * Math.sin(angle + Math.PI / 6)
        );
        break;

      default:
        return;
    }

    context.stroke();
  }, []);

  // Draw on canvas (used for both local and remote freehand)
  const drawOnCanvas = useCallback((fromX, fromY, toX, toY, drawColor, drawSize, drawTool) => {
    const context = contextRef.current;
    if (!context) return;

    if (drawTool === 'eraser') {
      context.globalCompositeOperation = 'destination-out';
      context.strokeStyle = 'rgba(0,0,0,1)';
      context.lineWidth = drawSize * 2;
    } else {
      context.globalCompositeOperation = 'source-over';
      context.strokeStyle = drawColor;
      context.lineWidth = drawSize;
    }

    context.beginPath();
    context.moveTo(fromX, fromY);

    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;
    context.quadraticCurveTo(fromX, fromY, midX, midY);

    context.stroke();
    context.globalCompositeOperation = 'source-over';
  }, []);

  // Start drawing
  const startDrawing = useCallback((e) => {
    e.preventDefault();
    const context = contextRef.current;
    const canvas = canvasRef.current;
    if (!context || !canvas) return;

    const pos = getPosition(e);

    // Handle sticky note tool
    if (tool === 'sticky' && onStickyAdd) {
      onStickyAdd(pos.x, pos.y);
      return;
    }

    // Skip drawing for non-drawing tools
    if (tool === 'laser' || tool === 'text') {
      return;
    }

    setIsDrawing(true);
    setLastPosition(pos);

    // For shape tools, save current canvas state
    if (isShapeTool) {
      const dpr = window.devicePixelRatio || 1;
      const temp = document.createElement('canvas');
      temp.width = canvas.width;
      temp.height = canvas.height;
      const tempCtx = temp.getContext('2d');
      tempCtx.drawImage(canvas, 0, 0);
      setTempCanvas(temp);
      setShapeStart(pos);
    } else {
      // Configure context for freehand drawing
      if (tool === 'eraser') {
        context.globalCompositeOperation = 'destination-out';
        context.strokeStyle = 'rgba(0,0,0,1)';
        context.lineWidth = brushSize * 2;
      } else {
        context.globalCompositeOperation = 'source-over';
        context.strokeStyle = color;
        context.lineWidth = brushSize;
      }

      // Draw a dot for single clicks
      context.beginPath();
      context.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
      if (tool !== 'eraser') {
        context.fillStyle = color;
        context.fill();
      }

      // Emit to server if in room
      if (isInRoom) {
        socketService.emitDraw({
          fromX: pos.x,
          fromY: pos.y,
          toX: pos.x,
          toY: pos.y,
          color,
          size: brushSize,
          tool,
          isStart: true
        });
      }
    }
  }, [tool, color, brushSize, getPosition, isInRoom, isShapeTool, onStickyAdd]);

  // Draw (during mouse move)
  const draw = useCallback((e) => {
    if (!isDrawing) return;
    e.preventDefault();

    const context = contextRef.current;
    const canvas = canvasRef.current;
    if (!context || !canvas) return;

    const pos = getPosition(e);
    const dpr = window.devicePixelRatio || 1;

    if (isShapeTool && shapeStart && tempCanvas) {
      // For shapes, restore original and draw preview
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      context.clearRect(0, 0, width, height);
      context.drawImage(tempCanvas, 0, 0, width, height);

      // Draw shape preview
      drawShape(context, shapeStart.x, shapeStart.y, pos.x, pos.y, tool, color, brushSize);
    } else {
      // Freehand drawing
      context.beginPath();
      context.moveTo(lastPosition.x, lastPosition.y);

      const midX = (lastPosition.x + pos.x) / 2;
      const midY = (lastPosition.y + pos.y) / 2;
      context.quadraticCurveTo(lastPosition.x, lastPosition.y, midX, midY);

      context.stroke();

      // Emit to server if in room
      if (isInRoom) {
        socketService.emitDraw({
          fromX: lastPosition.x,
          fromY: lastPosition.y,
          toX: pos.x,
          toY: pos.y,
          color,
          size: brushSize,
          tool
        });

        socketService.emitCursorMove({ x: pos.x, y: pos.y });
      }

      setLastPosition(pos);
    }
  }, [isDrawing, lastPosition, getPosition, isInRoom, color, brushSize, tool, isShapeTool, shapeStart, tempCanvas, drawShape]);

  // Stop drawing
  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      const context = contextRef.current;
      if (context) {
        context.globalCompositeOperation = 'source-over';
      }

      setIsDrawing(false);
      setShapeStart(null);
      setTempCanvas(null);
      saveState();

      // Emit stroke end
      if (isInRoom) {
        socketService.emitStrokeEnd();
      }
    }
  }, [isDrawing, saveState, isInRoom]);

  // Handle mouse move for cursor tracking (when not drawing)
  const handleMouseMove = useCallback((e) => {
    if (isDrawing) {
      draw(e);
    } else if (isInRoom) {
      const pos = getPosition(e);
      socketService.emitCursorMove({ x: pos.x, y: pos.y });
    }
  }, [isDrawing, draw, isInRoom, getPosition]);

  // Handle remote draw events
  useEffect(() => {
    const handleRemoteDraw = (e) => {
      const data = e.detail;
      drawOnCanvas(data.fromX, data.fromY, data.toX, data.toY, data.color, data.size, data.tool);
    };

    window.addEventListener('remoteDraw', handleRemoteDraw);
    return () => window.removeEventListener('remoteDraw', handleRemoteDraw);
  }, [drawOnCanvas]);

  // Clear canvas event handler
  useEffect(() => {
    const handleClear = () => {
      const canvas = canvasRef.current;
      const context = contextRef.current;
      if (!canvas || !context) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      saveState();
    };

    window.addEventListener('clearCanvas', handleClear);
    return () => window.removeEventListener('clearCanvas', handleClear);
  }, [saveState]);

  // Get cursor style based on tool
  const getCursorStyle = () => {
    if (tool === 'eraser') return 'cell';
    if (tool === 'text') return 'text';
    if (tool === 'laser') return 'pointer';
    if (tool === 'sticky') return 'copy';
    return 'crosshair';
  };

  return (
    <div className="canvas-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        style={{ cursor: getCursorStyle() }}
        onMouseDown={startDrawing}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      {showGrid && <div className="canvas-grid" />}

      {/* Remote Cursors */}
      {Object.entries(remoteCursors).map(([id, cursor]) => (
        <div
          key={id}
          className="remote-cursor"
          style={{
            left: cursor.x,
            top: cursor.y,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"
              fill="var(--primary-500)"
              stroke="white"
              strokeWidth="1.5"
            />
          </svg>
          <span className="cursor-name">{cursor.name}</span>
        </div>
      ))}

      {/* Tool Indicator */}
      {isShapeTool && isDrawing && shapeStart && (
        <div className="shape-indicator">
          Drawing {tool}...
        </div>
      )}
    </div>
  );
};

export default Canvas;
