import { create } from 'zustand';

const useRoomStore = create((set, get) => ({
    // Room state
    roomCode: null,
    isHost: false,
    participants: [],
    isConnected: false,
    isInRoom: false,
    userName: '',

    // UI state
    showWelcomeModal: true,
    showJoinModal: false,
    connectionError: null,
    isLoading: false,

    // Actions
    setRoomCode: (code) => set({ roomCode: code }),
    setIsHost: (isHost) => set({ isHost }),
    setParticipants: (participants) => set({ participants }),
    setIsConnected: (connected) => set({ isConnected: connected }),
    setUserName: (name) => set({ userName: name }),

    joinRoom: (roomCode, participants, isHost = false) => set({
        roomCode,
        participants,
        isHost,
        isInRoom: true,
        showWelcomeModal: false,
        showJoinModal: false,
        isLoading: false,
    }),

    leaveRoom: () => set({
        roomCode: null,
        isHost: false,
        participants: [],
        isInRoom: false,
        showWelcomeModal: true,
    }),

    updateParticipants: (participants) => set({ participants }),

    setShowWelcomeModal: (show) => set({ showWelcomeModal: show }),
    setShowJoinModal: (show) => set({ showJoinModal: show }),
    setConnectionError: (error) => set({ connectionError: error, isLoading: false }),
    setIsLoading: (loading) => set({ isLoading: loading }),
    clearError: () => set({ connectionError: null }),

    // Start local mode (no server)
    startLocalMode: (userName) => set({
        userName,
        isInRoom: true,
        showWelcomeModal: false,
        showJoinModal: false,
        roomCode: null,
        isHost: true,
        participants: [{ id: 'local', name: userName, isHost: true }],
    }),
}));

export default useRoomStore;
