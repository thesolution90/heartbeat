<template>
  <div class="card-gradient">
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Lade Lied Info...</p>
    </div>

    <div v-else class="">
      <!-- Device Auswahl -->
      <div v-if="!selectedDevice && devices.length > 0" class="device-selection">
        <h4 class="mb-md">Wähle ein Abspielgerät:</h4>
        <div class="flex-col gap-md mb-md">
          <button
            v-for="device in devices"
            :key="device.id"
            @click="selectDevice(device)"
            class="device-btn"
            :class="{ active: device.is_active }"
          >
            <div class="device-info">
              <span class="device-name">{{ device.name }}</span>
              <span v-if="device.is_active" class="active-badge">Aktiv</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Keine Geräte gefunden -->
      <div v-else-if="!selectedDevice && devices.length === 0" class="warning-msg">
        <p>⚠️ Keine Spotify Geräte gefunden</p>
        <p class="text-muted mt-sm mb-md">Öffne Spotify auf einem deiner Geräte und drücke dann:</p>
        <button @click="refreshDevices" class="btn-secondary btn-sm">
          Geräte aktualisieren
        </button>
        <button @click="openSpotifyApp" class="btn-secondary btn-sm mt-md">
          Direkt in Spotify öffnen
        </button>
      </div>

      <!-- Playback Controls -->
      <div v-if="selectedDevice" class="">
        <div class="card-dark flex-between mb-md">
          <div class="flex gap-sm">
            <span class="">{{ getDeviceIcon(selectedDevice.type) }}</span>
            <span class="">{{ selectedDevice.name }}</span>
          </div>
          <button @click="changeDevice" class="btn-secondary btn-sm">Wechseln</button>
        </div>

        <div class="flex gap-md mb-md">
          <button @click="playOnDevice" class="btn-primary btn-block" :disabled="isPlaying">
            {{ isPlaying ? 'Playing' : 'Play' }}
          </button>

          <button v-if="isPlaying" @click="pausePlayback" class="btn-secondary">
            Pause
          </button>
        </div>

        <!-- Current Playback State -->
        <div v-if="currentPlayback" class="card-dark">
          <div class="progress-container">
            <span class="progress-time">{{ formatTime(currentPlayback.progress_ms) }}</span>
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                :style="{ width: progressPercent + '%' }"
              ></div>
            </div>
            <span class="progress-time">{{ formatTime(currentPlayback.item?.duration_ms || 0) }}</span>
          </div>
        </div>
      </div>

      <!-- Fallback: In App öffnen -->
      <div class="text-center mt-lg">
        <button @click="openInSpotify" class="btn-outline btn-block">
          Direkt in Spotify öffnen
        </button>
        <button @click="refreshDevices" class="btn-outline btn-block mt-md">
          Geräte aktualisieren
        </button>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="error-msg mt-md">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { SpotifyAuth } from '../utils/SpotifyAuth';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

const props = defineProps<{
  trackUri: string;
}>();

const spotifyAuth = SpotifyAuth.getInstance();

const loading = ref(true);
const track = ref<any>(null);
const devices = ref<any[]>([]);
const selectedDevice = ref<any>(null);
const currentPlayback = ref<any>(null);
const isPlaying = ref(false);
const progressPercent = ref(0);
const error = ref('');

let playbackCheckInterval: number | null = null;

onMounted(async () => {
  await loadTrackInfo();
  await loadDevices();
  startPlaybackCheck();
});

onUnmounted(() => {
  if (playbackCheckInterval) {
    clearInterval(playbackCheckInterval);
  }
});

const loadTrackInfo = async () => {
  try {
    const trackId = props.trackUri.split(':').pop();
    const token = await spotifyAuth.getToken();
    
    if (!token) {
      error.value = 'Nicht eingeloggt';
      return;
    }

    const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Track konnte nicht geladen werden');

    track.value = await response.json();
  } catch (err: any) {
    console.error('Load track error:', err);
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

const loadDevices = async () => {
  try {
    const token = await spotifyAuth.getToken();
    if (!token) return;

    const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Geräte konnten nicht geladen werden');

    const data = await response.json();
    devices.value = data.devices || [];

    // Wähle automatisch aktives Gerät
    const activeDevice = devices.value.find(d => d.is_active);
    if (activeDevice) {
      selectedDevice.value = activeDevice;
    } else if (devices.value.length === 1) {
      // Wenn nur ein Gerät, wähle es automatisch
      selectedDevice.value = devices.value[0];
    }
  } catch (err: any) {
    console.error('Load devices error:', err);
    error.value = err.message;
  }
};

const refreshDevices = async () => {
  error.value = '';
  selectedDevice.value = null;
  await loadDevices();
};

const selectDevice = (device: any) => {
  selectedDevice.value = device;
  error.value = '';
};

const changeDevice = () => {
  selectedDevice.value = null;
};

const playOnDevice = async () => {
  if (!selectedDevice.value) {
    error.value = 'Bitte wähle ein Gerät';
    return;
  }

  try {
    const token = await spotifyAuth.getToken();
    if (!token) throw new Error('Nicht eingeloggt');

    // Starte Wiedergabe auf dem gewählten Gerät
    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${selectedDevice.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        uris: [`spotify:track:${props.trackUri}`],
        position_ms: 0,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Wiedergabe fehlgeschlagen');
    }

    isPlaying.value = true;
    error.value = '';
    
    // Aktualisiere Playback State
    setTimeout(() => getCurrentPlayback(), 1000);
  } catch (err: any) {
    console.error('Play error:', err);
    error.value = err.message;
  }
};

const pausePlayback = async () => {
  try {
    const token = await spotifyAuth.getToken();
    if (!token) return;

    await fetch('https://api.spotify.com/v1/me/player/pause', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });

    isPlaying.value = false;
  } catch (err: any) {
    console.error('Pause error:', err);
  }
};

const getCurrentPlayback = async () => {
  try {
    const token = await spotifyAuth.getToken();
    if (!token) return;

    const response = await fetch('https://api.spotify.com/v1/me/player', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 204) {
      // Keine Wiedergabe aktiv
      currentPlayback.value = null;
      isPlaying.value = false;
      return;
    }

    if (!response.ok) return;

    const data = await response.json();
    currentPlayback.value = data;
    isPlaying.value = data.is_playing;

    // Update Progress
    if (data.item?.duration_ms && data.progress_ms !== undefined) {
      progressPercent.value = (data.progress_ms / data.item.duration_ms) * 100;
    }
  } catch (err) {
    console.error('Get playback error:', err);
  }
};

const startPlaybackCheck = () => {
  playbackCheckInterval = window.setInterval(() => {
    getCurrentPlayback();
  }, 1000);
};

const openInSpotify = async () => {
  const trackId = props.trackUri.split(':').pop();
  const spotifyUrl = `https://open.spotify.com/track/${trackId}`;

  if (Capacitor.isNativePlatform()) {
    try {
      window.location.href = `spotify:track:${props.trackUri}`
      // window.location.href = props.trackUri;
      setTimeout(() => {
        Browser.open({ url: spotifyUrl });
      }, 1000);
    } catch {
      Browser.open({ url: spotifyUrl });
    }
  } else {
    window.open(spotifyUrl, '_blank');
  }
};

const openSpotifyApp = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      window.location.href = 'spotify://';
      setTimeout(() => {
        Browser.open({ url: 'https://open.spotify.com' });
      }, 1000);
    } catch {
      Browser.open({ url: 'https://open.spotify.com' });
    }
  } else {
    window.open('https://open.spotify.com', '_blank');
  }
};

const getDeviceIcon = (type: string): string => {
  const icons: Record<string, string> = {
    Computer: '💻',
    Smartphone: '📱',
    Speaker: '🔊',
    TV: '📺',
    AVR: '🎛️',
    STB: '📡',
    AudioDongle: '🎧',
    GameConsole: '🎮',
    CastVideo: '📺',
    CastAudio: '🔊',
    Automobile: '🚗',
    Unknown: '🎵',
  };
  return icons[type] || '🎵';
};

const formatTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

</script>

<style scoped>
.device-btn {
  display: flex;
  align-items: center;
  gap: 15px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  padding: 15px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  color: white;
}

.device-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: #1db954;
}

.device-btn.active {
  border-color: #1db954;
  background: rgba(29, 185, 84, 0.2);
}
</style>