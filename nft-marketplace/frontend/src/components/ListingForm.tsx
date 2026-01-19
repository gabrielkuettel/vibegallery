import { useState } from 'react'
import { useMarketplace } from '../hooks/useMarketplace'
import { OwnedAsset } from '../hooks/useNft'
import { NftGallery } from './NftGallery'

export function ListingForm() {
  const { listNft, isConnected, isConfigured } = useMarketplace()
  const [selectedNft, setSelectedNft] = useState<OwnedAsset | null>(null)
  const [price, setPrice] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedNft) {
      setError('Please select an NFT to list')
      return
    }

    if (!price || parseFloat(price) <= 0) {
      setError('Please enter a valid price')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      // Convert ALGO to microALGO
      const priceInMicroAlgo = BigInt(Math.floor(parseFloat(price) * 1_000_000))

      await listNft(selectedNft.assetId, priceInMicroAlgo)

      setResult(`Successfully listed ${selectedNft.name || `Asset #${selectedNft.assetId}`} for ${price} ALGO`)
      setSelectedNft(null)
      setPrice('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to list NFT')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="listing-form">
        <p>Connect your wallet to list NFTs for sale</p>
      </div>
    )
  }

  if (!isConfigured) {
    return (
      <div className="listing-form">
        <p>Marketplace contract not configured. Please deploy the contract first.</p>
      </div>
    )
  }

  return (
    <div className="listing-form">
      <h2>List NFT for Sale</h2>

      {!selectedNft ? (
        <>
          <p>Select an NFT to list:</p>
          <NftGallery onSelect={setSelectedNft} />
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="selected-nft">
            <h3>Selected: {selectedNft.name || `Asset #${selectedNft.assetId}`}</h3>
            {selectedNft.unitName && <span className="unit-name">{selectedNft.unitName}</span>}
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setSelectedNft(null)}
            >
              Change
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="price">Price (ALGO)</label>
            <input
              id="price"
              type="number"
              step="0.001"
              min="0.001"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="1.0"
              required
            />
          </div>

          <div className="price-breakdown">
            <p>You will receive: {price ? (parseFloat(price) * 0.975).toFixed(3) : '0'} ALGO (after 2.5% commission)</p>
          </div>

          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Listing...' : 'List for Sale'}
          </button>
        </form>
      )}

      {error && <div className="error">{error}</div>}
      {result && <div className="success">{result}</div>}
    </div>
  )
}
