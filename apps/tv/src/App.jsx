/**
 * App entry for Android TV
 *
 * This file is NOT used directly — expo-router handles the entry point
 * (expo-router/entry in package.json main field).
 *
 * Kept for legacy compatibility only.
 * The actual layout is in app/_layout.jsx
 */

import { registerRootComponent } from 'expo';
import RootLayout from './app/_layout';

console.log("src/App.jsx is executing!");
registerRootComponent(RootLayout);
