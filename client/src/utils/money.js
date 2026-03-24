/**
 * Frontend Money Utilities
 *
 * Users enter amounts in rupees (₹).
 * Backend stores/computes in paise (smallest unit, integer).
 * These helpers bridge the two.
 */

/**
 * Convert rupees input to paise for API requests.
 * Math.round eliminates floating-point drift (e.g. 100.10 * 100 = 10010.000000000001).
 *
 * @param {string|number} rupees – user input, e.g. "100.25" or 100.25
 * @returns {number} integer paise – e.g. 10025
 */
export const rupeesToPaise = (rupees) => {
    const num = Number(rupees);
    if (isNaN(num) || num < 0) return 0;
    return Math.round(num * 100);
};

/**
 * Format paise amount to display string with ₹ symbol and 2 decimal places.
 *
 * @param {number} paise – integer, e.g. 10025
 * @returns {string} formatted string – e.g. "₹100.25"
 */
export const formatCurrency = (paise) => {
    if (typeof paise !== 'number' || isNaN(paise)) return '₹0.00';
    return `₹${(paise / 100).toFixed(2)}`;
};

/**
 * Convert paise to rupees number (for pre-filling form inputs).
 *
 * @param {number} paise
 * @returns {string} rupees with 2 decimals – e.g. "100.25"
 */
export const paiseToRupees = (paise) => {
    if (typeof paise !== 'number' || isNaN(paise)) return '0.00';
    return (paise / 100).toFixed(2);
};
