(function () {
  const state = { enabled: false, client: null, session: null, profile: null, ready: null };

  function loadSupabaseSdk() {
    if (window.supabase) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = resolve;
      script.onerror = () => reject(new Error('The secure sign-in service could not be loaded.'));
      document.head.appendChild(script);
    });
  }

  async function configuration() {
    const response = await fetch('/api/auth-config', { cache: 'no-store' });
    if (!response.ok) throw new Error('The BIL access configuration could not be loaded.');
    return response.json();
  }

  function nextUrl() {
    return `${location.pathname}${location.search}${location.hash}`;
  }

  async function init(options = {}) {
    if (state.ready) return state.ready;
    state.ready = (async () => {
      const config = await configuration();
      state.enabled = Boolean(config.enabled);
      if (!state.enabled) return { mode: 'legacy', tier: 'demo' };

      await loadSupabaseSdk();
      state.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      const result = await state.client.auth.getSession();
      if (result.error) throw result.error;
      state.session = result.data.session;

      if (!state.session && options.requireAuth !== false) {
        location.replace(`/login.html?next=${encodeURIComponent(nextUrl())}`);
        return new Promise(() => {});
      }
      if (!state.session) return { mode: 'anonymous' };

      const me = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${state.session.access_token}` },
        cache: 'no-store'
      });
      const data = await me.json().catch(() => ({}));
      if (!me.ok) {
        if (me.status === 401) await state.client.auth.signOut();
        throw new Error(data.error || 'Your BIL account could not be verified.');
      }
      state.profile = data.profile;
      document.documentElement.dataset.bilTier = data.tier;
      document.documentElement.dataset.bilRole = data.profile?.role || '';
      window.dispatchEvent(new CustomEvent('bil-access-ready', { detail: data }));
      return data;
    })();
    return state.ready;
  }

  async function authHeaders() {
    await init();
    if (!state.session) return {};
    const current = await state.client.auth.getSession();
    state.session = current.data.session;
    return state.session ? { Authorization: `Bearer ${state.session.access_token}` } : {};
  }

  async function signOut() {
    if (state.client) await state.client.auth.signOut();
    location.replace('/login.html');
  }

  window.BILAuth = { init, authHeaders, signOut, state };
  if (!location.pathname.endsWith('/login.html')) {
    document.documentElement.style.visibility = 'hidden';
    init().then(() => {
      document.documentElement.style.visibility = '';
    }).catch(error => {
      document.documentElement.style.visibility = '';
      document.body.innerHTML = `<main style="max-width:680px;margin:80px auto;padding:24px;font-family:system-ui;color:#17212b"><h1>Access unavailable</h1><p>${String(error.message || error)}</p><p><a href="/login.html">Return to sign in</a></p></main>`;
    });
  }
})();
