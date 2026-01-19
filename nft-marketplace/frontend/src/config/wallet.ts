import { NetworkId, WalletId, WalletManager } from '@txnlab/use-wallet-react'

// Wallet configuration for the NFT Marketplace
export const walletManager = new WalletManager({
  wallets: [
    WalletId.PERA,
    WalletId.LUTE,
    // KMD for localnet testing
    {
      id: WalletId.KMD,
      options: {
        wallet: 'unencrypted-default-wallet',
      },
    },
  ],
  defaultNetwork: NetworkId.LOCALNET,
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

// Deployed app ID - update after deploying the contract
export const APP_ID = 1592n
