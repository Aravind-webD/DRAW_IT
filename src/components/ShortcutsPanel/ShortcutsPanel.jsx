import { useState, useEffect } from 'react';
import { Icons } from '../Icons';
import './ShortcutsPanel.css';

const shortcuts = [
    {
        category: 'Tools', items: [
            { keys: ['P'], description: 'Pen tool' },
            { keys: ['E'], description: 'Eraser' },
            { keys: ['L'], description: 'Line' },
            { keys: ['R'], description: 'Rectangle' },
            { keys: ['C'], description: 'Circle' },
            { keys: ['A'], description: 'Arrow' },
            { keys: ['T'], description: 'Text' },
            { keys: ['N'], description: 'Sticky Note' },
        ]
    },
    {
        category: 'Brush', items: [
            { keys: ['['], description: 'Decrease size' },
            { keys: [']'], description: 'Increase size' },
        ]
    },
    {
        category: 'Canvas', items: [
            { keys: ['Ctrl', 'Z'], description: 'Undo' },
            { keys: ['Ctrl', 'Y'], description: 'Redo' },
            { keys: ['Ctrl', 'S'], description: 'Save' },
            { keys: ['Ctrl', 'E'], description: 'Export' },
            { keys: ['Delete'], description: 'Clear selection' },
        ]
    },
    {
        category: 'View', items: [
            { keys: ['Ctrl', '+'], description: 'Zoom in' },
            { keys: ['Ctrl', '-'], description: 'Zoom out' },
            { keys: ['Ctrl', '0'], description: 'Reset zoom' },
            { keys: ['G'], description: 'Toggle grid' },
            { keys: ['?'], description: 'Show shortcuts' },
        ]
    },
];

const ShortcutsPanel = ({ isOpen, onClose }) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="shortcuts-overlay" onClick={onClose}>
            <div className="shortcuts-panel" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="shortcuts-header">
                    <div className="shortcuts-title">
                        <Icons.Settings size={24} />
                        <h2>Keyboard Shortcuts</h2>
                    </div>
                    <button className="shortcuts-close" onClick={onClose}>
                        <Icons.X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="shortcuts-content">
                    {shortcuts.map((section) => (
                        <div key={section.category} className="shortcuts-section">
                            <h3 className="section-title">{section.category}</h3>
                            <div className="shortcuts-list">
                                {section.items.map((shortcut, index) => (
                                    <div key={index} className="shortcut-item">
                                        <div className="shortcut-keys">
                                            {shortcut.keys.map((key, keyIndex) => (
                                                <span key={keyIndex}>
                                                    <kbd>{key}</kbd>
                                                    {keyIndex < shortcut.keys.length - 1 && (
                                                        <span className="key-separator">+</span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                        <span className="shortcut-desc">{shortcut.description}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="shortcuts-footer">
                    <p>Press <kbd>?</kbd> to toggle this panel</p>
                </div>
            </div>
        </div>
    );
};

export default ShortcutsPanel;
