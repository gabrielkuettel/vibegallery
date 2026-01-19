import { useState, useEffect } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { WalletConnect } from './components/WalletConnect'
import { CreateNft } from './components/CreateNft'
import { NftGallery } from './components/NftGallery'
import { ListingForm } from './components/ListingForm'
import { MyNfts } from './components/MyNfts'
import { PurchaseFlow } from './components/PurchaseFlow'
import { useMarketplace, ActiveListing } from './hooks/useMarketplace'
import { CURRENT_NETWORK } from './config/wallet'
import './App.css'

function NetworkBanner() {
  if (CURRENT_NETWORK === 'mainnet') return null

  return (
    <div className="network-banner">
      {CURRENT_NETWORK === 'testnet' ? 'Testnet' : 'LocalNet'} — This is not real money
    </div>
  )
}

function Logo() {
  return (
    <pre className="ascii-logo">{`██╗   ██╗██╗██████╗ ███████╗ ██████╗  █████╗ ██╗     ██╗     ███████╗██████╗ ██╗   ██╗
██║   ██║██║██╔══██╗██╔════╝██╔════╝ ██╔══██╗██║     ██║     ██╔════╝██╔══██╗╚██╗ ██╔╝
██║   ██║██║██████╔╝█████╗  ██║  ███╗███████║██║     ██║     █████╗  ██████╔╝ ╚████╔╝
╚██╗ ██╔╝██║██╔══██╗██╔══╝  ██║   ██║██╔══██║██║     ██║     ██╔══╝  ██╔══██╗  ╚██╔╝
 ╚████╔╝ ██║██████╔╝███████╗╚██████╔╝██║  ██║███████╗███████╗███████╗██║  ██║   ██║
  ╚═══╝  ╚═╝╚═════╝ ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝   ╚═╝`}</pre>
  )
}

function App() {
  return (
    <div className="app">
      <NetworkBanner />
      <header className="app-header">
        <Logo />
        <nav>
          <Link to="/">Browse</Link>
          <Link to="/create">Create</Link>
          <Link to="/list">Sell</Link>
          <Link to="/my-nfts">My NFTs</Link>
        </nav>
        <WalletConnect />
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateNft />} />
          <Route path="/list" element={<ListingForm />} />
          <Route path="/my-nfts" element={<MyNfts />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <p>VibeGallery on Algorand</p>
      </footer>
    </div>
  )
}

function Home() {
  const { getActiveListings, isConnected, isConfigured } = useMarketplace()
  const { algodClient } = useWallet()
  const [listings, setListings] = useState<ActiveListing[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedListing, setSelectedListing] = useState<ActiveListing | null>(null)

  const loadListings = async () => {
    if (!isConfigured || !algodClient) return

    setIsLoading(true)
    setError(null)

    try {
      const activeListings = await getActiveListings()
      setListings(activeListings)
    } catch (e) {
      console.error('Failed to load listings:', e)
      setError(e instanceof Error ? e.message : 'Failed to load listings')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    console.log('[Home] useEffect triggered', { isConfigured, hasAlgodClient: !!algodClient })
    loadListings()
  }, [isConfigured, algodClient])

  const formatPrice = (microAlgo: bigint) => {
    return (Number(microAlgo) / 1_000_000).toFixed(3)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // If a listing is selected, show the purchase flow
  if (selectedListing) {
    return (
      <div className="home">
        <PurchaseFlow
          listing={{
            seller: selectedListing.seller,
            assetId: selectedListing.assetId,
            price: selectedListing.price,
          }}
          assetInfo={selectedListing.assetInfo}
          onSuccess={() => {
            setSelectedListing(null)
            loadListings()
          }}
          onCancel={() => setSelectedListing(null)}
        />
      </div>
    )
  }

  return (
    <div className="home">
      <div className="marketplace-header">
        <h2>VibeGallery</h2>
        <button onClick={loadListings} className="btn btn-secondary" disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {!isConfigured && (
        <div className="info-box">
          <p>Marketplace not configured. Please deploy the contract first.</p>
        </div>
      )}

      {isConfigured && isLoading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">Fetching listings from the blockchain...</p>
          <p className="loading-subtext">This may take a moment</p>
        </div>
      )}

      {isConfigured && listings.length === 0 && !isLoading && (
        <div className="info-box">
          <h3>No NFTs Listed Yet</h3>
          <p>Be the first to list an NFT on the marketplace!</p>
          <Link to="/create" className="btn btn-primary">Create NFT</Link>
        </div>
      )}

      {listings.length > 0 && (
        <div className="nft-grid">
          {listings.map((listing) => (
            <div key={`${listing.seller}-${listing.assetId}`} className="nft-card listing-card">
              {listing.assetInfo?.url && (
                <div className="nft-image">
                  <img src={listing.assetInfo.url} alt={listing.assetInfo.name || 'NFT'} />
                </div>
              )}
              <div className="nft-info">
                <h3>{listing.assetInfo?.name || `Asset #${listing.assetId}`}</h3>
                {listing.assetInfo?.unitName && (
                  <span className="unit-name">{listing.assetInfo.unitName}</span>
                )}
                <p className="asset-id">ID: {listing.assetId.toString()}</p>
                <p className="seller">Seller: {formatAddress(listing.seller)}</p>
                <p className="price">{formatPrice(listing.price)} ALGO</p>
              </div>
              {isConnected ? (
                <button
                  className="btn btn-primary"
                  onClick={() => setSelectedListing(listing)}
                >
                  Buy Now
                </button>
              ) : (
                <p className="connect-prompt">Connect wallet to buy</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="quick-links">
        <Link to="/create" className="btn btn-secondary">Create NFT</Link>
        <Link to="/list" className="btn btn-secondary">List NFT</Link>
        <Link to="/my-nfts" className="btn btn-secondary">My NFTs</Link>
      </div>
    </div>
  )
}

export default App
