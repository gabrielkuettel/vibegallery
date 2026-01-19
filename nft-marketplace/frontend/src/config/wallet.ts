import { NetworkConfigBuilder, NetworkId, WalletId, WalletManager } from '@txnlab/use-wallet-react'

// Network configuration - hardcoded for production
type NetworkType = 'localnet' | 'testnet' | 'mainnet'
const NETWORK = 'testnet' as NetworkType

// Build network config explicitly - don't rely on "defaults" that don't work
const networks = new NetworkConfigBuilder()
  .localnet({
    algod: {
      baseServer: 'http://localhost',
      port: '4001',
      token: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    },
  })
  .testnet({
    algod: {
      baseServer: 'https://testnet-api.4160.nodely.dev',
      port: '443',
      token: '',
    },
  })
  .mainnet({
    algod: {
      baseServer: 'https://mainnet-api.4160.nodely.dev',
      port: '443',
      token: '',
    },
  })
  .build()

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
  networks,
  defaultNetwork: NETWORK === 'testnet' ? NetworkId.TESTNET
                : NETWORK === 'mainnet' ? NetworkId.MAINNET
                : NetworkId.LOCALNET,
})

// Deployed app ID - hardcoded for production (Vercel env vars broken with subdirectories)
export const APP_ID = BigInt('753971040')

// Export the current network for use in other modules
export const CURRENT_NETWORK = NETWORK
