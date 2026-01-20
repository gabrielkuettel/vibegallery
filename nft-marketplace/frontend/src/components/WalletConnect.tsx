import { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'

export function WalletConnect() {
  const { wallets, activeAddress, activeWallet } = useWallet()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleConnect = async (walletId: string) => {
    const wallet = wallets.find((w) => w.id === walletId)
    if (wallet) {
      await wallet.connect()
      setIsModalOpen(false)
    }
  }

  const handleDisconnect = async () => {
    if (activeWallet) {
      await activeWallet.disconnect()
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (activeAddress) {
    return (
      <div className="wallet-connected">
        <span className="wallet-address">{formatAddress(activeAddress)}</span>
        <button onClick={handleDisconnect} className="btn btn-secondary">
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
        Connect Wallet
      </button>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Connect Wallet</h3>
            <div className="wallet-buttons">
              {wallets.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleConnect(wallet.id)}
                  className="btn btn-primary wallet-option-btn"
                >
                  {wallet.metadata.name}
                </button>
              ))}
            </div>
            <button
              className="btn btn-secondary modal-close-btn"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
