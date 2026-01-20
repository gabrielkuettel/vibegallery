import { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useNft } from '../hooks/useNft'

// Generate a random suffix for robohash variants
const generateSuffix = () => Math.random().toString(36).substring(2, 8)

export function CreateNft() {
  const { activeAddress } = useWallet()
  const { createNft, isConnected } = useNft()
  const [name, setName] = useState('')
  const [suffix, setSuffix] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ assetId: bigint; txId: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Use wallet address as base seed, with optional suffix for variants
  const seed = activeAddress ? `${activeAddress}${suffix}` : generateSuffix()
  const imageUrl = `https://robohash.org/${seed}.png?size=400x400`

  const handleNewRobot = () => {
    setSuffix(generateSuffix())
  }

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
      setSuffix('')
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
        <div className="robot-preview">
          <img src={imageUrl} alt="Your robot" />
          <button type="button" className="btn btn-secondary" onClick={handleNewRobot}>
            New Robot
          </button>
        </div>

        <div className="form-group">
          <label htmlFor="name">Name Your Robot</label>
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
