export const generateUUID = (): string => {
    // Нативный безопасный UUID (работает в HTTPS и localhost)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    
    // Фоллбэк для старых браузеров или HTTP (RFC4122)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export const generateShortId = (): string => {
    // Генерация короткого ID (8 символов) для Reality
    const arr = new Uint8Array(4);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(arr);
        return Array.from(arr, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    // Фоллбэк
    return Math.random().toString(16).substring(2, 10);
};