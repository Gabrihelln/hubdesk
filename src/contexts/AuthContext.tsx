import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
  google_connected: boolean;
  city: string;
  dashboard_layouts?: string;
}

interface AuthContextType {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  connectGoogle: () => Promise<void>;
  disconnectGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, retryCount = 0) => {
    try {
      // First, check if the server is healthy
      const healthCheck = await fetch('/api/health').catch(() => null);
      if (!healthCheck || !healthCheck.ok) {
        if (retryCount < 5) {
          console.log(`Server not ready, retrying fetchProfile (${retryCount + 1}/5)...`);
          setTimeout(() => fetchProfile(userId, retryCount + 1), 2000);
          return;
        }
        throw new Error("Server is unreachable after multiple attempts.");
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error fetching profile from API:', errorData.error);
        
        // If it's a 502/503/504, it might be a temporary proxy issue during startup
        if ([502, 503, 504].includes(response.status) && retryCount < 3) {
          setTimeout(() => fetchProfile(userId, retryCount + 1), 2000);
        }
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();
      
      if (data) {
        console.log('Profile data received from API:', {
          id: data.id,
          google_connected: !!data.google_refresh_token,
          google_email: data.google_email
        });
        setProfile({
          id: data.id,
          email: data.email,
          name: data.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || data.email?.split('@')[0],
          picture: data.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || `https://ui-avatars.com/api/?name=${data.email}`,
          google_connected: !!data.google_refresh_token,
          city: data.city || "São Luís",
          dashboard_layouts: data.dashboard_layouts
        });
      }
    } catch (err: any) {
      // Check if it's a network error (like "Failed to fetch")
      const isNetworkError = err instanceof TypeError || err.message?.includes('fetch');
      
      console.error('Unexpected error in fetchProfile:', err);
      
      // Retry on network errors too, as the server might be restarting or there's a temporary glitch
      if (retryCount < 5) {
        const delay = isNetworkError ? 3000 : 2000; // Slightly longer delay for network errors
        console.log(`Retrying fetchProfile due to ${isNetworkError ? 'network error' : 'unexpected error'} (${retryCount + 1}/5)...`);
        setTimeout(() => fetchProfile(userId, retryCount + 1), delay);
      }
    }
  };

  useEffect(() => {
    // Check active sessions and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    }).catch(err => {
      console.error("Error getting session:", err);
      setLoading(false);
    });

    // Safety timeout to ensure loading screen doesn't get stuck
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      else setProfile(null);
      setLoading(false);
    });

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const userId = user?.id;
        if (userId) {
          fetchProfile(userId);
          setTimeout(() => {
            fetchProfile(userId);
          }, 1000);
          setTimeout(() => {
            fetchProfile(userId);
          }, 3000);
        }
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
      window.removeEventListener('message', handleMessage);
    };
  }, [user?.id]);

  const loginWithGoogle = async () => {
    // This is for primary login via Supabase Google Auth
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      }
    });
  };

  const connectGoogle = async () => {
    if (!user) return;
    // This is for the custom integration flow
    const res = await fetch(`/api/auth/url?userId=${user.id}`);
    const { url } = await res.json();
    window.open(url, 'google_auth', 'width=600,height=700');
  };

  const disconnectGoogle = async () => {
    if (!user) return;
    await supabase.from('users').update({
      google_refresh_token: null,
      google_email: null
    }).eq('id', user.id);
    await fetch('/api/auth/logout', { method: 'POST' });
    fetchProfile(user.id);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      loginWithGoogle, 
      connectGoogle, 
      disconnectGoogle,
      logout,
      refreshProfile: () => user ? fetchProfile(user.id) : Promise.resolve()
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
