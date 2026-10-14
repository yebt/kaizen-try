package com.yebt.kaizen;

import android.view.WindowManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Hides the app from screenshots and the recent-apps preview while the photo
 * diary is open (FLAG_SECURE), so progress photos don't show up by accident.
 */
@CapacitorPlugin(name = "Privacy")
public class PrivacyPlugin extends Plugin {

    @PluginMethod
    public void setSecure(PluginCall call) {
        boolean secure = Boolean.TRUE.equals(call.getBoolean("secure", false));
        getActivity().runOnUiThread(() -> {
            if (secure) {
                getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
            } else {
                getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
            }
            call.resolve();
        });
    }
}
