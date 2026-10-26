import { getDefaultConfig } from 'connectkit';
import { createConfig } from 'wagmi';
import { gnosis, mainnet } from 'wagmi/chains';
import { fallback, http, type Chain } from 'viem';

const walletConnectProjectId =
  import.meta.env.VITE_REOWN_PROJECT_ID ?? '';

if (!walletConnectProjectId) {
  console.warn(
    'VITE_REOWN_PROJECT_ID is not set. Get a project ID at https://dashboard.reown.com and add it to .env'
  );
}
const getTransport = (chain: Chain, customRpc?: string) => {
  const publicRpc = chain.rpcUrls.public?.http[0];

  if (customRpc && publicRpc) {
    return fallback([http(customRpc), http(publicRpc)]);
  }

  if (customRpc) {
    return http(customRpc);
  }

  if (publicRpc) {
    return http(publicRpc);
  }

  throw new Error(`No RPC URL available for chain ${chain.id}`);
};

const gnosisCustomRpcUrl = import.meta.env.VITE_GNOSIS_RPC_URL;
const gnosisPrimaryRpcUrl =
  gnosisCustomRpcUrl ?? gnosis.rpcUrls.default.http[0];
const gnosisTransport = getTransport(gnosis, gnosisCustomRpcUrl);


export const networks = [gnosis] as const;

export const wagmiConfig = createConfig(
  getDefaultConfig({
    // mainnet is included so discussion author labels can resolve ENS names
    chains: [...networks, mainnet],
    transports: {
      [gnosis.id]: gnosisTransport,
      [mainnet.id]: http(),
    },
    walletConnectProjectId,
    appName: 'Seer · Opportunity Markets',
    appDescription:
      'Community proposals become market outcomes. Trade on which ideas get chosen, and earn rewards when yours wins.',
    appUrl: typeof window !== 'undefined' ? window.location.origin : '',
    appIcon:
      typeof window !== 'undefined'
        ? `${window.location.origin}/seer-mark.png`
        : 'https://avatars.githubusercontent.com/u/179229932',
    ssr: false,
  })
);

if (typeof window !== 'undefined') {
  import('@seer-pm/sdk').then(({ configurePublicRpcUrls }) => {
    configurePublicRpcUrls({
      [gnosis.id]: gnosisPrimaryRpcUrl,
    });
  });
}
