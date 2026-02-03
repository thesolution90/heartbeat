<template>
  <div>
    <div class="section-header mt-lg">
      <button @click="$emit('back')" class="btn-secondary btn-sm">Zurück</button>
      <h1>Lied scannen</h1>
    </div>

    <div class="content-container">
      <div class="flex-col flex-center">
        <button @click="startCameraScanner" class="btn-secondary btn-lg btn-block mb-lg">
          Mit Kamera scannen
        </button>
        <button @click="triggerFileInput" class="btn-secondary btn-lg btn-block mb-lg">
          QR-Code hochladen
        </button>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          @change="handleFileUpload"
          style="display: none"
        />
      </div>

      <div v-if="isProcessing" class="text-center mb-lg">
        <div class=""></div>
        <p>Verarbeite QR-Code...</p>
      </div>

      <div v-if="isPlaying && trackId" class="text-center mb-lg">
        <h2 class="mb-lg">Song gefunden!</h2>
        
        <!-- Remote Player - Steuert Spotify App -->
        <SpotifyRemotePlayer :track-uri="trackId" />

        <div class="mt-lg">
          <button @click="resetScanner" class="btn-secondary btn-sm">
            Neuen Song scannen
          </button>
        </div>
      </div>

      <div v-if="error" class="error-msg mt-lg">
        <p>{{ error }}</p>
        <button @click="resetScanner" class="btn-secondary btn-sm">Erneut versuchen</button>
      </div>
    </div>

    <QRScanner 
      v-if="isCameraScanning"
      @scanned="handleQRScanned"
      @close="isCameraScanning = false"
    />
    <div id="temp-qr-reader" style="display: none;"></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { SpotifyAuth } from '../utils/SpotifyAuth';
import QRScanner from './QRScanner.vue';
import SpotifyRemotePlayer from './SpotifyRemotePlayer.vue';
import { Html5Qrcode } from 'html5-qrcode';

const emit = defineEmits<{
  back: [];
}>();

const spotifyAuth = SpotifyAuth.getInstance();

const fileInput = ref<HTMLInputElement | null>(null);
const isProcessing = ref(false);
const currentTrack = ref<any>(null);
const isPlaying = ref(false);
const error = ref('');
const isCameraScanning = ref(false);
const trackId = ref('');

const startCameraScanner = () => {
  error.value = '';
  isCameraScanning.value = true;
};

const handleQRScanned = async (uri: string) => {
  console.log('QR Code gescannt:', uri);
  isCameraScanning.value = false;
  error.value = '';
  await processSpotifyUri(uri);
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  error.value = '';
  isProcessing.value = true;

  try {
    const html5QrCode = new Html5Qrcode("temp-qr-reader");
    const decodedText = await html5QrCode.scanFile(file, true);
    
    await processSpotifyUri(decodedText);
  } catch (err: any) {
    console.error('File scan error:', err);
    error.value = 'Kein QR-Code im Bild gefunden. Bitte versuche es mit einem anderen Bild.';
  } finally {
    isProcessing.value = false;
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  }
};

const processSpotifyUri = async (uri: string) => {
  try {
    isProcessing.value = true;
    error.value = '';

    // Extrahiere Track ID aus URI
    // Format kann sein: spotify:track:ID oder https://open.spotify.com/track/ID
    let extractedTrackId = '';
    
    if (uri.startsWith('spotify:track:')) {
      extractedTrackId = uri.split(':')[2];
    } else if (uri.includes('open.spotify.com/track/')) {
      const match = uri.match(/track\/([a-zA-Z0-9]+)/);
      extractedTrackId = match ? match[1] : '';
    } else {
      extractedTrackId = uri.split(':').pop() || '';
    }

    if (!extractedTrackId) {
      throw new Error('Ungültige Spotify URI');
    }

    trackId.value = extractedTrackId;

    const token = await spotifyAuth.getToken();
    if (!token) {
      throw new Error('Nicht eingeloggt');
    }

    const response = await fetch(`https://api.spotify.com/v1/tracks/${extractedTrackId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Track nicht gefunden');
    }

    currentTrack.value = await response.json();
    isPlaying.value = true;
  } catch (err: any) {
    console.error('Process error:', err);
    error.value = err.message || 'Fehler beim Laden des Songs';
  } finally {
    isProcessing.value = false;
  }
};

const resetScanner = () => {
  currentTrack.value = null;
  isPlaying.value = false;
  error.value = '';
  isCameraScanning.value = false;
  trackId.value = '';
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};
</script>
