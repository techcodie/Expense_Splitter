const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
    {
        group: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Group',
            required: [true, 'Group is required'],
        },
        from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Debtor (from) is required'],
        },
        to: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Creditor (to) is required'],
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: [1, 'Amount must be at least 1 paise'],
            validate: {
                validator: Number.isInteger,
                message: 'Amount must be an integer (paise)',
            },
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Creator is required'],
        },
    },
    { timestamps: true }
);

// Prevent self-payment at schema level
paymentSchema.pre('validate', function (next) {
    if (this.from && this.to && this.from.toString() === this.to.toString()) {
        next(new Error('Cannot make a payment to yourself'));
    } else {
        next();
    }
});

// Index for fast group-level queries
paymentSchema.index({ group: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);