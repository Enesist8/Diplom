// utils/validators.js

/**
 * Проверяет, является ли строка валидной датой
 * @param {string|Date} date - Дата для проверки
 * @returns {boolean}
 */
function isValidDate(date) {
    if (date instanceof Date) return true;
    if (typeof date !== 'string') return false;
    const timestamp = Date.parse(date);
    return !isNaN(timestamp);
}

/**
 * Проверяет, является ли строка валидным UUID
 * @param {string} uuid - Строка для проверки
 * @returns {boolean}
 */
function isValidUUID(uuid) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return typeof uuid === 'string' && regex.test(uuid);
}

module.exports = {
    isValidDate,
    isValidUUID
};