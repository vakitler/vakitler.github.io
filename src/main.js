import './style.css';

import {
    BookOpen,
    Calendar,
    ChevronDown,
    Clock,
    CloudSun,
    Coffee,
    Compass,
    ExternalLink,
    Gift,
    Heart,
    MapPin,
    Moon,
    Printer,
    Search,
    Settings,
    Sparkles,
    Star,
    Stars,
    Sun,
    Sunrise,
    Sunset,
    Utensils,
    X,
    createIcons
} from 'lucide';

import { createAppController } from './controllers/appController';

const usedIcons = {
    BookOpen,
    Calendar,
    ChevronDown,
    Clock,
    CloudSun,
    Coffee,
    Compass,
    ExternalLink,
    Gift,
    Heart,
    MapPin,
    Moon,
    Printer,
    Search,
    Settings,
    Sparkles,
    Star,
    Stars,
    Sun,
    Sunrise,
    Sunset,
    Utensils,
    X
};

const appController = createAppController({ createIcons, usedIcons });
appController.init();

window.toggleLang = appController.toggleLang;
window.toggleTheme = appController.toggleTheme;
window.toggleSettings = appController.toggleSettings;
window.toggleDropdown = appController.toggleDropdown;
window.filterDropdown = appController.filterDropdown;
window.selectItem = appController.selectItem;
window.saveLocation = appController.saveLocation;
window.autoLocate = appController.autoLocate;
window.toggleMonthlyModal = appController.toggleMonthlyModal;
window.toggleReligiousDaysModal = appController.toggleReligiousDaysModal;
window.printMonthlyTable = appController.printMonthlyTable;
