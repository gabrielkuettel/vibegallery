import { useState, useEffect } from 'react'
import { useNft, OwnedAsset } from '../hooks/useNft'
import { useMarketplace } from '../hooks/useMarketplace'

export function MyNfts() {
  const { getOwnedNfts, isConnected } = useNft()
  const { listNft, cancelListing, updatePrice, isConfigured } = useMarketplace()
  const [nfts, setNfts] = useState<OwnedAsset[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [sellingNft, setSellingNft] = useState<bigint | null>(null)
  const [sellPrice, setSellPrice] = useState('')

  const loadNfts = async () => {
    if (!isConnected) return

    setIsLoading(true)
    setError(null)

    try {
      const owned = await getOwnedNfts()
      // Only show ROBO NFTs (minted through this app)
      const roboNfts = owned.filter(nft => nft.unitName === 'ROBO')
      setNfts(roboNfts)
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update price')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSell = async (assetId: bigint) => {
    if (!sellPrice || parseFloat(sellPrice) <= 0) {
      setError('Please enter a valid price')
      return
    }

    const key = `sell-${assetId}`
    setActionLoading(key)
    setError(null)

    try {
      const priceInMicroAlgo = BigInt(Math.floor(parseFloat(sellPrice) * 1_000_000))
      await listNft(assetId, priceInMicroAlgo)
      setSellingNft(null)
      setSellPrice('')
      await loadNfts()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to list NFT')
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
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">Loading your NFTs...</p>
        </div>
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
              {sellingNft === nft.assetId ? (
                <div className="sell-form">
                  <div className="form-group">
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value)}
                      placeholder="Price in ALGO"
                    />
                  </div>
                  <p className="commission-info">
                    You receive: {sellPrice ? (parseFloat(sellPrice) * 0.975).toFixed(2) : '0'} ALGO (2.5% commission)
                  </p>
                  <div className="sell-actions">
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => handleSell(nft.assetId)}
                      disabled={actionLoading === `sell-${nft.assetId}`}
                    >
                      {actionLoading === `sell-${nft.assetId}` ? 'Listing...' : 'List'}
                    </button>
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => {
                        setSellingNft(null)
                        setSellPrice('')
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => setSellingNft(nft.assetId)}
                >
                  Sell
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
