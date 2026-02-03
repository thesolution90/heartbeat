<template>
  <div class="page-container">
    <div v-if="!isLoggedIn" class="flex-col flex-center text-center page-container">
      <h1>Heartbeat</h1>
      <p class="mb-xl mt-md">Rate deine Lieblingssong</p>
      <button @click="handleLogin" :disabled="isLoggingIn" class="btn-secondary btn-lg">
        {{ isLoggingIn ? 'Anmelden...' : 'Anmelden über Spotify' }}
      </button>
    </div>

    <MainMenu
      v-else-if="currentPage === 'menu'"
      :user-profile="userProfile"
      @navigate="navigateTo"
      @logout="handleLogout"
    />

    <CreateCard
      v-else-if="currentPage === 'create'"
      @back="navigateTo('menu')"
    />

    <PlayGame
      v-else-if="currentPage === 'play'"
      @back="navigateTo('menu')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { SpotifyAuth } from '../utils/SpotifyAuth';
import { App } from '@capacitor/app';
import MainMenu from './MainManu.vue';
import CreateCard from './CreateCard.vue';
import PlayGame from './PlayGame.vue';

const spotifyAuth = SpotifyAuth.getInstance();

const isLoggedIn = ref(false);
const isLoggingIn = ref(false);
const userProfile = ref<any>(null);
const currentPage = ref<'menu' | 'create' | 'play'>('menu');

onMounted(async () => {
  isLoggedIn.value = await spotifyAuth.isLoggedIn();
  
  if (isLoggedIn.value) {
    await loadUserProfile();
  }

  App.addListener('appUrlOpen', async (event) => {
    if (event.url.startsWith('capacitor://callback') || event.url.startsWith('http://127.0.0.1:4173/') ) {
      const success = await spotifyAuth.handleCallback(event.url);
      if (success) {
        isLoggedIn.value = true;
        isLoggingIn.value = false;
        await loadUserProfile();
      }
    }
  });
});

const handleLogin = async () => {
  isLoggingIn.value = true;
  const success = await spotifyAuth.login();
  if (success) {
    isLoggedIn.value = true;
    await loadUserProfile();
  }
  isLoggingIn.value = false;
};

const handleLogout = async () => {
  await spotifyAuth.logout();
  isLoggedIn.value = false;
  userProfile.value = null;
  currentPage.value = 'menu';
};

const loadUserProfile = async () => {
  try {
    userProfile.value = await spotifyAuth.getUserProfile();
  } catch (error) {
    console.error('Failed to load user profile:', error);
  }
};

const navigateTo = (page: 'menu' | 'create' | 'play') => {
  currentPage.value = page;
};
</script>
