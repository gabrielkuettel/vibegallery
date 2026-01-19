import { useCallback, useMemo } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount'
import { NftMarketplaceClient } from '../contracts/NftMarketplaceClient'
import { APP_ID } from '../config/wallet'
import algosdk from 'algosdk'

// Box MBR for listings (must match contract constant)
const BOX_MBR = 35300n

// Marketplace app address (derived from APP_ID 1592)
const APP_ADDRESS = 'XPNRO3XKLQGBW2PQY6CMAZ5MQX4TK2YJT2O3GMJ4PABHO2NHYVDVSGXIPA'

// Listing type for the frontend
export interface ActiveListing {
  seller: string
  assetId: bigint
  price: bigint
  assetInfo?: {
    name?: string
    unitName?: string
    url?: string
  }
}

export function useMarketplace() {
  const { activeAddress, transactionSigner, algodClient } = useWallet()

  // Create AlgorandClient configured with the wallet's signer
  const algorand = useMemo(() => {
    if (!algodClient) return null

    const client = AlgorandClient.fromClients({ algod: algodClient })

    if (activeAddress && transactionSigner) {
      client.setSigner(activeAddress, transactionSigner)
    }

    return client
  }, [algodClient, activeAddress, transactionSigner])

  // Create typed marketplace client
  const marketplaceClient = useMemo(() => {
    if (!algorand || !activeAddress || (APP_ID as bigint) === 0n) return null

    return algorand.client.getTypedAppClientById(NftMarketplaceClient, {
      appId: APP_ID,
      defaultSender: activeAddress,
    })
  }, [algorand, activeAddress])

  // List an NFT for sale
  const listNft = useCallback(async (assetId: bigint, price: bigint) => {
    if (!marketplaceClient || !algorand || !activeAddress) {
      throw new Error('Wallet not connected or app not configured')
    }

    // First, ensure the app is opted into the asset
    const mbrPayTxn = await algorand.createTransaction.payment({
      sender: activeAddress,
      receiver: marketplaceClient.appAddress,
      amount: AlgoAmount.MicroAlgo(100000n), // 0.1 ALGO for asset opt-in
    })

    // Try to opt the app into the asset (may already be opted in)
    try {
      await marketplaceClient.send.optInToAsset({
        args: {
          mbrPay: mbrPayTxn,
          asset: assetId,
        },
        extraFee: AlgoAmount.MicroAlgo(1000n),
        populateAppCallResources: true,
      })
    } catch (e) {
      // May already be opted in, continue
    }

    // Create transactions for listing
    const listMbrPay = await algorand.createTransaction.payment({
      sender: activeAddress,
      receiver: marketplaceClient.appAddress,
      amount: AlgoAmount.MicroAlgo(BOX_MBR),
    })

    const nftXfer = await algorand.createTransaction.assetTransfer({
      sender: activeAddress,
      receiver: marketplaceClient.appAddress,
      assetId: assetId,
      amount: 1n,
    })

    // List the NFT
    const result = await marketplaceClient.send.listNft({
      args: {
        mbrPay: listMbrPay,
        nftXfer: nftXfer,
        price: price,
      },
      populateAppCallResources: true,
    })

    return result
  }, [marketplaceClient, algorand, activeAddress])

  // Buy an NFT
  const buyNft = useCallback(async (seller: string, assetId: bigint, price: bigint) => {
    if (!marketplaceClient || !algorand || !activeAddress) {
      throw new Error('Wallet not connected or app not configured')
    }

    // First opt the buyer into the asset if not already
    try {
      await algorand.send.assetOptIn({
        sender: activeAddress,
        assetId: assetId,
      })
    } catch (e) {
      // May already be opted in
    }

    // Create payment for the purchase
    const payment = await algorand.createTransaction.payment({
      sender: activeAddress,
      receiver: marketplaceClient.appAddress,
      amount: AlgoAmount.MicroAlgo(price),
    })

    // Buy the NFT
    const result = await marketplaceClient.send.buyNft({
      args: {
        payment: payment,
        seller: seller,
        asset: assetId,
      },
      extraFee: AlgoAmount.MicroAlgo(4000n), // Cover inner transaction fees
      populateAppCallResources: true,
    })

    return result
  }, [marketplaceClient, algorand, activeAddress])

  // Cancel a listing
  const cancelListing = useCallback(async (assetId: bigint) => {
    if (!marketplaceClient) {
      throw new Error('Wallet not connected or app not configured')
    }

    const result = await marketplaceClient.send.cancelListing({
      args: { asset: assetId },
      extraFee: AlgoAmount.MicroAlgo(2000n), // Cover inner transaction fees
      populateAppCallResources: true,
    })

    return result
  }, [marketplaceClient])

  // Update listing price
  const updatePrice = useCallback(async (assetId: bigint, newPrice: bigint) => {
    if (!marketplaceClient) {
      throw new Error('Wallet not connected or app not configured')
    }

    const result = await marketplaceClient.send.updatePrice({
      args: { asset: assetId, newPrice: newPrice },
      populateAppCallResources: true,
    })

    return result
  }, [marketplaceClient])

  // Get listing info
  const getListing = useCallback(async (seller: string, assetId: bigint) => {
    if (!marketplaceClient) {
      throw new Error('App not configured')
    }

    const result = await marketplaceClient.send.getListing({
      args: { seller: seller, assetId: assetId },
      populateAppCallResources: true,
    })

    return result.return
  }, [marketplaceClient])

  // Check if listing exists
  const listingExists = useCallback(async (seller: string, assetId: bigint) => {
    if (!marketplaceClient) {
      throw new Error('App not configured')
    }

    const result = await marketplaceClient.send.listingExists({
      args: { seller: seller, assetId: assetId },
      populateAppCallResources: true,
    })

    return result.return
  }, [marketplaceClient])

  // Get all active listings by checking the app's assets and finding sellers via indexer
  const getActiveListings = useCallback(async (): Promise<ActiveListing[]> => {
    if (!algodClient) {
      throw new Error('Algod client not available')
    }

    const listings: ActiveListing[] = []

    try {
      // Get the marketplace app's account info to find assets it holds
      const appInfo = await algodClient.accountInformation(APP_ADDRESS).do()
      const assets = appInfo.assets || []

      if (assets.length === 0) {
        return []
      }

      // Create a readonly AlgorandClient (no signer needed for reading)
      const readonlyClient = AlgorandClient.fromClients({ algod: algodClient })
      const readonlyMarketplace = readonlyClient.client.getTypedAppClientById(NftMarketplaceClient, {
        appId: APP_ID,
        // Use the app address as a dummy sender for readonly calls
        defaultSender: APP_ADDRESS,
      })

      // Create indexer client for localnet
      const indexer = new algosdk.Indexer('', 'http://localhost', 8980)

      // For each asset the app holds, find who sent it (the seller)
      for (const asset of assets) {
        // Handle both camelCase and kebab-case property names (SDK version differences)
        const rawAssetId = asset.assetId ?? asset['asset-id'] ?? asset.assetID
        const rawAmount = asset.amount ?? 0

        if (rawAssetId === undefined) {
          continue
        }

        const assetId = BigInt(rawAssetId)
        const amount = BigInt(rawAmount)

        // Only consider assets where app holds exactly 1 (listed NFTs)
        if (amount !== 1n) continue

        try {
          // Search for asset transfer transactions TO the app for this asset
          const txns = await indexer
            .searchForTransactions()
            .assetID(Number(assetId))
            .txType('axfer')
            .address(APP_ADDRESS)
            .addressRole('receiver')
            .do()

          // Find the most recent transfer that sent 1 unit to the app (the listing)
          for (const txn of txns.transactions || []) {
            // Handle both camelCase and kebab-case (SDK version differences)
            const xfer = txn.assetTransferTransaction ?? txn['asset-transfer-transaction']

            // Compare amount as numbers since it might be number or bigint
            const xferAmount = Number(xfer?.amount ?? 0)
            if (xfer && xferAmount === 1 && xfer.receiver === APP_ADDRESS) {
              const seller = txn.sender

              try {
                // Use readonly client to get listing details via simulation
                const listingResult = await readonlyMarketplace.newGroup().getListing({
                  args: { seller: seller, assetId: assetId },
                }).simulate({
                  allowUnnamedResources: true,
                  skipSignatures: true,
                  fixSigners: true,
                })

                const returnValue = listingResult.returns?.[0]
                if (returnValue) {
                  // Get asset info
                  const assetInfo = await algodClient.getAssetByID(Number(assetId)).do()
                  const params = assetInfo.params ?? assetInfo

                  listings.push({
                    seller: seller,
                    assetId: assetId,
                    price: BigInt(returnValue.price),
                    assetInfo: {
                      name: params.name,
                      unitName: params.unitName ?? params['unit-name'],
                      url: params.url,
                    },
                  })
                  break // Found the listing for this asset
                }
              } catch (e) {
                // Listing may not exist anymore, skip
                console.error('getListing failed:', e)
              }
            }
          }
        } catch (e) {
          console.error(`Failed to fetch transactions for asset ${assetId}:`, e)
        }
      }
    } catch (e) {
      console.error('Failed to get active listings:', e)
      throw e
    }

    return listings
  }, [algodClient])

  return {
    isConnected: !!activeAddress,
    isConfigured: (APP_ID as bigint) !== 0n,
    appAddress: APP_ADDRESS,
    marketplaceClient,
    listNft,
    buyNft,
    cancelListing,
    updatePrice,
    getListing,
    listingExists,
    getActiveListings,
  }
}
