import { Buffer } from 'buffer'
// Polyfill Buffer for browser (needed by algosdk)
window.Buffer = Buffer

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WalletProvider } from '@txnlab/use-wallet-react'
import { BrowserRouter } from 'react-router-dom'
import { walletManager } from './config/wallet'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletProvider manager={walletManager}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </WalletProvider>
  </StrictMode>,
)
