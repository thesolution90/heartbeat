<template>
  <div class="">
    <div class="text-center text-white mb-xl mt-md">
      <h1>Heartbeat</h1>
      <p class="mt-md">Nutzer: {{ userProfile?.display_name || 'User' }}</p>
      <button @click="handleLogout" class="btn-secondary btn-sm mt-lg">Abmelden</button>
    </div>

    <div class="menu-options">
      <div class="card card-interactive text-center mt-lg" @click="$emit('navigate', 'create')">
        <h2>Karte erstellen</h2>
        <p class="mt-lg">Suche einen Song und erstelle eine Spielkarte</p>
      </div>

      <div class="card card-interactive text-center mt-lg" @click="$emit('navigate', 'play')">
        <h2>Lied laden</h2>
        <p class="mt-lg">Scanne einen QR-Code und spiele den Song</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

defineProps<{
  userProfile: any;
}>();

const emit = defineEmits<{
  navigate: [page: 'menu' | 'create' | 'play'];
  logout: [];
}>();

const handleLogout = () => {
  emit('logout');
};
</script>
