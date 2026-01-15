import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        minlength: 6,
        maxlength: 6
    },
    name: {
        type: String,
        default: 'Untitled Board',
        trim: true,
        maxlength: 100
    },
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    participants: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        role: {
            type: String,
            enum: ['viewer', 'editor'],
            default: 'editor'
        }
    }],
    settings: {
        isPublic: {
            type: Boolean,
            default: false
        },
        allowAnonymous: {
            type: Boolean,
            default: true
        },
        maxParticipants: {
            type: Number,
            default: 10
        },
        defaultRole: {
            type: String,
            enum: ['viewer', 'editor'],
            default: 'editor'
        }
    },
    canvas: {
        backgroundColor: {
            type: String,
            default: '#ffffff'
        },
        width: {
            type: Number,
            default: 1920
        },
        height: {
            type: Number,
            default: 1080
        }
    },
    // Store canvas snapshot for persistence
    snapshot: {
        type: String,  // Base64 encoded image
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)  // 24 hours from creation
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries (code index is already created by unique: true)
roomSchema.index({ host: 1 });
roomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });  // TTL index

// Virtual for participant count
roomSchema.virtual('participantCount').get(function () {
    return this.participants.length;
});

// Check if user is participant
roomSchema.methods.isParticipant = function (userId) {
    return this.participants.some(p => p.user.toString() === userId.toString());
};

// Check if user is host
roomSchema.methods.isHost = function (userId) {
    return this.host.toString() === userId.toString();
};

// Add participant
roomSchema.methods.addParticipant = function (userId, role = 'editor') {
    if (!this.isParticipant(userId)) {
        this.participants.push({ user: userId, role });
    }
    return this.save();
};

// Remove participant
roomSchema.methods.removeParticipant = function (userId) {
    this.participants = this.participants.filter(
        p => p.user.toString() !== userId.toString()
    );
    return this.save();
};

// Get public room info
roomSchema.methods.toPublicJSON = function () {
    return {
        id: this._id,
        code: this.code,
        name: this.name,
        hostId: this.host,
        participantCount: this.participants.length,
        settings: this.settings,
        isActive: this.isActive,
        createdAt: this.createdAt
    };
};

const Room = mongoose.model('Room', roomSchema);

export default Room;
