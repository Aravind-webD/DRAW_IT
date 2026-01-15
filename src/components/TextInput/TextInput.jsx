import { useState, useRef, useEffect } from 'react';
import { Icons } from '../Icons';
import './TextInput.css';

const TextInput = ({ isActive, position, onSubmit, onCancel, color, fontSize = 16 }) => {
    const [text, setText] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isActive && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isActive]);

    const handleSubmit = () => {
        if (text.trim()) {
            onSubmit(text, position);
        }
        setText('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Escape') {
            onCancel();
            setText('');
        }
    };

    if (!isActive || !position) return null;

    return (
        <div
            className="text-input-container"
            style={{
                left: position.x,
                top: position.y
            }}
        >
            <textarea
                ref={inputRef}
                className="text-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSubmit}
                placeholder="Type here..."
                style={{
                    color,
                    fontSize: `${fontSize}px`
                }}
            />
            <div className="text-input-hint">
                <span>Enter to confirm</span>
                <span>Esc to cancel</span>
            </div>
        </div>
    );
};

export default TextInput;
