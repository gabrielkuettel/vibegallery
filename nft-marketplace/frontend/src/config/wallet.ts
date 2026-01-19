import { NetworkId, WalletId, WalletManager } from '@txnlab/use-wallet-react'
import { Algodv2 } from 'algosdk'

// Hardcoded for testnet production deployment
export const algodClient = new Algodv2('', 'https://testnet-api.4160.nodely.dev', 443)

// Wallet configuration - Pera only (Lute has bugs with use-wallet)
export const walletManager = new WalletManager({
  wallets: [WalletId.PERA],
  defaultNetwork: NetworkId.TESTNET,
})

// Deployed app ID - hardcoded for production (Vercel env vars broken with subdirectories)
export const APP_ID = BigInt('753971040')

// Current network (hardcoded to testnet)
export const CURRENT_NETWORK = 'testnet'
