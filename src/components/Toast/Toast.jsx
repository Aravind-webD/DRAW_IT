import { useEffect, useState } from 'react';
import { Icons } from '../Icons';
import './Toast.css';

// Toast types
const TOAST_TYPES = {
    success: {
        icon: Icons.Check,
        className: 'toast-success'
    },
    error: {
        icon: Icons.AlertTriangle,
        className: 'toast-error'
    },
    info: {
        icon: Icons.Info,
        className: 'toast-info'
    },
    warning: {
        icon: Icons.AlertTriangle,
        className: 'toast-warning'
    }
};

// Individual Toast component
const ToastItem = ({ id, type = 'info', message, onClose, duration = 4000 }) => {
    const [isExiting, setIsExiting] = useState(false);
    const { icon: Icon, className } = TOAST_TYPES[type] || TOAST_TYPES.info;

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => onClose(id), 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => onClose(id), 300);
    };

    return (
        <div className={`toast ${className} ${isExiting ? 'exiting' : ''}`}>
            <div className="toast-icon">
                <Icon size={18} />
            </div>
            <span className="toast-message">{message}</span>
            <button className="toast-close" onClick={handleClose}>
                <Icons.X size={14} />
            </button>
        </div>
    );
};

// Toast Container (manages multiple toasts)
const ToastContainer = ({ toasts, removeToast }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <ToastItem
                    key={toast.id}
                    id={toast.id}
                    type={toast.type}
                    message={toast.message}
                    duration={toast.duration}
                    onClose={removeToast}
                />
            ))}
        </div>
    );
};

// Hook for managing toasts
let toastId = 0;
let addToastCallback = null;

export const useToast = () => {
    const [toasts, setToasts] = useState([]);

    const addToast = (type, message, duration = 4000) => {
        const id = ++toastId;
        setToasts(prev => [...prev, { id, type, message, duration }]);
        return id;
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    // Global toast access
    addToastCallback = addToast;

    return {
        toasts,
        addToast,
        removeToast,
        success: (msg, duration) => addToast('success', msg, duration),
        error: (msg, duration) => addToast('error', msg, duration),
        info: (msg, duration) => addToast('info', msg, duration),
        warning: (msg, duration) => addToast('warning', msg, duration),
        ToastContainer: () => <ToastContainer toasts={toasts} removeToast={removeToast} />
    };
};

// Global toast function
export const toast = {
    success: (msg, duration) => addToastCallback?.('success', msg, duration),
    error: (msg, duration) => addToastCallback?.('error', msg, duration),
    info: (msg, duration) => addToastCallback?.('info', msg, duration),
    warning: (msg, duration) => addToastCallback?.('warning', msg, duration),
};

export default ToastContainer;
