import { useWallet } from '@txnlab/use-wallet-react'

export function WalletConnect() {
  const { wallets, activeAddress, activeWallet } = useWallet()

  const handleConnect = async (walletId: string) => {
    const wallet = wallets.find((w) => w.id === walletId)
    if (wallet) {
      await wallet.connect()
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
    <div className="wallet-options">
      <h3>Connect Wallet</h3>
      <div className="wallet-buttons">
        {wallets.map((wallet) => (
          <button
            key={wallet.id}
            onClick={() => handleConnect(wallet.id)}
            className="btn btn-primary"
          >
            {wallet.metadata.name}
          </button>
        ))}
      </div>
    </div>
  )
}
