import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'SlotLab',
  webDir: 'www',
  server: {
    url: 'https://slotlab.netlify.app',
    cleartext: false,
  },
};
export default config;
