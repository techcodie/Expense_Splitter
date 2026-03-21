const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const groupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Group name is required'],
            trim: true,
            minlength: [2, 'Group name must be at least 2 characters'],
            maxlength: [100, 'Group name must be at most 100 characters'],
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Creator is required'],
        },
        members: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        joinCode: {
            type: String,
            unique: true,
            required: true,
        },
        password: {
            type: String,
            select: false, // Never return password by default
        },
        settlementThreshold: {
            type: Number,
            default: 0, // Stored in smallest currency unit (cents / paise)
            min: [0, 'Settlement threshold must be >= 0'],
            validate: {
                validator: Number.isInteger,
                message: 'Settlement threshold must be an integer (smallest currency unit)',
            },
        },
    },
    { timestamps: true }
);

// --------------- Pre-validate: generate joinCode ---------------
groupSchema.pre('validate', function (next) {
    if (!this.joinCode) {
        // 8-character alphanumeric code
        this.joinCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    }
    next();
});

// --------------- Pre-save: hash password if provided ---------------
groupSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// --------------- Instance method: compare password ---------------
groupSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// --------------- Strip password from JSON output ---------------
groupSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

module.exports = mongoose.model('Group', groupSchema);