import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { NftMarketplaceFactory } from '../artifacts/nft_marketplace/NftMarketplaceClient'

export async function deploy() {
  console.log('=== Deploying NftMarketplace ===')

  const algorand = AlgorandClient.fromEnvironment()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  const factory = algorand.client.getTypedAppFactory(NftMarketplaceFactory, {
    defaultSender: deployer.addr,
  })

  const { appClient, result } = await factory.deploy({
    onUpdate: 'append',
    onSchemaBreak: 'append',
  })

  // If app was just created fund the app account for inner transactions
  if (['create', 'replace'].includes(result.operationPerformed)) {
    await algorand.send.payment({
      amount: (1).algo(),
      sender: deployer.addr,
      receiver: appClient.appAddress,
    })
    console.log(`Funded app account with 1 ALGO`)
  }

  console.log(`Deployed NftMarketplace with App ID: ${appClient.appClient.appId}`)
  console.log(`App Address: ${appClient.appAddress}`)

  // Verify admin is set correctly
  const admin = await appClient.send.getAdmin({ args: {} })
  console.log(`Admin address: ${admin.return}`)
}
