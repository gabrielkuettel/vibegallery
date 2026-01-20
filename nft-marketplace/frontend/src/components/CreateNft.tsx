import { useState } from 'react'
import { useNft } from '../hooks/useNft'

export function CreateNft() {
  const { createNft, isConnected } = useNft()
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ assetId: bigint; txId: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Use name as the seed so robot appearance is determined by its name
  const seed = name.trim() || 'preview'
  const imageUrl = `https://robohash.org/${seed}.png?size=400x400`

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
        unitName: 'ROBO',
        imageUrl,
      })
      setResult(nft)
      setName('')
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
          <label htmlFor="name">Name Your Robot</label>
          <span className="form-hint">Your robot's name determines its appearance</span>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cosmic Crusher"
            required
            maxLength={32}
          />
        </div>

        <div className="robot-preview">
          {name.trim() ? (
            <img src={imageUrl} alt="Your robot" />
          ) : (
            <div className="robot-placeholder">Type a name to see your robot</div>
          )}
        </div>

        <button type="submit" className="btn btn-primary" disabled={isLoading || !isConnected}>
          {isLoading ? 'Minting...' : 'Mint Robot'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="success">
          <p>Robot Minted!</p>
          <p>Asset ID: {result.assetId.toString()}</p>
        </div>
      )}
    </div>
  )
}
