import { useState, useEffect } from 'react'
import { useNft, OwnedAsset } from '../hooks/useNft'
import { useMarketplace } from '../hooks/useMarketplace'

interface MyListing {
  assetId: bigint
  price: bigint
  assetInfo?: OwnedAsset
}

export function MyNfts() {
  const { getOwnedNfts, getAssetInfo, isConnected } = useNft()
  const { cancelListing, updatePrice, isConfigured } = useMarketplace()
  const [nfts, setNfts] = useState<OwnedAsset[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [editingPrice, setEditingPrice] = useState<{ assetId: bigint; price: string } | null>(null)

  const loadNfts = async () => {
    if (!isConnected) return

    setIsLoading(true)
    setError(null)

    try {
      const owned = await getOwnedNfts()
      // Only show VIBE NFTs (minted through this app)
      const vibeNfts = owned.filter(nft => nft.unitName === 'VIBE')
      setNfts(vibeNfts)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load NFTs')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadNfts()
  }, [isConnected])

  const handleCancelListing = async (assetId: bigint) => {
    const key = `cancel-${assetId}`
    setActionLoading(key)
    setError(null)

    try {
      await cancelListing(assetId)
      await loadNfts()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cancel listing')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpdatePrice = async (assetId: bigint, newPrice: string) => {
    if (!newPrice || parseFloat(newPrice) <= 0) {
      setError('Please enter a valid price')
      return
    }

    const key = `update-${assetId}`
    setActionLoading(key)
    setError(null)

    try {
      const priceInMicroAlgo = BigInt(Math.floor(parseFloat(newPrice) * 1_000_000))
      await updatePrice(assetId, priceInMicroAlgo)
      setEditingPrice(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update price')
    } finally {
      setActionLoading(null)
    }
  }

  if (!isConnected) {
    return (
      <div className="my-nfts">
        <h2>My NFTs</h2>
        <p>Connect your wallet to view your NFTs</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="my-nfts">
        <h2>My NFTs</h2>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="my-nfts">
      <div className="section-header">
        <h2>My NFTs</h2>
        <button onClick={loadNfts} className="btn btn-secondary">
          Refresh
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {nfts.length === 0 ? (
        <p>You don't own any NFTs yet.</p>
      ) : (
        <div className="nft-grid">
          {nfts.map((nft) => (
            <div key={nft.assetId.toString()} className="nft-card">
              {nft.url && (
                <div className="nft-image">
                  <img src={nft.url} alt={nft.name || 'NFT'} />
                </div>
              )}
              <div className="nft-info">
                <h3>{nft.name || `Asset #${nft.assetId}`}</h3>
                {nft.unitName && <span className="unit-name">{nft.unitName}</span>}
                <p className="asset-id">ID: {nft.assetId.toString()}</p>
                <p className="balance">Balance: {nft.balance.toString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
