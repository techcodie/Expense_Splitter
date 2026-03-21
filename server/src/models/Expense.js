const mongoose = require('mongoose');

const splitSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Split user is required'],
        },
        shareAmount: {
            type: Number,
            required: [true, 'Share amount is required'],
            min: [0, 'Share amount must be >= 0'],
            validate: {
                validator: Number.isInteger,
                message: 'Share amount must be an integer (paise)',
            },
        },
        paidAmount: {
            type: Number,
            default: 0,
            min: [0, 'Paid amount must be >= 0'],
            validate: {
                validator: Number.isInteger,
                message: 'Paid amount must be an integer (paise)',
            },
        },
    },
    { _id: true }
);

const approvalSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        vote: {
            type: String,
            enum: ['approve', 'reject'],
            required: true,
        },
    },
    { _id: false }
);

const expenseSchema = new mongoose.Schema(
    {
        group: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Group',
            required: [true, 'Group is required'],
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Creator is required'],
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
            trim: true,
            maxlength: [200, 'Description must be at most 200 characters'],
        },
        totalAmount: {
            type: Number,
            required: [true, 'Total amount is required'],
            min: [1, 'Total amount must be at least 1 paise'],
            validate: {
                validator: Number.isInteger,
                message: 'Total amount must be an integer (paise)',
            },
        },
        paidBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Paid by user is required'],
        },
        splits: {
            type: [splitSchema],
            validate: {
                validator: (arr) => arr.length > 0,
                message: 'At least one split is required',
            },
        },
        // ── Approval System ──
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        approvals: {
            type: [approvalSchema],
            default: [],
        },
        requiredApprovals: {
            type: Number,
            min: [1, 'Required approvals must be >= 1'],
            validate: {
                validator: Number.isInteger,
                message: 'Required approvals must be an integer',
            },
        },
        // ── Recurring ──
        isRecurring: {
            type: Boolean,
            default: false,
        },
        recurrence: {
            frequency: {
                type: String,
                enum: ['daily', 'weekly', 'monthly'],
            },
            interval: {
                type: Number,
                default: 1,
                min: [1, 'Recurrence interval must be >= 1'],
                validate: {
                    validator: Number.isInteger,
                    message: 'Recurrence interval must be an integer',
                },
            },
        },
    },
    { timestamps: true }
);

// Index for fast group-level queries
expenseSchema.index({ group: 1, createdAt: -1 });
expenseSchema.index({ group: 1, status: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
