import { useState } from 'react';
import { Icons } from '../Icons';
import './ZoomControls.css';

const ZoomControls = ({ zoom, setZoom, onFitToScreen, onResetZoom }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const zoomLevels = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];
    const minZoom = 0.25;
    const maxZoom = 3;

    const handleZoomIn = () => {
        setZoom(prev => Math.min(maxZoom, prev + 0.25));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(minZoom, prev - 0.25));
    };

    const handleZoomSelect = (level) => {
        setZoom(level);
        setIsExpanded(false);
    };

    return (
        <div className="zoom-controls">
            <button
                className="zoom-btn"
                onClick={handleZoomOut}
                disabled={zoom <= minZoom}
                title="Zoom Out"
            >
                <Icons.Minus size={16} />
            </button>

            <div className="zoom-display-wrapper">
                <button
                    className="zoom-display"
                    onClick={() => setIsExpanded(!isExpanded)}
                    title="Select zoom level"
                >
                    <span>{Math.round(zoom * 100)}%</span>
                    <Icons.ChevronDown size={12} />
                </button>

                {isExpanded && (
                    <div className="zoom-dropdown">
                        {zoomLevels.map((level) => (
                            <button
                                key={level}
                                className={`zoom-option ${zoom === level ? 'active' : ''}`}
                                onClick={() => handleZoomSelect(level)}
                            >
                                {Math.round(level * 100)}%
                            </button>
                        ))}
                        <div className="zoom-divider" />
                        <button className="zoom-option" onClick={onFitToScreen}>
                            <Icons.Zap size={14} />
                            Fit to Screen
                        </button>
                        <button className="zoom-option" onClick={onResetZoom}>
                            <Icons.Target size={14} />
                            Reset (100%)
                        </button>
                    </div>
                )}
            </div>

            <button
                className="zoom-btn"
                onClick={handleZoomIn}
                disabled={zoom >= maxZoom}
                title="Zoom In"
            >
                <Icons.Plus size={16} />
            </button>
        </div>
    );
};

export default ZoomControls;
