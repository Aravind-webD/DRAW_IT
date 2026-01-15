import { useState } from 'react';
import { Icons } from '../Icons';
import useRoomStore from '../../store/roomStore';
import socketService from '../../services/socket';
import './RoomInfo.css';

const RoomInfo = () => {
    const [showParticipants, setShowParticipants] = useState(false);
    const [copied, setCopied] = useState(false);

    const { roomCode, participants, isHost, userName, leaveRoom, isInRoom } = useRoomStore();

    if (!isInRoom) return null;

    const copyRoomCode = async () => {
        if (!roomCode) return;

        try {
            await navigator.clipboard.writeText(roomCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleLeaveRoom = () => {
        socketService.leaveRoom();
        leaveRoom();
    };

    return (
        <div className="room-info">
            {/* Room Code Badge */}
            {roomCode && (
                <button className="room-code-badge" onClick={copyRoomCode} title="Click to copy room code">
                    <Icons.Home size={14} />
                    <span className="room-code-text">{roomCode}</span>
                    {copied ? <Icons.Check size={14} /> : <Icons.Copy size={14} />}
                </button>
            )}

            {/* Participants Button */}
            <button
                className="participants-btn"
                onClick={() => setShowParticipants(!showParticipants)}
                title="View participants"
            >
                <Icons.Users size={16} />
                <span className="participants-count">{participants.length}</span>
            </button>

            {/* Participants Dropdown */}
            {showParticipants && (
                <div className="participants-dropdown">
                    <div className="dropdown-header">
                        <span>Participants</span>
                        <button className="close-btn" onClick={() => setShowParticipants(false)}>
                            <Icons.X size={16} />
                        </button>
                    </div>
                    <div className="participants-list">
                        {participants.map((p) => (
                            <div key={p.id} className="participant-item">
                                <div className="participant-avatar">
                                    {p.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="participant-info">
                                    <span className="participant-name">
                                        {p.name}
                                        {p.id === 'local' || p.name === userName ? ' (You)' : ''}
                                    </span>
                                    {p.isHost && (
                                        <span className="host-badge">
                                            <Icons.Star size={10} />
                                            Host
                                        </span>
                                    )}
                                </div>
                                <span className="participant-status online" />
                            </div>
                        ))}
                    </div>

                    {/* Leave Button */}
                    <button className="leave-btn" onClick={handleLeaveRoom}>
                        <Icons.LogOut size={16} />
                        <span>Leave Room</span>
                    </button>
                </div>
            )}

            {/* User Badge */}
            <div className="user-badge">
                <div className="user-avatar">
                    {userName.charAt(0).toUpperCase()}
                </div>
                <span className="user-name">{userName}</span>
                {isHost && <Icons.Star size={12} className="host-star" />}
            </div>
        </div>
    );
};

export default RoomInfo;
