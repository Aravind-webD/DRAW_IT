import { useRef, useEffect, useState } from 'react';
import { Icons } from '../Icons';
import './Minimap.css';

const Minimap = ({ canvasRef, viewportPosition, onNavigate }) => {
    const minimapRef = useRef(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [minimapImage, setMinimapImage] = useState(null);

    // Update minimap preview
    useEffect(() => {
        if (!canvasRef?.current || isCollapsed) return;

        const updateMinimap = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            try {
                const dataUrl = canvas.toDataURL('image/png', 0.3);
                setMinimapImage(dataUrl);
            } catch (err) {
                console.error('Minimap update error:', err);
            }
        };

        // Update every 500ms
        const interval = setInterval(updateMinimap, 500);
        updateMinimap();

        return () => clearInterval(interval);
    }, [canvasRef, isCollapsed]);

    const handleMinimapClick = (e) => {
        if (!minimapRef.current || !onNavigate) return;

        const rect = minimapRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        onNavigate({ x, y });
    };

    if (isCollapsed) {
        return (
            <button
                className="minimap-toggle collapsed"
                onClick={() => setIsCollapsed(false)}
                title="Show Minimap"
            >
                <Icons.Zap size={16} />
            </button>
        );
    }

    return (
        <div className="minimap-container">
            <div className="minimap-header">
                <span className="minimap-title">Overview</span>
                <button
                    className="minimap-close"
                    onClick={() => setIsCollapsed(true)}
                    title="Hide Minimap"
                >
                    <Icons.Minus size={14} />
                </button>
            </div>
            <div
                className="minimap-preview"
                ref={minimapRef}
                onClick={handleMinimapClick}
            >
                {minimapImage ? (
                    <img src={minimapImage} alt="Canvas preview" />
                ) : (
                    <div className="minimap-placeholder">
                        <Icons.Image size={20} />
                    </div>
                )}
                {/* Viewport indicator */}
                {viewportPosition && (
                    <div
                        className="minimap-viewport"
                        style={{
                            left: `${viewportPosition.x * 100}%`,
                            top: `${viewportPosition.y * 100}%`,
                            width: `${viewportPosition.width * 100}%`,
                            height: `${viewportPosition.height * 100}%`,
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default Minimap;
