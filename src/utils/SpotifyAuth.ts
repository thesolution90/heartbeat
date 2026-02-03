// src/utils/SpotifyAuth.ts
import { Browser } from '@capacitor/browser';
import { Preferences } from '@capacitor/preferences';
import { config } from '../config/env'

interface SpotifyAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export class SpotifyAuth {
  private static instance: SpotifyAuth;
  private accessToken: string | null = null;

  private constructor() {}

  static getInstance(): SpotifyAuth {
    if (!SpotifyAuth.instance) {
      SpotifyAuth.instance = new SpotifyAuth();
    }
    return SpotifyAuth.instance;
  }

  // Generiere einen zufälligen String für PKCE
  private generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], '');
  }

  // SHA256 Hash für PKCE
  private async sha256(plain: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return await crypto.subtle.digest('SHA-256', data);
  }

  // Base64 URL encode
  private base64urlencode(str: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(str)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  // Login mit Spotify
  async login(): Promise<boolean> {
    try {
      // PKCE Code Verifier und Challenge generieren
      const codeVerifier = this.generateRandomString(64);
      const hashed = await this.sha256(codeVerifier);
      const codeChallenge = this.base64urlencode(hashed);

      // State für Sicherheit
      const state = this.generateRandomString(16);

      // Speichere Code Verifier und State
      await Preferences.set({ key: 'code_verifier', value: codeVerifier });
      await Preferences.set({ key: 'auth_state', value: state });

      // Authorization URL erstellen
      const authUrl = new URL('https://accounts.spotify.com/authorize');
      authUrl.searchParams.append('client_id', config.spotify.clientId);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('redirect_uri', config.spotify.redirectUri);
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('scope', config.spotify.scopes);
      authUrl.searchParams.append('code_challenge_method', 'S256');
      authUrl.searchParams.append('code_challenge', codeChallenge);

      // Öffne Browser für Login
      await Browser.open({ url: authUrl.toString() });

      // Warte auf Callback (wird durch App Link Handler verarbeitet)
      return new Promise((resolve) => {
        const checkInterval = setInterval(async () => {
          const token = await this.getStoredToken();
          if (token) {
            clearInterval(checkInterval);
            this.accessToken = token;
            resolve(true);
          }
        }, 500);

        // Timeout nach 5 Minuten
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(false);
        }, 300000);
      });
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  // Verarbeite den Callback von Spotify
  async handleCallback(url: string): Promise<boolean> {
    try {
      const urlParams = new URL(url);
      const code = urlParams.searchParams.get('code');
      const state = urlParams.searchParams.get('state');

      if (!code || !state) {
        throw new Error('Missing code or state');
      }

      // Validiere State
      const storedState = await Preferences.get({ key: 'auth_state' });
      if (state !== storedState.value) {
        throw new Error('State mismatch');
      }

      // Hole Code Verifier
      const codeVerifier = await Preferences.get({ key: 'code_verifier' });
      if (!codeVerifier.value) {
        throw new Error('Missing code verifier');
      }

      // Tausche Code gegen Access Token
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.spotify.clientId,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: config.spotify.redirectUri,
          code_verifier: codeVerifier.value,
        }),
      });

      if (!response.ok) {
        throw new Error('Token exchange failed');
      }

      const data: SpotifyAuthResponse = await response.json();
      
      // Speichere Token
      await Preferences.set({ key: 'spotify_token', value: data.access_token });
      await Preferences.set({ 
        key: 'spotify_token_expires', 
        value: String(Date.now() + data.expires_in * 1000) 
      });

      this.accessToken = data.access_token;

      // Schließe Browser
      await Browser.close();

      return true;
    } catch (error) {
      console.error('Callback handling error:', error);
      return false;
    }
  }

  // Hole gespeicherten Token
  private async getStoredToken(): Promise<string | null> {
    const token = await Preferences.get({ key: 'spotify_token' });
    const expires = await Preferences.get({ key: 'spotify_token_expires' });

    if (token.value && expires.value) {
      if (Date.now() < parseInt(expires.value)) {
        return token.value;
      }
    }

    return null;
  }

  // Prüfe ob eingeloggt
  async isLoggedIn(): Promise<boolean> {
    if (this.accessToken) return true;
    
    const token = await this.getStoredToken();
    if (token) {
      this.accessToken = token;
      return true;
    }
    
    return false;
  }

  // Hole aktuellen Token
  async getToken(): Promise<string | null> {
    if (this.accessToken) return this.accessToken;
    return await this.getStoredToken();
  }

  // Logout
  async logout(): Promise<void> {
    this.accessToken = null;
    await Preferences.remove({ key: 'spotify_token' });
    await Preferences.remove({ key: 'spotify_token_expires' });
    await Preferences.remove({ key: 'code_verifier' });
    await Preferences.remove({ key: 'auth_state' });
  }

  // Suche nach Songs
  async searchTracks(query: string): Promise<any[]> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Not logged in');
    }

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Search failed');
    }

    const data = await response.json();
    return data.tracks.items;
  }

  // Hole Benutzer-Info
  async getUserProfile(): Promise<any> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Not logged in');
    }

    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user profile');
    }

    return await response.json();
  }
}