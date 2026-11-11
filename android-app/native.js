/* Bench Clock: thin wrapper around the Capacitor plugins used by app.js.
   Every function has a browser fallback, so www/ still runs in a normal browser for testing. */
(function(){
  const Cap = window.Capacitor;
  const isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  const reg = name => (isNative && Cap.registerPlugin) ? Cap.registerPlugin(name) : null;

  const Preferences = reg('Preferences');
  const Filesystem  = reg('Filesystem');
  const Share       = reg('Share');
  const Haptics     = reg('Haptics');
  const KeepAwake   = reg('KeepAwake');
  const App         = reg('App');
  const BarColour   = reg('BarColour');

  /* ---------- storage ---------- */
  let chain = Promise.resolve();
  const storage = {
    async get(key){
      if(Preferences){ const r = await Preferences.get({key}); return r && r.value != null ? r.value : null; }
      try{ return localStorage.getItem(key); }catch(e){ return null; }
    },
    /* Writes are queued so they land in the order they were made. */
    set(key, value){
      chain = chain.then(() => Preferences
        ? Preferences.set({key, value})
        : localStorage.setItem(key, value)
      ).then(() => true, e => { console.error('save failed', e); return false; });
      return chain;
    },
    legacy(key){ try{ return localStorage.getItem(key); }catch(e){ return null; } }
  };

  /* ---------- export (share sheet) ---------- */
  async function exportFile(filename, text){
    if(Filesystem && Share){
      const w = await Filesystem.writeFile({path: filename, data: text, directory: 'CACHE', encoding: 'utf8'});
      try{
        await Share.share({title: 'Bench Clock teams', text: 'Bench Clock teams backup', files: [w.uri], dialogTitle: 'Save or send your teams'});
      }catch(e){
        if(!/cancel/i.test(String(e && (e.message || e)))) throw e;
        return false;
      }
      return true;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], {type: 'application/json'}));
    a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    return true;
  }

  /* ---------- haptics ---------- */
  function buzz(){
    if(Haptics){ Haptics.impact({style: 'MEDIUM'}).catch(()=>{}); return; }
    try{ navigator.vibrate && navigator.vibrate(15); }catch(e){}
  }

  /* ---------- keep the screen awake ---------- */
  let awake = false, wakeLock = null;
  function setAwake(on){
    on = !!on; if(on === awake) return; awake = on;
    if(KeepAwake){ (on ? KeepAwake.keepAwake() : KeepAwake.allowSleep()).catch(()=>{}); return; }
    if(on){ try{ navigator.wakeLock && navigator.wakeLock.request('screen').then(l => { wakeLock = l; }).catch(()=>{}); }catch(e){} }
    else if(wakeLock){ wakeLock.release().catch(()=>{}); wakeLock = null; }
  }
  document.addEventListener('visibilitychange', () => {
    // A browser wake lock is dropped when the page is hidden; re-request it on return.
    if(!KeepAwake && !document.hidden && awake && !wakeLock){ awake = false; setAwake(true); }
    else if(!KeepAwake && document.hidden){ wakeLock = null; }
  });

  /* ---------- status bar / gesture bar ----------
     The app draws edge-to-edge on every Android version. BarColour (android/app/.../BarColourPlugin.java)
     paints the area behind the status bar in the team colour on older WebViews that don't pass insets to
     the page; newer WebViews let the page paint it (body::before in styles.css). */
  let last = '';
  function setStatusBar(statusColour, statusIsDark, pageColour, pageIsDark){
    if(!BarColour) return;
    const key = [statusColour, statusIsDark, pageColour, pageIsDark].join('|');
    if(key === last) return; last = key;
    BarColour.set({statusColor: statusColour, lightStatusIcons: statusIsDark, pageColor: pageColour, lightNavIcons: pageIsDark}).catch(()=>{ last = ''; });
  }

  /* ---------- Android back button ---------- */
  function onBack(handler){
    if(App) App.addListener('backButton', () => { if(handler() === 'exit') App.exitApp(); });
  }

  window.Native = {isNative, storage, exportFile, buzz, setAwake, setStatusBar, onBack};
})();
