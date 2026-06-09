package com.hijistream.tv

import android.os.SystemClock
import android.view.InputDevice
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WebViewTouchModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "WebViewTouchModule"

    /**
     * Block D-pad keys from reaching WebView's Chromium engine.
     * This prevents the player from handling D-pad as seek/volume.
     * Tab and Enter are NOT blocked so Chromium can handle focus navigation.
     */
    @ReactMethod
    fun blockDpadKeys() {
        val activity = currentActivity ?: return
        activity.runOnUiThread {
            val webView = findWebView(activity.window.decorView.rootView) ?: return@runOnUiThread
            webView.setOnKeyListener { _, keyCode, _ ->
                // Block D-pad only, allow Tab and Enter
                keyCode == KeyEvent.KEYCODE_DPAD_UP ||
                keyCode == KeyEvent.KEYCODE_DPAD_DOWN ||
                keyCode == KeyEvent.KEYCODE_DPAD_LEFT ||
                keyCode == KeyEvent.KEYCODE_DPAD_RIGHT ||
                keyCode == KeyEvent.KEYCODE_DPAD_CENTER
            }
        }
    }

    /**
     * Dispatch a real Tab or Shift+Tab key event to the WebView.
     * This triggers the browser's native Tab focus navigation,
     * same as pressing Tab on a physical keyboard.
     *
     * @param shift true for Shift+Tab (backward), false for Tab (forward)
     */
    @ReactMethod
    fun dispatchTab(shift: Boolean) {
        val activity = currentActivity ?: return
        activity.runOnUiThread {
            val webView = findWebView(activity.window.decorView.rootView) ?: return@runOnUiThread
            webView.requestFocus()

            val t = SystemClock.uptimeMillis()
            val meta = if (shift) KeyEvent.META_SHIFT_ON else 0
            val flags = KeyEvent.FLAG_SOFT_KEYBOARD or KeyEvent.FLAG_KEEP_TOUCH_MODE

            // KEY_DOWN with SOURCE_KEYBOARD
            webView.dispatchKeyEvent(KeyEvent(t, t, KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_TAB, 0, meta, -1, 0, flags, InputDevice.SOURCE_KEYBOARD))
            // KEY_UP
            webView.dispatchKeyEvent(KeyEvent(t, t + 30L, KeyEvent.ACTION_UP, KeyEvent.KEYCODE_TAB, 0, meta, -1, 0, flags, InputDevice.SOURCE_KEYBOARD))
        }
    }

    /**
     * Dispatch Enter key event to the WebView.
     * Triggers click on the currently focused element.
     */
    @ReactMethod
    fun dispatchEnter() {
        val activity = currentActivity ?: return
        activity.runOnUiThread {
            val webView = findWebView(activity.window.decorView.rootView) ?: return@runOnUiThread
            webView.requestFocus()

            val t = SystemClock.uptimeMillis()
            val flags = KeyEvent.FLAG_SOFT_KEYBOARD or KeyEvent.FLAG_KEEP_TOUCH_MODE

            webView.dispatchKeyEvent(KeyEvent(t, t, KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ENTER, 0, 0, -1, 0, flags, InputDevice.SOURCE_KEYBOARD))
            webView.dispatchKeyEvent(KeyEvent(t, t + 30L, KeyEvent.ACTION_UP, KeyEvent.KEYCODE_ENTER, 0, 0, -1, 0, flags, InputDevice.SOURCE_KEYBOARD))
        }
    }

    private fun findWebView(view: View): WebView? {
        if (view is WebView) return view
        if (view is ViewGroup) {
            for (i in 0 until view.childCount) {
                val result = findWebView(view.getChildAt(i))
                if (result != null) return result
            }
        }
        return null
    }
}
