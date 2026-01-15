import { useState, useRef, useEffect } from 'react';
import { Icons } from '../Icons';
import './StickyNote.css';

const COLORS = [
    { bg: '#fef3c7', border: '#fbbf24' }, // Yellow
    { bg: '#dcfce7', border: '#22c55e' }, // Green
    { bg: '#dbeafe', border: '#3b82f6' }, // Blue
    { bg: '#fce7f3', border: '#ec4899' }, // Pink
    { bg: '#f3e8ff', border: '#a855f7' }, // Purple
    { bg: '#fed7aa', border: '#f97316' }, // Orange
];

const StickyNote = ({
    id,
    x,
    y,
    text,
    colorIndex = 0,
    author,
    createdAt,
    isEditing,
    onUpdate,
    onDelete,
    onDragEnd,
    canEdit = true
}) => {
    const [content, setContent] = useState(text || '');
    const [isDragging, setIsDragging] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isEditMode, setIsEditMode] = useState(isEditing);
    const noteRef = useRef(null);
    const textareaRef = useRef(null);
    const dragOffset = useRef({ x: 0, y: 0 });

    const colors = COLORS[colorIndex % COLORS.length];

    useEffect(() => {
        if (isEditMode && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isEditMode]);

    const handleMouseDown = (e) => {
        if (e.target.tagName === 'TEXTAREA' || e.target.closest('.note-menu')) return;
        if (!canEdit) return;

        e.preventDefault();
        setIsDragging(true);

        const rect = noteRef.current.getBoundingClientRect();
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
        if (!isDragging || !noteRef.current) return;

        const container = noteRef.current.closest('.canvas-container');
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const newX = e.clientX - containerRect.left - dragOffset.current.x;
        const newY = e.clientY - containerRect.top - dragOffset.current.y;

        noteRef.current.style.left = `${Math.max(0, newX)}px`;
        noteRef.current.style.top = `${Math.max(0, newY)}px`;
    };

    const handleMouseUp = (e) => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);

        if (noteRef.current && onDragEnd) {
            const left = parseInt(noteRef.current.style.left) || x;
            const top = parseInt(noteRef.current.style.top) || y;
            onDragEnd(id, left, top);
        }
    };

    const handleContentChange = (e) => {
        setContent(e.target.value);
    };

    const handleBlur = () => {
        setIsEditMode(false);
        if (onUpdate && content !== text) {
            onUpdate(id, { text: content });
        }
    };

    const handleDoubleClick = () => {
        if (canEdit) {
            setIsEditMode(true);
        }
    };

    const handleColorChange = (newColorIndex) => {
        if (onUpdate) {
            onUpdate(id, { colorIndex: newColorIndex });
        }
        setShowMenu(false);
    };

    const handleDelete = () => {
        if (onDelete) {
            onDelete(id);
        }
    };

    return (
        <div
            ref={noteRef}
            className={`sticky-note ${isDragging ? 'dragging' : ''} ${!canEdit ? 'readonly' : ''}`}
            style={{
                left: x,
                top: y,
                backgroundColor: colors.bg,
                borderColor: colors.border
            }}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
        >
            {/* Header */}
            <div className="note-header">
                <span className="note-author">{author || 'Anonymous'}</span>
                {canEdit && (
                    <button
                        className="note-menu-btn"
                        onClick={() => setShowMenu(!showMenu)}
                    >
                        <Icons.ChevronDown size={14} />
                    </button>
                )}
            </div>

            {/* Content */}
            {isEditMode ? (
                <textarea
                    ref={textareaRef}
                    className="note-textarea"
                    value={content}
                    onChange={handleContentChange}
                    onBlur={handleBlur}
                    placeholder="Write something..."
                />
            ) : (
                <div className="note-content">
                    {content || <span className="note-placeholder">Double-click to edit</span>}
                </div>
            )}

            {/* Menu */}
            {showMenu && (
                <div className="note-menu">
                    <div className="color-options">
                        {COLORS.map((c, i) => (
                            <button
                                key={i}
                                className={`color-option ${i === colorIndex ? 'active' : ''}`}
                                style={{ backgroundColor: c.bg, borderColor: c.border }}
                                onClick={() => handleColorChange(i)}
                            />
                        ))}
                    </div>
                    <button className="delete-btn" onClick={handleDelete}>
                        <Icons.Trash size={14} />
                        <span>Delete</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default StickyNote;
