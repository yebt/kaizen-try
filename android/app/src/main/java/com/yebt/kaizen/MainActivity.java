package com.yebt.kaizen;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PrivacyPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
