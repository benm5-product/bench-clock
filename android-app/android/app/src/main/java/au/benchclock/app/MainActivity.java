package au.benchclock.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(BarColourPlugin.class);
        super.onCreate(savedInstanceState);
        enableEdgeToEdge(getWindow());
    }

    /**
     * Draw behind the status bar and the gesture/navigation bar on every Android version
     * (Android 15+ already forces this). The page and BarColourPlugin then paint those areas.
     */
    @SuppressWarnings("deprecation")
    private static void enableEdgeToEdge(Window window) {
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);
    }
}
