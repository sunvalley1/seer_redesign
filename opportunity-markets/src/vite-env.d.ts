/// <reference types="vite/client" />

// Fallback so the IDE resolves these modules when using moduleResolution: "bundler"
declare module '@tanstack/react-query';
declare module 'connectkit';
declare module 'wagmi';

interface ImportMetaEnv {
  readonly VITE_REOWN_PROJECT_ID?: string;
  readonly VITE_GNOSIS_RPC_URL?: string;
  /** IPFS HTTP gateway origin. Defaults to https://cdn.kleros.link */
  readonly VITE_IPFS_GATEWAY?: string;
  /** Seer app origin for discussion / SIWE APIs. Defaults to https://app.seer.pm */
  readonly VITE_SEER_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
