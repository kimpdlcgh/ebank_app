import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'us.safeguardsecurities.app',
  appName: 'Safeguard Securities',
  webDir: 'www',
  server: {
    url: 'https://safeguardsecurities.us',
    cleartext: false,
    androidScheme: 'https',
    iosScheme: 'https',
    // Local page shown when the remote site can't be reached (offline / errors).
    errorPath: 'error.html',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
