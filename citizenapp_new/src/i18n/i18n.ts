import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import all your translation files
import en from './translations/en.json';
import hi from './translations/hi.json';
import bn from './translations/bn.json';
import ta from './translations/ta.json';
import te from './translations/te.json';

// Structure the resources for i18next
const resources = {
    en: { translation: en },
    hi: { translation: hi },
    bn: { translation: bn },
    ta: { translation: ta },
    te: { translation: te },
};

const languageDetector = {
    type: 'languageDetector' as const,
    async: true,
    detect: async (callback: (lang: string) => void) => {
        try {
            // Get stored language from AsyncStorage
            const storedLanguage = await AsyncStorage.getItem('app_locale');
            if (storedLanguage && Object.keys(resources).includes(storedLanguage)) {
                console.log(`🌐 Using stored language: ${storedLanguage}`);
                return callback(storedLanguage);
            }
            
            // If no language is stored, use the device's locale
            const deviceLocales = Localization.getLocales();
            const deviceLanguage = deviceLocales[0]?.languageCode || 'en';
            const supportedLanguage = Object.keys(resources).includes(deviceLanguage) ? deviceLanguage : 'en';
            
            console.log(`🌐 Using device language: ${supportedLanguage}`);
            return callback(supportedLanguage);
        } catch (error) {
            console.error('🚨 Error reading language from AsyncStorage:', error);
            return callback('en'); // Fallback to English on error
        }
    },
    init: () => {},
    cacheUserLanguage: async (language: string) => {
        try {
            console.log(`💾 Saving language preference: ${language}`);
            await AsyncStorage.setItem('app_locale', language);
        } catch (error) {
            console.error('🚨 Error saving language to AsyncStorage:', error);
        }
    },
};

// Fixed: Proper i18next initialization
const initializeI18n = async () => {
    try {
        await i18next
            .use(languageDetector)
            .use(initReactI18next)
            .init({
                resources,
                fallbackLng: 'en',
                compatibilityJSON: 'v4', // Fixed: Use v4 instead of v3
                interpolation: {
                    escapeValue: false,
                },
                react: {
                    useSuspense: false,
                },
                debug: __DEV__,
            });
    } catch (error) {
        console.error('🚨 i18n initialization error:', error);
    }
};

// Initialize immediately
initializeI18n();

// Export helpful functions
export const getCurrentLanguage = () => i18next.language;

export const changeLanguage = async (language: string) => {
    if (Object.keys(resources).includes(language)) {
        await i18next.changeLanguage(language);
        console.log(`✅ Language changed to: ${language}`);
    } else {
        console.warn(`⚠️ Unsupported language: ${language}`);
    }
};

export const getSupportedLanguages = () => Object.keys(resources);

export default i18next;
