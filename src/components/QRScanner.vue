<template>
  <div class="qr-scanner">
    <div v-if="isScanning" class="scanner-container">
      <div class="camera-preview-container">
        <div class="scanner-overlay">
          <div class="scan-region">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <div class="corner bottom-left"></div>
            <div class="corner bottom-right"></div>
          </div>
          <p class="scan-instruction">QR-Code im Rahmen positionieren</p>
        </div>
      </div>
      
      <canvas ref="canvas" style="display: none;"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, onMounted } from 'vue';
import { CameraPreview } from '@capacitor-community/camera-preview';
import QrScanner from 'qr-scanner';

const emit = defineEmits(['scanned', 'close']);

const isScanning = ref(false);
let scanInterval: NodeJS.Timeout | null = null;

const startScan = async () => {
  try {
    await CameraPreview.start({
      position: 'rear',
      width: window.innerWidth,
      height: window.innerHeight,
      toBack: false,
      paddingBottom: 0,
      rotateWhenOrientationChanged: true,
      enableHighResolution: true,
      enableZoom: false,
    });

    isScanning.value = true;

    scanInterval = setInterval(async () => {
      await captureAndScan();
    }, 500); // Alle 500ms ein Frame scannen

  } catch (error: any) {
    console.error('Fehler beim Starten der Kamera:', error);
    alert('Fehler beim Starten der Kamera: ' + error.message);
    await stopScan();
  }
};

const captureAndScan = async () => {
  try {
    const result = await CameraPreview.capture({
      quality: 50,
      width: 640,
      height: 480,
    });

    const img = new Image();
    img.src = `data:image/jpeg;base64,${result.value}`;
    
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    try {
      const qrCode = await QrScanner.scanImage(img, { returnDetailedScanResult: true });
      
      if (qrCode) {
        emit('scanned', qrCode.data);
        await stopScan();
      }
    } catch (err) {
    }

  } catch (error) {
    console.error('Scan-Fehler:', error);
  }
};

const stopScan = async () => {
  try {
    if (scanInterval) {
      clearInterval(scanInterval);
      scanInterval = null;
    }
    
    await CameraPreview.stop();
    isScanning.value = false;
  } catch (error) {
    console.error('Fehler beim Stoppen:', error);
  }
};

onMounted(async () => {
  await startScan();
});

onUnmounted(async () => {
  if (isScanning.value) {
    await stopScan();
  }
});
</script>

<style scoped>
.qr-scanner {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10000;
  background-color: black;
}

.scanner-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
}

.camera-preview-container {
  width: 100%;
  height: 100%;
}

.scanner-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  max-width: 300px;
  z-index: 10000;
}

.scan-region {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border: 2px solid rgba(255, 255, 255, 0.5);
}

.corner {
  position: absolute;
  width: 30px;
  height: 30px;
  border: 3px solid #4CAF50;
}

.corner.top-left {
  top: -2px;
  left: -2px;
  border-right: none;
  border-bottom: none;
}

.corner.top-right {
  top: -2px;
  right: -2px;
  border-left: none;
  border-bottom: none;
}

.corner.bottom-left {
  bottom: -2px;
  left: -2px;
  border-right: none;
  border-top: none;
}

.corner.bottom-right {
  bottom: -2px;
  right: -2px;
  border-left: none;
  border-top: none;
}

.scan-instruction {
  color: white;
  font-size: 16px;
  margin-top: 20px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  text-align: center;
}

.stop-button {
  position: absolute;
  bottom: 50px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #f44336;
  color: white;
  padding: 15px 30px;
  font-size: 18px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  z-index: 10001;
}

.stop-button:active {
  background-color: #da190b;
}
</style>