const API_URL = 'http://localhost:3001/api';

class AuthService {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
    }

    // Get stored token
    getToken() {
        return this.token;
    }

    // Get stored user
    getUser() {
        return this.user;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    // Make authenticated request
    async fetchWithAuth(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${API_URL}${url}`, {
            ...options,
            headers,
            credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.errors?.[0] || 'Request failed');
        }

        return data;
    }

    // Register new user
    async register(name, email, password) {
        const data = await this.fetchWithAuth('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });

        if (data.success) {
            this.token = data.token;
            this.user = data.user;
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }

        return data;
    }

    // Login user
    async login(email, password) {
        const data = await this.fetchWithAuth('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (data.success) {
            this.token = data.token;
            this.user = data.user;
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }

        return data;
    }

    // Logout user
    async logout() {
        try {
            await this.fetchWithAuth('/auth/logout', { method: 'POST' });
        } catch (err) {
            // Ignore errors on logout
        }

        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }

    // Get current user profile
    async getProfile() {
        const data = await this.fetchWithAuth('/auth/me');

        if (data.success) {
            this.user = data.user;
            localStorage.setItem('user', JSON.stringify(data.user));
        }

        return data;
    }

    // Update profile
    async updateProfile(updates) {
        const data = await this.fetchWithAuth('/auth/me', {
            method: 'PUT',
            body: JSON.stringify(updates)
        });

        if (data.success) {
            this.user = data.user;
            localStorage.setItem('user', JSON.stringify(data.user));
        }

        return data;
    }

    // Change password
    async changePassword(currentPassword, newPassword) {
        return await this.fetchWithAuth('/auth/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });
    }

    // Refresh user data
    async refresh() {
        if (!this.token) return null;

        try {
            const data = await this.getProfile();
            return data.user;
        } catch (err) {
            // Token invalid, clear auth
            this.logout();
            return null;
        }
    }
}

// Singleton instance
export const authService = new AuthService();
export default authService;
