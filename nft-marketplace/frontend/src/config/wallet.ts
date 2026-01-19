import { NetworkId, WalletId, WalletManager } from '@txnlab/use-wallet-react'

// Network configuration - hardcoded for production
const NETWORK: 'localnet' | 'testnet' | 'mainnet' = 'testnet'

// Wallet configuration for the NFT Marketplace
// use-wallet has built-in Nodely configs for testnet/mainnet - no need to specify algod
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
  defaultNetwork: NetworkId.TESTNET,
  // Only specify custom config for localnet; testnet/mainnet use built-in Nodely defaults
  ...(NETWORK === 'localnet' && {
    networks: {
      [NetworkId.LOCALNET]: {
        algod: {
          token: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          baseServer: 'http://localhost',
          port: 4001,
        },
      },
    },
  }),
})

// Deployed app ID - hardcoded for production (Vercel env vars broken with subdirectories)
export const APP_ID = BigInt('753971040')

// Export the current network for use in other modules
export const CURRENT_NETWORK = NETWORK
