import { useCallback, useMemo } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount'
import { NftMarketplaceClient } from '../contracts/NftMarketplaceClient'
import { APP_ID, algodClient } from '../config/wallet'
import algosdk, { getApplicationAddress } from 'algosdk'

// Box MBR for listings (must match contract constant)
const BOX_MBR = 35300n

// Box prefix for listings (from contract: "l")
const LISTING_BOX_PREFIX = new Uint8Array([108]) // "l" in ASCII

// Derive app address from APP_ID
const APP_ADDRESS = APP_ID !== 0n ? getApplicationAddress(APP_ID) : ''

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
  // Only use transactionSigner from useWallet - algodClient is broken and returns localhost
  const { activeAddress, transactionSigner } = useWallet()

  // Create AlgorandClient using OUR algodClient from wallet.ts (not useWallet's broken one)
  const algorand = useMemo(() => {
    const client = AlgorandClient.fromClients({ algod: algodClient })

    if (activeAddress && transactionSigner) {
      client.setSigner(activeAddress, transactionSigner)
    }

    return client
  }, [activeAddress, transactionSigner])

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

    // Check if buyer needs to opt in to the asset
    const accountInfo = await algorand.account.getInformation(activeAddress)
    const isOptedIn = accountInfo.assets?.some(a => BigInt(a.assetId) === assetId) ?? false

    // Create payment transaction for the purchase
    const payment = await algorand.createTransaction.payment({
      sender: activeAddress,
      receiver: marketplaceClient.appAddress,
      amount: AlgoAmount.MicroAlgo(price),
    })

    // Build atomic group for single signature
    let group = algorand.newGroup()

    // Add asset opt-in if needed
    if (!isOptedIn) {
      group = group.addAssetOptIn({
        sender: activeAddress,
        assetId: assetId,
      })
    }

    // Add payment + buyNft app call as atomic group
    const result = await group
      .addAppCallMethodCall(
        await marketplaceClient.params.buyNft({
          args: {
            payment: payment,
            seller: seller,
            asset: assetId,
          },
          extraFee: AlgoAmount.MicroAlgo(4000n),
        })
      )
      .send({ populateAppCallResources: true })

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

  // Get all active listings by reading box storage directly (no indexer needed)
  const getActiveListings = useCallback(async (): Promise<ActiveListing[]> => {
    // Use our algodClient from wallet.ts (not useWallet's broken one)
    const readClient = algodClient

    const listings: ActiveListing[] = []

    try {
      // Get all boxes for the app
      const boxesResponse = await readClient.getApplicationBoxes(Number(APP_ID)).do()
      const boxes = boxesResponse.boxes || []

      if (boxes.length === 0) {
        return []
      }

      // Process each box
      for (const box of boxes) {
        try {
          // Box name might be base64 string or Uint8Array depending on SDK version
          let boxName: Uint8Array
          if (typeof box.name === 'string') {
            // Browser-compatible base64 decoding
            const binaryString = atob(box.name)
            boxName = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
              boxName[i] = binaryString.charCodeAt(i)
            }
          } else {
            boxName = box.name
          }

          // Box name is: prefix (1 byte "l") + seller (32 bytes) + assetId (8 bytes)
          if (boxName.length !== 41) continue // 1 + 32 + 8

          // Check prefix
          if (boxName[0] !== LISTING_BOX_PREFIX[0]) continue

          // Extract seller address (bytes 1-32)
          const sellerBytes = boxName.slice(1, 33)
          const seller = algosdk.encodeAddress(sellerBytes)

          // Extract asset ID (bytes 33-40, big-endian uint64)
          const assetIdBytes = boxName.slice(33, 41)
          const assetId = new DataView(assetIdBytes.buffer, assetIdBytes.byteOffset, 8).getBigUint64(0)

          // Read the box value to get listing details
          const boxValue = await readClient.getApplicationBoxByName(Number(APP_ID), boxName).do()

          // Value might also be base64 string or Uint8Array
          let value: Uint8Array
          if (typeof boxValue.value === 'string') {
            const binaryString = atob(boxValue.value)
            value = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
              value[i] = binaryString.charCodeAt(i)
            }
          } else {
            value = boxValue.value
          }

          // Parse listing struct: seller (32 bytes) + price (8 bytes) + isActive (1 byte)
          // Note: seller is redundant in value since it's in the key
          const priceBytes = value.slice(32, 40)
          const price = new DataView(priceBytes.buffer, priceBytes.byteOffset, 8).getBigUint64(0)
          // AVM booleans: 0 = false, any non-zero = true (often 0x80)
          const isActive = value[40] !== 0

          if (!isActive) continue

          // Get asset info
          const assetInfo = await readClient.getAssetByID(Number(assetId)).do()
          const params = assetInfo.params ?? assetInfo

          listings.push({
            seller,
            assetId,
            price,
            assetInfo: {
              name: params.name,
              unitName: params.unitName,
              url: params.url,
            },
          })
        } catch (e) {
          console.error('Failed to process box:', e)
        }
      }
    } catch (e) {
      console.error('Failed to get active listings:', e)
      throw e
    }

    return listings
  }, []) // No dependencies - uses hardcoded read-only client

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
