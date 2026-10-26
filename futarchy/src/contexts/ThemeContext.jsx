import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { readSeerTheme, writeSeerTheme } from '../utils/seerTheme';

/**
 * Theme options:
 * - 'light': Light mode
 * - 'dark': Dark mode  
 * - 'gradient': Dark mode with blue-to-gold gradient background
 */
const ThemeContext = createContext();

export const THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
    GRADIENT: 'gradient',
};

export const ThemeProvider = ({ children }) => {
    const [theme, setThemeState] = useState(THEMES.DARK);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        setThemeState(readSeerTheme() === 'light' ? THEMES.LIGHT : THEMES.DARK);
        setReady(true);
    }, []);

    useEffect(() => {
        if (!ready) return;
        const html = document.documentElement;

        // Remove all theme classes
        html.classList.remove('dark', 'gradient');
        html.removeAttribute('data-theme');

        if (theme === THEMES.DARK || theme === THEMES.GRADIENT) {
            html.classList.add('dark');
        }

        if (theme === THEMES.GRADIENT) {
            html.classList.add('gradient');
            html.setAttribute('data-theme', 'gradient');
        }

    }, [theme, ready]);

    const setTheme = useCallback((next) => {
        writeSeerTheme(next === THEMES.LIGHT ? 'light' : 'dark');
        setThemeState(next);
    }, []);

    const cycleTheme = useCallback(() => {
        setTheme(theme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT);
    }, [theme, setTheme]);

    const value = {
        theme,
        setTheme,
        cycleTheme,
        isDarkMode: theme === THEMES.DARK || theme === THEMES.GRADIENT,
        isGradient: theme === THEMES.GRADIENT,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};

export default ThemeContext;
