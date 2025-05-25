export const ZEGO_CONFIG = {
  appID: Number(process.env.ZEGO_APP_ID) || 2013980891, // Default to test app ID if env var not set
  serverSecret: process.env.ZEGO_SERVER_SECRET || '', // Replace with your actual ZegoCloud Server Secret
  tokenServerUrl: 'https://mini-game-test-server.zego.im/api/token', // Replace with your token server URL
}; 