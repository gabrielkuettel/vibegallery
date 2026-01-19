import { NetworkId, WalletId, WalletManager } from '@txnlab/use-wallet-react'

// Network configuration - hardcoded for production (Vercel env vars broken with subdirectories)
const NETWORK: string = 'testnet'

// Map network string to NetworkId
const getNetworkId = (network: string): NetworkId => {
  switch (network) {
    case 'testnet':
      return NetworkId.TESTNET
    case 'mainnet':
      return NetworkId.MAINNET
    default:
      return NetworkId.LOCALNET
  }
}

// Wallet configuration for the NFT Marketplace
export const walletManager = new WalletManager({
  wallets: NETWORK === 'localnet'
    ? [
        WalletId.PERA,
        WalletId.LUTE,
        {
          id: WalletId.KMD,
          options: {
            wallet: 'unencrypted-default-wallet',
          },
        } as const,
      ]
    : [WalletId.PERA, WalletId.LUTE],
  defaultNetwork: getNetworkId(NETWORK),
  networks: {
    [NetworkId.LOCALNET]: {
      algod: {
        token: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        baseServer: 'http://localhost',
        port: 4001,
      },
    },
    [NetworkId.TESTNET]: {
      algod: {
        token: '',
        baseServer: 'https://testnet-api.4160.nodely.dev',
        port: 443,
      },
    },
    [NetworkId.MAINNET]: {
      algod: {
        token: '',
        baseServer: 'https://mainnet-api.4160.nodely.dev',
        port: 443,
      },
    },
  },
})

// Deployed app ID - hardcoded for production (Vercel env vars broken with subdirectories)
export const APP_ID = BigInt('753971040')

// Export the current network for use in other modules
export const CURRENT_NETWORK = NETWORK
