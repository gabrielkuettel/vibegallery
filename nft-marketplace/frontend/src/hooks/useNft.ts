import { useCallback, useMemo } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'

export interface NftMetadata {
  name: string
  unitName: string
  description?: string
  imageUrl?: string
}

export interface OwnedAsset {
  assetId: bigint
  balance: bigint
  name?: string
  unitName?: string
  url?: string
}

export function useNft() {
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

  // Create a new NFT (ASA)
  const createNft = useCallback(async (metadata: NftMetadata) => {
    if (!algorand || !activeAddress) {
      throw new Error('Wallet not connected')
    }

    // Create the NFT as an ASA with total supply of 1 and 0 decimals
    const result = await algorand.send.assetCreate({
      sender: activeAddress,
      total: 1n,
      decimals: 0,
      assetName: metadata.name,
      unitName: metadata.unitName,
      url: metadata.imageUrl || '',
      // For ARC-69 metadata, you would encode the metadata in the note field
      // For simplicity, we're using basic ASA parameters
    })

    return {
      assetId: result.assetId,
      txId: result.txIds[0],
    }
  }, [algorand, activeAddress])

  // Get owned NFTs (ASAs with balance > 0)
  const getOwnedNfts = useCallback(async (): Promise<OwnedAsset[]> => {
    if (!algorand || !activeAddress) {
      return []
    }

    const accountInfo = await algorand.account.getInformation(activeAddress)
    const assets = accountInfo.assets || []

    // Filter for assets with balance > 0 (owned NFTs)
    const ownedAssets: OwnedAsset[] = []

    for (const asset of assets) {
      const balance = (asset as { balance?: bigint; amount?: bigint }).balance ??
                     (asset as { amount?: bigint }).amount ?? 0n

      if (balance > 0n) {
        try {
          // Get asset info for name/unitName
          const assetInfo = await algorand.asset.getById(BigInt(asset.assetId))
          ownedAssets.push({
            assetId: BigInt(asset.assetId),
            balance: balance,
            name: assetInfo.assetName,
            unitName: assetInfo.unitName,
            url: assetInfo.url,
          })
        } catch (e) {
          // If we can't get asset info, still include it
          ownedAssets.push({
            assetId: BigInt(asset.assetId),
            balance: balance,
          })
        }
      }
    }

    return ownedAssets
  }, [algorand, activeAddress])

  // Get asset info by ID
  const getAssetInfo = useCallback(async (assetId: bigint) => {
    if (!algorand) {
      throw new Error('Algorand client not available')
    }

    const assetInfo = await algorand.asset.getById(assetId)
    return {
      assetId: assetId,
      name: assetInfo.assetName,
      unitName: assetInfo.unitName,
      total: assetInfo.total,
      decimals: assetInfo.decimals,
      creator: assetInfo.creator,
      url: assetInfo.url,
    }
  }, [algorand])

  // Opt into an asset
  const optInToAsset = useCallback(async (assetId: bigint) => {
    if (!algorand || !activeAddress) {
      throw new Error('Wallet not connected')
    }

    await algorand.send.assetOptIn({
      sender: activeAddress,
      assetId: assetId,
    })
  }, [algorand, activeAddress])

  return {
    createNft,
    getOwnedNfts,
    getAssetInfo,
    optInToAsset,
    isConnected: !!activeAddress,
  }
}
