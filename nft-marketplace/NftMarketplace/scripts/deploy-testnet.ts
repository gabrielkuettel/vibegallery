import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { NftMarketplaceFactory } from '../smart_contracts/artifacts/nft_marketplace/NftMarketplaceClient'
import { mnemonicToSecretKey } from 'algosdk'

async function deployToTestnet() {
  console.log('=== Deploying NftMarketplace to Testnet ===')

  // Get mnemonic from environment
  const mnemonic = process.env.DEPLOYER_MNEMONIC
  if (!mnemonic) {
    throw new Error('DEPLOYER_MNEMONIC environment variable is required')
  }

  // Create Algorand client connected to testnet
  const algorand = AlgorandClient.fromConfig({
    algodConfig: {
      server: 'https://testnet-api.4160.nodely.dev',
      port: 443,
      token: '',
    },
  })

  // Create account from mnemonic
  const account = mnemonicToSecretKey(mnemonic)
  const deployer = algorand.account.fromKeyPair(account)
  algorand.setSignerFromAccount(deployer)

  console.log(`Deployer address: ${deployer.addr}`)

  // Check balance
  const accountInfo = await algorand.account.getInformation(deployer.addr)
  console.log(`Deployer balance: ${Number(accountInfo.balance) / 1_000_000} ALGO`)

  // Create factory
  const factory = algorand.client.getTypedAppFactory(NftMarketplaceFactory, {
    defaultSender: deployer.addr,
  })

  // Deploy the contract
  const { appClient, result } = await factory.deploy({
    onUpdate: 'append',
    onSchemaBreak: 'append',
  })

  console.log(`Deployed NftMarketplace with App ID: ${appClient.appClient.appId}`)
  console.log(`App Address: ${appClient.appAddress}`)

  // If app was just created, fund it
  if (['create', 'replace'].includes(result.operationPerformed)) {
    console.log('Funding app account with 3 ALGO...')
    await algorand.send.payment({
      amount: (3).algo(),
      sender: deployer.addr,
      receiver: appClient.appAddress,
    })
    console.log(`Funded app account with 3 ALGO`)
  }

  // Verify admin is set correctly
  const admin = await appClient.send.getAdmin({ args: {} })
  console.log(`Admin address: ${admin.return}`)

  console.log('\n=== Deployment Complete ===')
  console.log(`APP_ID=${appClient.appClient.appId}`)
}

deployToTestnet().catch(console.error)
