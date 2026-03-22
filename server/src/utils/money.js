/**
 * Backend Money Utilities
 *
 * ALL monetary values are stored as integers in the smallest currency unit (paise).
 * These helpers ensure no floating-point math contaminates backend calculations.
 */

/**
 * Convert rupees (Number) to paise (integer).
 * Uses Math.round to eliminate any floating-point drift.
 *
 * @param {number} rupees – e.g. 100.25
 * @returns {number} integer paise – e.g. 10025
 */
const toPaise = (rupees) => {
    if (typeof rupees !== 'number' || isNaN(rupees)) {
        throw new Error('toPaise: input must be a valid number');
    }
    if (rupees < 0) {
        throw new Error('toPaise: input must be non-negative');
    }
    return Math.round(rupees * 100);
};

/**
 * Convert paise (integer) to rupees for display purposes only.
 * Returns a number with exactly 2 decimal places.
 *
 * ⚠️  Use ONLY for API response formatting – never for further calculations.
 *
 * @param {number} paise – e.g. 10025
 * @returns {string} rupees string – e.g. "100.25"
 */
const toRupees = (paise) => {
    if (!Number.isInteger(paise)) {
        throw new Error('toRupees: input must be an integer (paise)');
    }
    return (paise / 100).toFixed(2);
};

/**
 * Validate that a value is a non-negative integer (valid paise amount).
 *
 * @param {*} value
 * @returns {boolean}
 */
const isValidPaise = (value) => {
    return Number.isInteger(value) && value >= 0;
};

module.exports = { toPaise, toRupees, isValidPaise };
