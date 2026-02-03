<template>
  <div>
    <div class="section-header mt-lg">
      <button @click="$emit('back')" class="btn-secondary btn-sm">Zurück</button>
      <h1>Karte erstellen</h1>
    </div>

    <div class="content-container">
      <input
        v-model="searchQuery"
        @input="debouncedSearch"
        type="text"
        placeholder="Liedname eingeben"
        class="search-input"
      />

      <div v-if="isSearching" class="text-center text-white">Suche...</div>

      <div v-else-if="searchResults.length > 0" class="flex-col">
        <div
          v-for="track in searchResults"
          :key="track.id"
          class="flex card-dark mb-sm"
          @click="selectTrack(track)"
        >
          <img
            v-if="track.album.images[2]"
            :src="track.album.images[2].url"
            :alt="track.name"
            class="track-cover-sm"
            style="margin-right: 20px;"
          />
          <div class="track-details">
            <div class="track-name">{{ track.name }}</div>
            <div class="track-artist">{{ track.artists[0].name }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selectedTrack"  class="flex-col flex-center">
      <div id="card-to-download">
        <h2>Vorderseite</h2>
        <div class="spotify-card text-center">
          <div class="card-header">
            <img
              :src="selectedTrack.album.images[0].url"
              :alt="selectedTrack.name"
              class="track-cover-lg mt-xl mb-xl"
              crossorigin="anonymous"
            />
          </div>
          <div class="">
            <h3 class="track-name" style="color: black;">{{ selectedTrack.name }}</h3>
            <p class="track-artist">{{ selectedTrack.artists[0].name }}</p>
            <p class="track-album">{{ selectedTrack.album.name }}</p>
            <p class="track-year">{{ getReleaseYear(selectedTrack.album.release_date) }}</p>
          </div>
        </div>
        <h2>Rückseite</h2>
        <div class="spotify-card text-center flex-center flex-col">
          <div class="qr-code-container mb-md">
            <canvas ref="qrCanvas"></canvas>
            <p class="track-uri">{{ selectedTrack.uri }}</p>
          </div>
        </div>
      </div>
      <button @click="shareCard" class="btn-secondary btn-lg" :disabled="isGenerating">
        {{ isGenerating ? 'Erstelle Karte...' : 'Erstellen' }}
      </button>      
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { SpotifyAuth } from '../utils/SpotifyAuth';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

const emit = defineEmits<{
  back: [];
}>();

const spotifyAuth = SpotifyAuth.getInstance();

const searchQuery = ref('');
const searchResults = ref<any[]>([]);
const isSearching = ref(false);
const selectedTrack = ref<any>(null);
const qrCanvas = ref<HTMLCanvasElement | null>(null);
const isGenerating = ref(false);

let debounceTimer: ReturnType<typeof setTimeout>;

const debouncedSearch = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  if (!searchQuery.value.trim()) {
    searchResults.value = [];
    return;
  }

  debounceTimer = setTimeout(async () => {
    await performSearch();
  }, 500);
};

const performSearch = async () => {
  if (!searchQuery.value.trim()) return;

  isSearching.value = true;
  try {
    searchResults.value = await spotifyAuth.searchTracks(searchQuery.value);
  } catch (error) {
    console.error('Search failed:', error);
    searchResults.value = [];
  } finally {
    isSearching.value = false;
  }
};

const selectTrack = async (track: any) => {
  selectedTrack.value = track;
  searchResults.value = [];
  await nextTick();
  await generateQRCode(track.uri);
};

const generateQRCode = async (uri: string) => {
  if (!qrCanvas.value) return;

  try {
    await QRCode.toCanvas(qrCanvas.value, uri, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  } catch (error) {
    console.error('QR Code generation failed:', error);
  }
};

const getReleaseYear = (dateString: string) => {
  return new Date(dateString).getFullYear();
};

const generateCardImage = async (): Promise<string> => {
  const cardElement = document.getElementById('card-to-download');
  if (!cardElement) throw new Error('Card element not found');

  const canvas = await html2canvas(cardElement, {
    backgroundColor: null, //transparenter Hintergrund
    scale: 2,
    logging: false,
    useCORS: true,
  });

  return canvas.toDataURL('image/png');
};

const shareCard = async () => {
  if (!Capacitor.isNativePlatform()) {
    // Im Web einfach downloaden TODO
    return;
  }

  isGenerating.value = true;

  try {
    const dataUrl = await generateCardImage();
    const base64Data = dataUrl.split(',')[1];
    const fileName = `spotify-card-${Date.now()}.png`;

    // Speichere temporär
    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Cache,
    });

    // Teile über Share API
    await Share.share({
      title: 'Spotify Spielkarte',
      text: `Spielkarte: ${selectedTrack.value.name} - ${selectedTrack.value.artists[0].name}`,
      url: result.uri,
      dialogTitle: 'Spielkarte teilen',
    });

  } catch (error) {
    console.error('Share failed:', error);
    alert('Fehler beim Teilen: ' + (error as Error).message);
  } finally {
    isGenerating.value = false;
  }
};
</script>

<style scoped>
.search-input {
  width: 100%;
  padding: 15px 20px;
  font-size: 1.1em;
  border: none;
  border-radius: 30px;
  background-color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.spotify-card {
  background: white;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  margin-bottom: 20px;
  /* Fixe Größen besser zum Drucken */
  width: 350px;
  height: 600px;
  border: 2px solid black;
}
</style>