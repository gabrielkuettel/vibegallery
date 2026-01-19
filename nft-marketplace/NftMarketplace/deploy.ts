import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { NftMarketplaceFactory } from './smart_contracts/artifacts/nft_marketplace/NftMarketplaceClient'

async function deploy() {
  const algorand = AlgorandClient.defaultLocalNet()
  const deployer = await algorand.account.kmd.getOrCreateWalletAccount('unencrypted-default-wallet', 'deployer')

  // Set the signer for the deployer account
  algorand.setSignerFromAccount(deployer)

  const factory = algorand.client.getTypedAppFactory(NftMarketplaceFactory, {
    defaultSender: deployer.addr,
  })

  const { appClient } = await factory.deploy({
    onSchemaBreak: 'append',
    onUpdate: 'append',
    createParams: {
      method: 'createApplication',
      args: [],
    },
  })

  console.log(`App deployed with ID: ${appClient.appId}`)
  console.log(`App address: ${appClient.appAddress}`)
}

deploy().catch(console.error)
