import { useState } from 'react';

/**
 * Custom hook for persisting state in localStorage.
 * Automatically serializes/deserializes JSON.
 */
export function useLocalStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch {
            return initialValue;
        }
    });

    const setValue = (value) => {
        const valueToStore = typeof value === 'function' ? value(storedValue) : value;
        setStoredValue(valueToStore);
        try {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch {
            // Fail silently for storage errors
        }
    };

    return [storedValue, setValue];
}

/**
 * Format a Date to Thai-style time string
 */
export function formatThaiTime(date) {
    return new Intl.DateTimeFormat('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

/**
 * Format a Date to Thai-style date string
 */
export function formatThaiDate(date) {
    return new Intl.DateTimeFormat('th-TH', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    }).format(date);
}

/**
 * Get today's date key for storage (YYYY-MM-DD)
 */
export function getTodayKey() {
    return new Date().toISOString().split('T')[0];
}
