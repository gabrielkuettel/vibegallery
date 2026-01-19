import { useState } from 'react'
import { useNft } from '../hooks/useNft'

export function CreateNft() {
  const { createNft, isConnected } = useNft()
  const [name, setName] = useState('')
  const [unitName, setUnitName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ assetId: bigint; txId: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected) {
      setError('Please connect your wallet first')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const nft = await createNft({
        name,
        unitName: unitName.toUpperCase().slice(0, 8),
        imageUrl,
      })
      setResult(nft)
      setName('')
      setUnitName('')
      setImageUrl('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create NFT')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="create-nft">
      <h2>Create NFT</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">NFT Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Awesome NFT"
            required
            maxLength={32}
          />
        </div>

        <div className="form-group">
          <label htmlFor="unitName">Unit Name (Ticker)</label>
          <input
            id="unitName"
            type="text"
            value={unitName}
            onChange={(e) => setUnitName(e.target.value.toUpperCase())}
            placeholder="MNFT"
            required
            maxLength={8}
          />
        </div>

        <div className="form-group">
          <label htmlFor="imageUrl">Image URL (optional)</label>
          <input
            id="imageUrl"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://robohash.org/my-nft.png?size=400x400"
          />
          <small className="form-hint">Tip: Use robohash.org for unique robot avatars</small>
        </div>

        <button type="submit" className="btn btn-primary" disabled={isLoading || !isConnected}>
          {isLoading ? 'Creating...' : 'Create NFT'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="success">
          <p>NFT Created Successfully!</p>
          <p>Asset ID: {result.assetId.toString()}</p>
          <p>Transaction: {result.txId.slice(0, 12)}...</p>
        </div>
      )}
    </div>
  )
}
