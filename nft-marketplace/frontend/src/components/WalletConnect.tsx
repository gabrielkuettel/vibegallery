import { useWallet } from '@txnlab/use-wallet-react'

export function WalletConnect() {
  const { wallets, activeAddress, activeWallet } = useWallet()

  const handleConnect = async () => {
    const pera = wallets.find((w) => w.id === 'pera')
    if (pera) {
      await pera.connect()
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
    <button className="btn btn-primary" onClick={handleConnect}>
      Connect Wallet
    </button>
  )
}
