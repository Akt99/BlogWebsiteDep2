import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { fetchCsrf, fetchMe, onAuthChange, notifyAuthChanged } from "../lib/api.js";

const AuthContext = createContext({ me: null });

export function AuthProvider({ children }) {
  const [me, setMe] = useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try { await fetchCsrf(); } catch {}
      try {
        const data = await fetchMe();
        if (mounted) setMe(data);
      } catch {}
    })();

    const off = onAuthChange(async () => {
      try {
        const data = await fetchMe();
        setMe(data);
      } catch {}
    });

    return () => { mounted = false; off && off(); };
  }, []);

  const refreshMe = async () => {
    const data = await fetchMe();
    setMe(data);
    return data;
  };

  const logout = async () => {
    await api.post("/logout");
    notifyAuthChanged();
    setMe({ authenticated: false });
  };

  const value = useMemo(() => ({ me, setMe, refreshMe, logout }), [me]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
