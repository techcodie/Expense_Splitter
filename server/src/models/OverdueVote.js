const mongoose = require('mongoose');

/**
 * OverdueVote — tracks individual votes to mark/clear a user as overdue.
 *
 * Each group member can cast one vote per target user.
 * Votes can be changed (upsert).
 */
const overdueVoteSchema = new mongoose.Schema(
    {
        group: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Group',
            required: true,
        },
        targetUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        voter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        vote: {
            type: String,
            enum: ['mark_overdue', 'clear_overdue'],
            required: true,
        },
    },
    { timestamps: true }
);

// One vote per voter per target per group
overdueVoteSchema.index({ group: 1, targetUser: 1, voter: 1 }, { unique: true });

module.exports = mongoose.model('OverdueVote', overdueVoteSchema);
