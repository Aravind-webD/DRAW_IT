import { useState } from 'react';
import { Icons } from '../Icons';
import useAuthStore from '../../store/authStore';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose, onSuccess }) => {
    const [mode, setMode] = useState('login'); // 'login' | 'register' | 'reset'
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState('');
    const [resetSent, setResetSent] = useState(false);

    const {
        login,
        register,
        loginWithGoogle,
        loginWithGithub,
        resetPassword,
        isLoading,
        error,
        clearError
    } = useAuthStore();

    const handleChange = (e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
        setLocalError('');
        clearError();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');

        if (mode === 'reset') {
            const result = await resetPassword(formData.email);
            if (result.success) {
                setResetSent(true);
            }
            return;
        }

        if (mode === 'register') {
            if (formData.password !== formData.confirmPassword) {
                setLocalError('Passwords do not match');
                return;
            }
            if (formData.name.trim().length < 2) {
                setLocalError('Name must be at least 2 characters');
                return;
            }
        }

        const result = mode === 'login'
            ? await login(formData.email, formData.password)
            : await register(formData.name, formData.email, formData.password);

        if (result.success) {
            onSuccess?.();
            onClose();
        }
    };

    const handleGoogleLogin = async () => {
        const result = await loginWithGoogle();
        if (result.success) {
            onSuccess?.();
            onClose();
        }
    };

    const handleGithubLogin = async () => {
        const result = await loginWithGithub();
        if (result.success) {
            onSuccess?.();
            onClose();
        }
    };

    const switchMode = (newMode) => {
        setMode(newMode);
        setLocalError('');
        setResetSent(false);
        clearError();
    };

    if (!isOpen) return null;

    return (
        <div className="auth-modal-overlay" onClick={onClose}>
            <div className="auth-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="auth-modal-header">
                    <div className="auth-logo">
                        <Icons.Logo size={40} />
                    </div>
                    <h2>
                        {mode === 'login' && 'Welcome Back'}
                        {mode === 'register' && 'Create Account'}
                        {mode === 'reset' && 'Reset Password'}
                    </h2>
                    <p>
                        {mode === 'login' && 'Sign in to save your boards and collaborate'}
                        {mode === 'register' && 'Join DrawBoard to unlock all features'}
                        {mode === 'reset' && 'Enter your email to receive a reset link'}
                    </p>
                    <button className="auth-close-btn" onClick={onClose}>
                        <Icons.X size={20} />
                    </button>
                </div>

                {/* Social Login Buttons */}
                {mode !== 'reset' && (
                    <div className="social-login">
                        <button
                            className="social-btn google"
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span>Continue with Google</span>
                        </button>

                        <button
                            className="social-btn github"
                            onClick={handleGithubLogin}
                            disabled={isLoading}
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                            <span>Continue with GitHub</span>
                        </button>

                        <div className="auth-divider">
                            <span>or</span>
                        </div>
                    </div>
                )}

                {/* Form */}
                <form className="auth-form" onSubmit={handleSubmit}>
                    {/* Name field (register only) */}
                    {mode === 'register' && (
                        <div className="auth-input-group">
                            <label htmlFor="name">
                                <Icons.Users size={16} />
                                <span>Name</span>
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Enter your name"
                                required
                                minLength={2}
                                maxLength={50}
                            />
                        </div>
                    )}

                    {/* Email field */}
                    <div className="auth-input-group">
                        <label htmlFor="email">
                            <Icons.Zap size={16} />
                            <span>Email</span>
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    {/* Password field (not for reset) */}
                    {mode !== 'reset' && (
                        <div className="auth-input-group">
                            <label htmlFor="password">
                                <Icons.Settings size={16} />
                                <span>Password</span>
                            </label>
                            <div className="password-input-wrapper">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Enter your password"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <Icons.X size={16} /> : <Icons.Zap size={16} />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Confirm Password (register only) */}
                    {mode === 'register' && (
                        <div className="auth-input-group">
                            <label htmlFor="confirmPassword">
                                <Icons.Check size={16} />
                                <span>Confirm Password</span>
                            </label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Confirm your password"
                                required
                                minLength={6}
                            />
                        </div>
                    )}

                    {/* Reset success message */}
                    {resetSent && (
                        <div className="auth-success">
                            <Icons.Check size={16} />
                            <span>Password reset email sent! Check your inbox.</span>
                        </div>
                    )}

                    {/* Error message */}
                    {(error || localError) && (
                        <div className="auth-error">
                            <Icons.AlertTriangle size={16} />
                            <span>{localError || error}</span>
                        </div>
                    )}

                    {/* Submit button */}
                    <button
                        type="submit"
                        className="auth-submit-btn"
                        disabled={isLoading || resetSent}
                    >
                        {isLoading ? (
                            <>
                                <Icons.Loader size={18} className="spinning" />
                                <span>
                                    {mode === 'login' && 'Signing in...'}
                                    {mode === 'register' && 'Creating account...'}
                                    {mode === 'reset' && 'Sending...'}
                                </span>
                            </>
                        ) : (
                            <>
                                {mode === 'login' && (
                                    <>
                                        <Icons.Zap size={18} />
                                        <span>Sign In</span>
                                    </>
                                )}
                                {mode === 'register' && (
                                    <>
                                        <Icons.Rocket size={18} />
                                        <span>Create Account</span>
                                    </>
                                )}
                                {mode === 'reset' && (
                                    <>
                                        <Icons.Zap size={18} />
                                        <span>Send Reset Link</span>
                                    </>
                                )}
                            </>
                        )}
                    </button>

                    {/* Forgot password link (login only) */}
                    {mode === 'login' && (
                        <button
                            type="button"
                            className="forgot-password-link"
                            onClick={() => switchMode('reset')}
                        >
                            Forgot your password?
                        </button>
                    )}
                </form>

                {/* Footer */}
                <div className="auth-footer">
                    <p>
                        {mode === 'login' && (
                            <>
                                Don't have an account?
                                <button type="button" onClick={() => switchMode('register')}>
                                    Create one
                                </button>
                            </>
                        )}
                        {mode === 'register' && (
                            <>
                                Already have an account?
                                <button type="button" onClick={() => switchMode('login')}>
                                    Sign in
                                </button>
                            </>
                        )}
                        {mode === 'reset' && (
                            <>
                                Remember your password?
                                <button type="button" onClick={() => switchMode('login')}>
                                    Back to login
                                </button>
                            </>
                        )}
                    </p>
                </div>

                {/* Features reminder */}
                <div className="auth-features">
                    <div className="auth-feature">
                        <Icons.Check size={14} />
                        <span>Save boards to cloud</span>
                    </div>
                    <div className="auth-feature">
                        <Icons.Check size={14} />
                        <span>Collaborate in real-time</span>
                    </div>
                    <div className="auth-feature">
                        <Icons.Check size={14} />
                        <span>Access from any device</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
