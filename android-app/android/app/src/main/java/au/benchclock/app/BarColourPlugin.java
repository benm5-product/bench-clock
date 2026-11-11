package au.benchclock.app;

import android.content.res.Configuration;
import android.graphics.Canvas;
import android.graphics.ColorFilter;
import android.graphics.Paint;
import android.graphics.PixelFormat;
import android.graphics.Rect;
import android.graphics.drawable.Drawable;
import android.view.View;
import android.view.Window;
import androidx.annotation.NonNull;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.util.WebColor;

/**
 * Colours the status bar to match the team and picks light or dark system-bar icons.
 *
 * The app is edge-to-edge, so the status bar is transparent. On current WebViews the page itself paints the
 * area behind it. On older WebViews (e.g. Android 8/9) Capacitor pads the window instead, so the window
 * background shows through: this plugin paints that background as a team-coloured band above the page colour.
 *
 * Capacitor's built-in SystemBars plugin resets the icon style and window background when the theme changes or
 * the app resumes, so the last values are re-applied afterwards.
 */
@CapacitorPlugin(name = "BarColour")
public class BarColourPlugin extends Plugin {

    private Integer statusColor = null;
    private int pageColor = 0xFFEEF1EC;
    private boolean lightStatusIcons = true;
    private boolean lightNavIcons = false;
    private BandBackground background;

    @PluginMethod
    public void set(PluginCall call) {
        try {
            statusColor = WebColor.parseColor(call.getString("statusColor", "#1f4d32"));
            pageColor = WebColor.parseColor(call.getString("pageColor", "#eef1ec"));
        } catch (IllegalArgumentException e) {
            call.reject("Bad colour");
            return;
        }
        lightStatusIcons = Boolean.TRUE.equals(call.getBoolean("lightStatusIcons", true));
        lightNavIcons = Boolean.TRUE.equals(call.getBoolean("lightNavIcons", false));
        getBridge().executeOnMainThread(() -> {
            apply();
            call.resolve();
        });
    }

    @Override
    protected void handleOnConfigurationChanged(Configuration newConfig) {
        super.handleOnConfigurationChanged(newConfig);
        reapplyLater();
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        reapplyLater();
    }

    private void reapplyLater() {
        if (statusColor == null || getActivity() == null) return;
        getActivity().getWindow().getDecorView().post(this::apply);
    }

    private void apply() {
        if (statusColor == null || getActivity() == null) return;
        Window window = getActivity().getWindow();
        View decor = window.getDecorView();
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decor);
        controller.setAppearanceLightStatusBars(!lightStatusIcons);
        controller.setAppearanceLightNavigationBars(!lightNavIcons);
        if (background == null) background = new BandBackground(decor);
        background.setColours(statusColor, pageColor);
        if (decor.getBackground() != background) decor.setBackground(background);
    }

    /** Page colour, with a band of the status-bar colour as tall as the status bar (or cutout). */
    static final class BandBackground extends Drawable {

        private final View root;
        private final Paint paint = new Paint();
        private int band;
        private int page;

        BandBackground(View root) {
            this.root = root;
        }

        void setColours(int band, int page) {
            this.band = band;
            this.page = page;
            invalidateSelf();
        }

        @Override
        public void draw(@NonNull Canvas canvas) {
            Rect b = getBounds();
            canvas.drawColor(page);
            WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(root);
            int top = insets == null
                ? 0
                : insets.getInsets(WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.displayCutout()).top;
            if (top > 0) {
                paint.setColor(band);
                canvas.drawRect(b.left, b.top, b.right, b.top + top, paint);
            }
        }

        @Override
        public void setAlpha(int alpha) {}

        @Override
        public void setColorFilter(ColorFilter colorFilter) {}

        @Override
        public int getOpacity() {
            return PixelFormat.OPAQUE;
        }
    }
}
