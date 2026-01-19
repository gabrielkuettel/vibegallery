import { useState, useEffect } from 'react'
import { useNft, OwnedAsset } from '../hooks/useNft'

interface NftGalleryProps {
  onSelect?: (asset: OwnedAsset) => void
}

export function NftGallery({ onSelect }: NftGalleryProps) {
  const { getOwnedNfts, isConnected } = useNft()
  const [nfts, setNfts] = useState<OwnedAsset[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadNfts = async () => {
    if (!isConnected) return

    setIsLoading(true)
    setError(null)

    try {
      const owned = await getOwnedNfts()
      setNfts(owned)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load NFTs')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadNfts()
  }, [isConnected])

  if (!isConnected) {
    return (
      <div className="nft-gallery">
        <p>Connect your wallet to view your NFTs</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="nft-gallery">
        <p>Loading your NFTs...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="nft-gallery">
        <div className="error">{error}</div>
        <button onClick={loadNfts} className="btn btn-secondary">
          Retry
        </button>
      </div>
    )
  }

  if (nfts.length === 0) {
    return (
      <div className="nft-gallery">
        <p>You don't own any NFTs yet. Create one to get started!</p>
        <button onClick={loadNfts} className="btn btn-secondary">
          Refresh
        </button>
      </div>
    )
  }

  return (
    <div className="nft-gallery">
      <div className="gallery-header">
        <h2>Your NFTs</h2>
        <button onClick={loadNfts} className="btn btn-secondary">
          Refresh
        </button>
      </div>

      <div className="nft-grid">
        {nfts.map((nft) => (
          <div
            key={nft.assetId.toString()}
            className="nft-card"
            onClick={() => onSelect?.(nft)}
          >
            {nft.url && (
              <div className="nft-image">
                <img src={nft.url} alt={nft.name || 'NFT'} />
              </div>
            )}
            <div className="nft-info">
              <h3>{nft.name || `Asset #${nft.assetId}`}</h3>
              {nft.unitName && <span className="unit-name">{nft.unitName}</span>}
              <p className="asset-id">ID: {nft.assetId.toString()}</p>
            </div>
            {onSelect && (
              <button className="btn btn-primary btn-small">Select</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
