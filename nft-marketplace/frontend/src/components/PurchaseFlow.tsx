import { useState } from 'react'
import { useMarketplace } from '../hooks/useMarketplace'
import { useNft } from '../hooks/useNft'
import { Listing } from '../contracts/NftMarketplaceClient'

interface PurchaseFlowProps {
  listing: {
    seller: string
    assetId: bigint
    price: bigint
  }
  assetInfo?: {
    name?: string
    unitName?: string
  }
  onSuccess?: () => void
  onCancel?: () => void
}

export function PurchaseFlow({ listing, assetInfo, onSuccess, onCancel }: PurchaseFlowProps) {
  const { buyNft, isConnected } = useMarketplace()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const priceInAlgo = Number(listing.price) / 1_000_000
  const commission = priceInAlgo * 0.025

  const handleBuy = async () => {
    setIsLoading(true)
    setError(null)

    try {
      await buyNft(listing.seller, listing.assetId, listing.price)
      onSuccess?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to purchase NFT')
    } finally {
      setIsLoading(false)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`
  }

  if (!isConnected) {
    return (
      <div className="purchase-flow">
        <p>Connect your wallet to purchase NFTs</p>
      </div>
    )
  }

  return (
    <div className="purchase-flow">
      <h2>Purchase NFT</h2>

      <div className="nft-details">
        <h3>{assetInfo?.name || `Asset #${listing.assetId}`}</h3>
        {assetInfo?.unitName && <span className="unit-name">{assetInfo.unitName}</span>}
        <p className="asset-id">Asset ID: {listing.assetId.toString()}</p>
        <p className="seller">Seller: {formatAddress(listing.seller)}</p>
      </div>

      <div className="price-breakdown">
        <div className="price-row">
          <span>Price:</span>
          <span>{priceInAlgo.toFixed(2)} ALGO</span>
        </div>
        <div className="price-row commission">
          <span>Marketplace Fee (2.5%):</span>
          <span>{commission.toFixed(2)} ALGO</span>
        </div>
        <div className="price-row total">
          <span>Total:</span>
          <span>{priceInAlgo.toFixed(2)} ALGO</span>
        </div>
        <p className="seller-receives">
          Seller receives: {(priceInAlgo - commission).toFixed(2)} ALGO
        </p>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleBuy}
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Confirm Purchase'}
        </button>
      </div>
    </div>
  )
}
