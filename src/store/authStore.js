import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import firebaseAuthService from '../services/firebaseAuth';

const useAuthStore = create(
    persist(
        (set, get) => ({
            // State
            user: firebaseAuthService.getUser(),
            isAuthenticated: firebaseAuthService.isAuthenticated(),
            isLoading: false,
            error: null,

            // Actions
            setUser: (user) => set({ user, isAuthenticated: !!user }),
            setLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),
            clearError: () => set({ error: null }),

            // Register with email/password
            register: async (name, email, password) => {
                set({ isLoading: true, error: null });
                const result = await firebaseAuthService.register(email, password, name);

                if (result.success) {
                    set({
                        user: result.user,
                        isAuthenticated: true,
                        isLoading: false
                    });
                } else {
                    set({ error: result.error, isLoading: false });
                }
                return result;
            },

            // Login with email/password
            login: async (email, password) => {
                set({ isLoading: true, error: null });
                const result = await firebaseAuthService.login(email, password);

                if (result.success) {
                    set({
                        user: result.user,
                        isAuthenticated: true,
                        isLoading: false
                    });
                } else {
                    set({ error: result.error, isLoading: false });
                }
                return result;
            },

            // Login with Google
            loginWithGoogle: async () => {
                set({ isLoading: true, error: null });
                const result = await firebaseAuthService.loginWithGoogle();

                if (result.success) {
                    set({
                        user: result.user,
                        isAuthenticated: true,
                        isLoading: false
                    });
                } else {
                    set({ error: result.error, isLoading: false });
                }
                return result;
            },

            // Login with GitHub
            loginWithGithub: async () => {
                set({ isLoading: true, error: null });
                const result = await firebaseAuthService.loginWithGithub();

                if (result.success) {
                    set({
                        user: result.user,
                        isAuthenticated: true,
                        isLoading: false
                    });
                } else {
                    set({ error: result.error, isLoading: false });
                }
                return result;
            },

            // Logout
            logout: async () => {
                await firebaseAuthService.logout();
                set({
                    user: null,
                    isAuthenticated: false
                });
            },

            // Reset password
            resetPassword: async (email) => {
                set({ isLoading: true, error: null });
                const result = await firebaseAuthService.resetPassword(email);
                set({ isLoading: false });

                if (!result.success) {
                    set({ error: result.error });
                }
                return result;
            },

            // Update profile
            updateProfile: async (updates) => {
                set({ isLoading: true, error: null });
                const result = await firebaseAuthService.updateProfile(updates);

                if (result.success) {
                    set({ user: result.user, isLoading: false });
                } else {
                    set({ error: result.error, isLoading: false });
                }
                return result;
            },

            // Refresh user from Firebase
            refresh: async () => {
                const user = firebaseAuthService.getUser();
                set({ user, isAuthenticated: !!user });
                return user;
            },

            // Check if guest mode
            isGuest: () => !get().isAuthenticated
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated
            })
        }
    )
);

// Listen for auth state changes from Firebase
firebaseAuthService.onAuthStateChange((user) => {
    useAuthStore.setState({
        user,
        isAuthenticated: !!user
    });
});

export default useAuthStore;
