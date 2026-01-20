import { useState } from 'react'
import { useNft } from '../hooks/useNft'

const MAX_NAME_BYTES = 32
const getByteLength = (str: string) => new TextEncoder().encode(str).length

export function CreateNft() {
  const { createNft, isConnected } = useNft()
  const [name, setName] = useState('')
  const nameByteLength = getByteLength(name)
  const [isKitten, setIsKitten] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ assetId: bigint; txId: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Use name as the seed so appearance is determined by the name
  const seed = name.trim() || 'preview'
  const setParam = isKitten ? '&set=set4' : ''
  const imageUrl = `https://robohash.org/${seed}.png?size=400x400${setParam}`

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
        unitName: isKitten ? 'KITTY' : 'ROBO',
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
          <label htmlFor="name">Name Your {isKitten ? 'Kitten' : 'Robot'}</label>
          <span className="form-hint">The name determines its appearance</span>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => {
              const newValue = e.target.value
              if (getByteLength(newValue) <= MAX_NAME_BYTES) {
                setName(newValue)
              }
            }}
            placeholder="Cosmic Crusher"
            required
          />
          <span className="form-hint">{MAX_NAME_BYTES - nameByteLength} bytes remaining</span>
        </div>

        <div className="robot-preview">
          {name.trim() ? (
            <img src={imageUrl} alt={isKitten ? 'Your kitten' : 'Your robot'} />
          ) : (
            <div className="robot-placeholder">Type a name to see your {isKitten ? 'kitten' : 'robot'}</div>
          )}
          <button type="button" className="link-button" onClick={() => setIsKitten(!isKitten)}>
            {isKitten ? 'Click here if you prefer robots' : 'Click here if you prefer kittens'}
          </button>
        </div>

        <button type="submit" className="btn btn-primary" disabled={isLoading || !isConnected}>
          {isLoading ? 'Minting...' : `Mint ${isKitten ? 'Kitten' : 'Robot'}`}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="success">
          <p>NFT Minted!</p>
          <p>Asset ID: {result.assetId.toString()}</p>
        </div>
      )}
    </div>
  )
}
