import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    GithubAuthProvider,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail
} from 'firebase/auth';
import firebaseConfig from '../config/firebase.config';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Auth providers
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

class FirebaseAuthService {
    constructor() {
        this.auth = auth;
        this.currentUser = null;

        // Listen for auth state changes
        onAuthStateChanged(auth, (user) => {
            this.currentUser = user;
            if (user) {
                localStorage.setItem('user', JSON.stringify(this.formatUser(user)));
            } else {
                localStorage.removeItem('user');
            }
        });
    }

    // Format user object for our app
    formatUser(user) {
        return {
            id: user.uid,
            email: user.email,
            name: user.displayName || user.email?.split('@')[0] || 'User',
            avatar: user.photoURL,
            avatarColor: this.generateAvatarColor(user.email || user.uid),
            emailVerified: user.emailVerified,
            createdAt: user.metadata?.creationTime
        };
    }

    // Generate consistent color from string
    generateAvatarColor(str) {
        const colors = [
            '#8b5cf6', '#06b6d4', '#22c55e', '#f97316',
            '#ec4899', '#3b82f6', '#eab308', '#ef4444'
        ];
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    // Get current user
    getUser() {
        const stored = localStorage.getItem('user');
        if (stored) {
            return JSON.parse(stored);
        }
        if (this.auth.currentUser) {
            return this.formatUser(this.auth.currentUser);
        }
        return null;
    }

    // Check if authenticated
    isAuthenticated() {
        return !!this.auth.currentUser;
    }

    // Get auth token for server verification
    async getToken() {
        if (this.auth.currentUser) {
            return await this.auth.currentUser.getIdToken();
        }
        return null;
    }

    // Register with email/password
    async register(email, password, name) {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);

            // Update profile with name
            if (name) {
                await updateProfile(result.user, { displayName: name });
            }

            const user = this.formatUser(result.user);
            localStorage.setItem('user', JSON.stringify(user));

            return { success: true, user };
        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error.code)
            };
        }
    }

    // Login with email/password
    async login(email, password) {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            const user = this.formatUser(result.user);
            localStorage.setItem('user', JSON.stringify(user));

            return { success: true, user };
        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error.code)
            };
        }
    }

    // Login with Google
    async loginWithGoogle() {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = this.formatUser(result.user);
            localStorage.setItem('user', JSON.stringify(user));

            return { success: true, user };
        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error.code)
            };
        }
    }

    // Login with GitHub
    async loginWithGithub() {
        try {
            const result = await signInWithPopup(auth, githubProvider);
            const user = this.formatUser(result.user);
            localStorage.setItem('user', JSON.stringify(user));

            return { success: true, user };
        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error.code)
            };
        }
    }

    // Logout
    async logout() {
        try {
            await signOut(auth);
            localStorage.removeItem('user');
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Send password reset email
    async resetPassword(email) {
        try {
            await sendPasswordResetEmail(auth, email);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error.code)
            };
        }
    }

    // Update user profile
    async updateProfile(updates) {
        try {
            if (this.auth.currentUser) {
                await updateProfile(this.auth.currentUser, updates);
                const user = this.formatUser(this.auth.currentUser);
                localStorage.setItem('user', JSON.stringify(user));
                return { success: true, user };
            }
            return { success: false, error: 'Not authenticated' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Convert Firebase error codes to user-friendly messages
    getErrorMessage(code) {
        const messages = {
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/email-already-in-use': 'Email is already registered',
            'auth/weak-password': 'Password should be at least 6 characters',
            'auth/invalid-email': 'Invalid email address',
            'auth/too-many-requests': 'Too many attempts. Please try again later',
            'auth/popup-closed-by-user': 'Sign-in popup was closed',
            'auth/operation-not-allowed': 'This sign-in method is not enabled',
            'auth/account-exists-with-different-credential': 'Account exists with different sign-in method',
            'auth/invalid-credential': 'Invalid credentials. Please try again.'
        };
        return messages[code] || 'An error occurred. Please try again.';
    }

    // Listen to auth state changes
    onAuthStateChange(callback) {
        return onAuthStateChanged(auth, (user) => {
            callback(user ? this.formatUser(user) : null);
        });
    }
}

// Singleton instance
export const firebaseAuthService = new FirebaseAuthService();
export default firebaseAuthService;
