const mongoose = require('mongoose');

/**
 * GroupMemberStatus — tracks per-group overdue status.
 *
 * A user can be 'overdue' in one group but 'active' in another.
 * Records are created lazily (only when needed).
 */
const groupMemberStatusSchema = new mongoose.Schema(
    {
        group: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Group',
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        status: {
            type: String,
            enum: ['active', 'overdue'],
            default: 'active',
        },
    },
    { timestamps: true }
);

// One status record per user per group
groupMemberStatusSchema.index({ group: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('GroupMemberStatus', groupMemberStatusSchema);
