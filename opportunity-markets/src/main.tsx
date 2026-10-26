/// <reference types="vite/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { Buffer } from 'buffer';
import { Slide, ToastContainer } from 'react-toastify';
import { ConnectKitProvider } from 'connectkit';
import { configureCredits, initApiHost } from '@seer-pm/sdk';
import App from './App';
import { wagmiConfig } from './config/wagmi';
import { getSeerAppUrl } from './lib/seerAuth';
import './styles/toastify-slide.css';
import './index.css';
import '@seer-pm/discussions/style.css';

configureCredits('OPPORTUNITY_CREDITS');
initApiHost(getSeerAppUrl());

const queryClient = new QueryClient();

// ensure Buffer exists on globalThis for deps that expect it
(globalThis as any).Buffer = (globalThis as any).Buffer || Buffer;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          <App />
          <ToastContainer
            position="top-center"
            theme="dark"
            transition={Slide}
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            draggable
            toastClassName="lot-toast"
          />
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
