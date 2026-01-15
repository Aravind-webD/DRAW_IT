import { useState } from 'react';
import { Icons } from '../Icons';
import './Toolbar.css';

// Color palette
const COLORS = [
    '#1e1e1e', // Almost Black
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#ffffff', // White
];

const Toolbar = ({
    tool,
    setTool,
    color,
    setColor,
    brushSize,
    setBrushSize,
    onUndo,
    onRedo,
    onClear,
    onDownload,
    canUndo,
    canRedo,
}) => {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showToolsDropdown, setShowToolsDropdown] = useState(false);

    // Tool groups for dropdown
    const shapeTools = [
        { id: 'line', icon: Icons.Line, label: 'Line' },
        { id: 'rectangle', icon: Icons.Rectangle, label: 'Rectangle' },
        { id: 'circle', icon: Icons.Circle, label: 'Circle' },
        { id: 'arrow', icon: Icons.Arrow, label: 'Arrow' },
    ];

    const currentShapeTool = shapeTools.find(t => t.id === tool);
    const isShapeTool = !!currentShapeTool;

    return (
        <div className="toolbar">
            {/* Logo/Title */}
            <div className="toolbar-brand">
                <div className="toolbar-logo">
                    <Icons.Logo size={28} />
                </div>
                <span className="toolbar-title">DrawBoard</span>
            </div>

            {/* Divider */}
            <div className="toolbar-divider" />

            {/* Drawing Tools */}
            <div className="toolbar-group">
                <button
                    className={`toolbar-btn ${tool === 'pen' ? 'active' : ''}`}
                    onClick={() => setTool('pen')}
                    title="Pen Tool (P)"
                >
                    <Icons.Pen size={18} />
                    <span className="toolbar-btn-label">Pen</span>
                </button>
                <button
                    className={`toolbar-btn ${tool === 'eraser' ? 'active' : ''}`}
                    onClick={() => setTool('eraser')}
                    title="Eraser Tool (E)"
                >
                    <Icons.Eraser size={18} />
                    <span className="toolbar-btn-label">Eraser</span>
                </button>
            </div>

            {/* Shape Tools Dropdown */}
            <div className="toolbar-group">
                <div className="tools-dropdown-wrapper">
                    <button
                        className={`toolbar-btn ${isShapeTool ? 'active' : ''}`}
                        onClick={() => setShowToolsDropdown(!showToolsDropdown)}
                        title="Shape Tools"
                    >
                        {isShapeTool ? (
                            <currentShapeTool.icon size={18} />
                        ) : (
                            <Icons.Rectangle size={18} />
                        )}
                        <Icons.ChevronDown size={14} className="dropdown-arrow" />
                    </button>

                    {showToolsDropdown && (
                        <div className="tools-dropdown">
                            <div className="dropdown-header">Shapes</div>
                            <div className="tools-grid">
                                {shapeTools.map((shapeTool) => (
                                    <button
                                        key={shapeTool.id}
                                        className={`tool-option ${tool === shapeTool.id ? 'active' : ''}`}
                                        onClick={() => {
                                            setTool(shapeTool.id);
                                            setShowToolsDropdown(false);
                                        }}
                                        title={shapeTool.label}
                                    >
                                        <shapeTool.icon size={20} />
                                        <span>{shapeTool.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Text Tool */}
                <button
                    className={`toolbar-btn ${tool === 'text' ? 'active' : ''}`}
                    onClick={() => setTool('text')}
                    title="Text Tool (T)"
                >
                    <Icons.Text size={18} />
                </button>

                {/* Laser Pointer */}
                <button
                    className={`toolbar-btn ${tool === 'laser' ? 'active' : ''}`}
                    onClick={() => setTool('laser')}
                    title="Laser Pointer"
                >
                    <Icons.Laser size={18} />
                </button>

                {/* Sticky Note */}
                <button
                    className={`toolbar-btn ${tool === 'sticky' ? 'active' : ''}`}
                    onClick={() => setTool('sticky')}
                    title="Sticky Note (N)"
                >
                    <Icons.Sticky size={18} />
                </button>
            </div>

            {/* Divider */}
            <div className="toolbar-divider" />

            {/* Color Picker */}
            <div className="toolbar-group">
                <div className="color-picker-wrapper">
                    <button
                        className="color-btn"
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        title="Color Picker (C)"
                    >
                        <div
                            className="color-preview"
                            style={{ backgroundColor: color }}
                        />
                        <Icons.ChevronDown size={12} className="color-arrow" />
                    </button>

                    {showColorPicker && (
                        <div className="color-palette">
                            <div className="color-palette-header">
                                <Icons.Palette size={14} />
                                <span>Colors</span>
                            </div>
                            <div className="color-grid">
                                {COLORS.map((c) => (
                                    <button
                                        key={c}
                                        className={`color-swatch ${color === c ? 'active' : ''}`}
                                        style={{ backgroundColor: c }}
                                        onClick={() => {
                                            setColor(c);
                                            setShowColorPicker(false);
                                        }}
                                        title={c}
                                    />
                                ))}
                            </div>
                            <div className="color-custom">
                                <label>Custom</label>
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="color-input"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Brush Size */}
            <div className="toolbar-group brush-group">
                <div className="brush-preview" style={{
                    width: Math.min(brushSize, 20),
                    height: Math.min(brushSize, 20),
                    backgroundColor: color
                }} />
                <input
                    type="range"
                    min="1"
                    max="50"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="brush-slider"
                />
                <span className="brush-value">{brushSize}</span>
            </div>

            {/* Divider */}
            <div className="toolbar-divider" />

            {/* History */}
            <div className="toolbar-group">
                <button
                    className="toolbar-btn icon-only"
                    onClick={onUndo}
                    disabled={!canUndo}
                    title="Undo (Ctrl+Z)"
                >
                    <Icons.Undo size={18} />
                </button>
                <button
                    className="toolbar-btn icon-only"
                    onClick={onRedo}
                    disabled={!canRedo}
                    title="Redo (Ctrl+Y)"
                >
                    <Icons.Redo size={18} />
                </button>
            </div>

            {/* Spacer */}
            <div className="toolbar-spacer" />

            {/* Actions */}
            <div className="toolbar-group">
                <button
                    className="toolbar-btn danger icon-only"
                    onClick={onClear}
                    title="Clear Board"
                >
                    <Icons.Trash size={18} />
                </button>
                <button
                    className="toolbar-btn primary"
                    onClick={onDownload}
                    title="Download as PNG"
                >
                    <Icons.Download size={18} />
                    <span className="toolbar-btn-label">Export</span>
                </button>
            </div>
        </div>
    );
};

export default Toolbar;
