import { Icons } from '../Icons';
import './PermissionsBadge.css';

const PermissionsBadge = ({ role, canChangeRole, onRoleChange }) => {
    const isEditor = role === 'editor';

    return (
        <div className={`permissions-badge ${role}`}>
            {isEditor ? (
                <>
                    <Icons.Pen size={12} />
                    <span>Editor</span>
                </>
            ) : (
                <>
                    <Icons.Zap size={12} />
                    <span>Viewer</span>
                </>
            )}

            {canChangeRole && (
                <button
                    className="role-toggle"
                    onClick={() => onRoleChange?.(isEditor ? 'viewer' : 'editor')}
                    title={`Switch to ${isEditor ? 'viewer' : 'editor'}`}
                >
                    <Icons.Sync size={10} />
                </button>
            )}
        </div>
    );
};

export default PermissionsBadge;
