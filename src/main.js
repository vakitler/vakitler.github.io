import './style.css';

import {
    ChevronDown,
    Clock,
    CloudSun,
    Coffee,
    Compass,
    ExternalLink,
    MapPin,
    Moon,
    Search,
    Settings,
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
    ChevronDown,
    Clock,
    CloudSun,
    Coffee,
    Compass,
    ExternalLink,
    MapPin,
    Moon,
    Search,
    Settings,
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
