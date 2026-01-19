import { NetworkConfigBuilder, NetworkId, WalletId, WalletManager } from '@txnlab/use-wallet-react'
import { Algodv2 } from 'algosdk'

// Network configuration - hardcoded for production
type NetworkType = 'localnet' | 'testnet' | 'mainnet'
const NETWORK = 'testnet' as NetworkType

// Algod configuration by network
const ALGOD_CONFIG = {
  localnet: {
    token: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    server: 'http://localhost',
    port: 4001,
  },
  testnet: {
    token: '',
    server: 'https://testnet-api.4160.nodely.dev',
    port: 443,
  },
  mainnet: {
    token: '',
    server: 'https://mainnet-api.4160.nodely.dev',
    port: 443,
  },
}

// Create OUR OWN algod client - don't trust useWallet's algodClient (it's broken)
const algodConfig = ALGOD_CONFIG[NETWORK]
export const algodClient = new Algodv2(algodConfig.token, algodConfig.server, algodConfig.port)

// Build network config for use-wallet (even though it doesn't seem to work properly)
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
