import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false  // Don't include password in queries by default
    },
    avatar: {
        type: String,
        default: null
    },
    avatarColor: {
        type: String,
        default: '#8b5cf6'  // Default purple
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    // Stats
    stats: {
        roomsCreated: { type: Number, default: 0 },
        roomsJoined: { type: Number, default: 0 },
        drawingTime: { type: Number, default: 0 }  // in minutes
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Generate random avatar color based on name
userSchema.pre('save', function (next) {
    if (this.isNew && !this.avatarColor) {
        const colors = ['#8b5cf6', '#06b6d4', '#22c55e', '#f97316', '#ec4899', '#3b82f6'];
        const index = this.name.charCodeAt(0) % colors.length;
        this.avatarColor = colors[index];
    }
    next();
});

// Update last active
userSchema.methods.updateLastActive = function () {
    this.lastActive = new Date();
    return this.save({ validateBeforeSave: false });
};

// Get public profile (exclude sensitive data)
userSchema.methods.toPublicJSON = function () {
    return {
        id: this._id,
        name: this.name,
        email: this.email,
        avatar: this.avatar,
        avatarColor: this.avatarColor,
        stats: this.stats,
        createdAt: this.createdAt
    };
};

const User = mongoose.model('User', userSchema);

export default User;
