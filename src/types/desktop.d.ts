export {};
declare global {
  interface Window {
    savingsOSDesktop?: {
      onBeforeClose: (handler: () => Promise<void>) => () => void;
    };
  }
}
