import { Config } from '@algorandfoundation/algokit-utils'
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing'
import { Address } from 'algosdk'
import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { NftMarketplaceFactory, NftMarketplaceClient } from '../artifacts/nft_marketplace/NftMarketplaceClient'

// Box MBR for listings (must match contract constant)
const BOX_MBR = 35300n

describe('NftMarketplace', () => {
  const localnet = algorandFixture()

  beforeAll(() => {
    Config.configure({ debug: true })
  })

  beforeEach(localnet.newScope, 30_000)

  const deploy = async (account: Address) => {
    const factory = localnet.algorand.client.getTypedAppFactory(NftMarketplaceFactory, {
      defaultSender: account,
    })

    // Use explicit createApplication method
    const { result, appClient } = await factory.send.create.createApplication({
      args: [],
      suppressLog: true,
    })

    // Fund the app for inner transactions
    await localnet.algorand.send.payment({
      sender: account,
      receiver: appClient.appAddress,
      amount: (2).algo(),
    })

    return { client: appClient, factory }
  }

  const createNft = async (creator: Address) => {
    const result = await localnet.algorand.send.assetCreate({
      sender: creator,
      total: 1n,
      decimals: 0,
      assetName: 'Test NFT',
      unitName: 'TNFT',
      url: 'https://example.com/nft.json',
    })
    return result.assetId
  }

  test('should deploy and set admin correctly', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const admin = await client.send.getAdmin({ args: {} })
    expect(admin.return?.toString()).toBe(testAccount.toString())
  })

  test('should opt into asset', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const assetId = await createNft(testAccount)

    // Create payment transaction for MBR
    const mbrPayTxn = await localnet.algorand.createTransaction.payment({
      sender: testAccount,
      receiver: client.appAddress,
      amount: (0.1).algo(),
    })

    // Call optInToAsset with payment as transaction argument
    await client.send.optInToAsset({
      args: {
        mbrPay: mbrPayTxn,
        asset: assetId,
      },
      extraFee: (0.001).algo(), // Cover inner txn fee
      populateAppCallResources: true,
    })

    // Verify app is opted in by checking it can receive the asset
    const appInfo = await localnet.algorand.account.getInformation(client.appAddress)
    const hasAsset = appInfo.assets?.some((a) => a.assetId === assetId)
    expect(hasAsset).toBe(true)
  })

  test('should list an NFT for sale', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const assetId = await createNft(testAccount)
    const listPrice = 1_000_000n // 1 ALGO

    // First opt the app into the asset
    const optInMbrPay = await localnet.algorand.createTransaction.payment({
      sender: testAccount,
      receiver: client.appAddress,
      amount: (0.1).algo(),
    })

    await client.send.optInToAsset({
      args: {
        mbrPay: optInMbrPay,
        asset: assetId,
      },
      extraFee: (0.001).algo(),
      populateAppCallResources: true,
    })

    // Create transactions for listing
    const listMbrPay = await localnet.algorand.createTransaction.payment({
      sender: testAccount,
      receiver: client.appAddress,
      amount: { microAlgo: BOX_MBR },
    })

    const nftXfer = await localnet.algorand.createTransaction.assetTransfer({
      sender: testAccount,
      receiver: client.appAddress,
      assetId: assetId,
      amount: 1n,
    })

    // List the NFT
    await client.send.listNft({
      args: {
        mbrPay: listMbrPay,
        nftXfer: nftXfer,
        price: listPrice,
      },
      populateAppCallResources: true,
    })

    // Verify listing exists
    const exists = await client.send.listingExists({
      args: { seller: testAccount, assetId: assetId },
      populateAppCallResources: true,
    })
    expect(exists.return).toBe(true)

    // Verify listing details
    const listing = await client.send.getListing({
      args: { seller: testAccount, assetId: assetId },
      populateAppCallResources: true,
    })
    expect(listing.return).toBeDefined()
    // Listing returns { seller, price, isActive }
    expect(listing.return?.price).toBe(listPrice)
    expect(listing.return?.isActive).toBe(true)
  })

  test('should buy an NFT', async () => {
    const { testAccount, generateAccount } = localnet.context
    const { client, factory } = await deploy(testAccount)

    const assetId = await createNft(testAccount)
    const listPrice = 1_000_000n // 1 ALGO

    // Opt app into asset
    const optInMbrPay = await localnet.algorand.createTransaction.payment({
      sender: testAccount,
      receiver: client.appAddress,
      amount: (0.1).algo(),
    })

    await client.send.optInToAsset({
      args: {
        mbrPay: optInMbrPay,
        asset: assetId,
      },
      extraFee: (0.001).algo(),
      populateAppCallResources: true,
    })

    // Create transactions for listing
    const listMbrPay = await localnet.algorand.createTransaction.payment({
      sender: testAccount,
      receiver: client.appAddress,
      amount: { microAlgo: BOX_MBR },
    })

    const nftXfer = await localnet.algorand.createTransaction.assetTransfer({
      sender: testAccount,
      receiver: client.appAddress,
      assetId: assetId,
      amount: 1n,
    })

    await client.send.listNft({
      args: {
        mbrPay: listMbrPay,
        nftXfer: nftXfer,
        price: listPrice,
      },
      populateAppCallResources: true,
    })

    // Create buyer account and fund it
    const buyer = await generateAccount({ initialFunds: (10).algo() })

    // Buyer opts into the NFT
    await localnet.algorand.send.assetOptIn({
      sender: buyer.addr,
      assetId: assetId,
    })

    // Get buyer client
    const buyerClient = factory.getAppClientById({
      appId: client.appId,
      defaultSender: buyer.addr,
    })

    // Record balances before purchase
    const sellerBalanceBefore = (await localnet.algorand.account.getInformation(testAccount)).balance

    // Create payment transaction for buying
    const buyPayment = await localnet.algorand.createTransaction.payment({
      sender: buyer.addr,
      receiver: client.appAddress,
      amount: { microAlgo: listPrice },
    })

    // Buy the NFT
    await buyerClient.send.buyNft({
      args: {
        payment: buyPayment,
        seller: testAccount.toString(),
        asset: assetId,
      },
      extraFee: (0.004).algo(), // Cover inner txn fees (4 inner txns)
      populateAppCallResources: true,
    })

    // Verify buyer now owns the NFT
    const buyerInfo = await localnet.algorand.account.getInformation(buyer.addr)
    const buyerNft = buyerInfo.assets?.find((a) => BigInt(a.assetId) === BigInt(assetId))
    expect(buyerNft).toBeDefined()
    // Balance is stored as 'amount' in some SDK versions
    const buyerBalance = (buyerNft as { balance?: bigint; amount?: bigint })?.balance ?? (buyerNft as { amount?: bigint })?.amount
    expect(buyerBalance).toBe(1n)

    // Verify listing no longer exists
    const exists = await client.send.listingExists({
      args: { seller: testAccount, assetId: assetId },
      populateAppCallResources: true,
    })
    expect(exists.return).toBe(false)

    // Verify commission was collected (2.5% of 1 ALGO = 25000 microALGO)
    const commission = await client.send.getCollectedCommission({ args: {} })
    expect(commission.return).toBe(25000n)

    // Verify seller received proceeds + MBR refund
    const sellerBalanceAfter = (await localnet.algorand.account.getInformation(testAccount)).balance
    const expectedProceeds = listPrice - 25000n + BOX_MBR
    expect(sellerBalanceAfter.microAlgo - sellerBalanceBefore.microAlgo).toBe(expectedProceeds)
  })

  test('should cancel a listing', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const assetId = await createNft(testAccount)
    const listPrice = 1_000_000n

    // Opt app into asset
    const optInMbrPay = await localnet.algorand.createTransaction.payment({
      sender: testAccount,
      receiver: client.appAddress,
      amount: (0.1).algo(),
    })

    await client.send.optInToAsset({
      args: {
        mbrPay: optInMbrPay,
        asset: assetId,
      },
      extraFee: (0.001).algo(),
      populateAppCallResources: true,
    })

    // Create transactions for listing
    const listMbrPay = await localnet.algorand.createTransaction.payment({
      sender: testAccount,
      receiver: client.appAddress,
      amount: { microAlgo: BOX_MBR },
    })

    const nftXfer = await localnet.algorand.createTransaction.assetTransfer({
      sender: testAccount,
      receiver: client.appAddress,
      assetId: assetId,
      amount: 1n,
    })

    await client.send.listNft({
      args: {
        mbrPay: listMbrPay,
        nftXfer: nftXfer,
        price: listPrice,
      },
      populateAppCallResources: true,
    })

    // Verify seller no longer has the NFT (transferred to app)
    let sellerInfo = await localnet.algorand.account.getInformation(testAccount)
    let sellerNft = sellerInfo.assets?.find((a) => BigInt(a.assetId) === BigInt(assetId))
    expect(sellerNft).toBeDefined()
    // Balance is stored as 'amount' in some SDK versions
    let sellerBalance = (sellerNft as { balance?: bigint; amount?: bigint })?.balance ?? (sellerNft as { amount?: bigint })?.amount
    expect(sellerBalance).toBe(0n)

    // Cancel the listing
    await client.send.cancelListing({
      args: { asset: assetId },
      extraFee: (0.002).algo(), // Cover 2 inner txns
      populateAppCallResources: true,
    })

    // Verify listing no longer exists
    const exists = await client.send.listingExists({
      args: { seller: testAccount, assetId: assetId },
      populateAppCallResources: true,
    })
    expect(exists.return).toBe(false)

    // Verify seller got NFT back
    sellerInfo = await localnet.algorand.account.getInformation(testAccount)
    sellerNft = sellerInfo.assets?.find((a) => BigInt(a.assetId) === BigInt(assetId))
    expect(sellerNft).toBeDefined()
    // Balance is stored as 'amount' in some SDK versions
    sellerBalance = (sellerNft as { balance?: bigint; amount?: bigint })?.balance ?? (sellerNft as { amount?: bigint })?.amount
    expect(sellerBalance).toBe(1n)
  })

  test('should update listing price', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const assetId = await createNft(testAccount)
    const originalPrice = 1_000_000n
    const newPrice = 2_000_000n

    // Opt app into asset
    const optInMbrPay = await localnet.algorand.createTransaction.payment({
      sender: testAccount,
      receiver: client.appAddress,
      amount: (0.1).algo(),
    })

    await client.send.optInToAsset({
      args: {
        mbrPay: optInMbrPay,
        asset: assetId,
      },
      extraFee: (0.001).algo(),
      populateAppCallResources: true,
    })

    // Create transactions for listing
    const listMbrPay = await localnet.algorand.createTransaction.payment({
      sender: testAccount,
      receiver: client.appAddress,
      amount: { microAlgo: BOX_MBR },
    })

    const nftXfer = await localnet.algorand.createTransaction.assetTransfer({
      sender: testAccount,
      receiver: client.appAddress,
      assetId: assetId,
      amount: 1n,
    })

    await client.send.listNft({
      args: {
        mbrPay: listMbrPay,
        nftXfer: nftXfer,
        price: originalPrice,
      },
      populateAppCallResources: true,
    })

    // Update the price
    await client.send.updatePrice({
      args: { asset: assetId, newPrice: newPrice },
      populateAppCallResources: true,
    })

    // Verify new price
    const listing = await client.send.getListing({
      args: { seller: testAccount, assetId: assetId },
      populateAppCallResources: true,
    })
    expect(listing.return?.price).toBe(newPrice)
  })

  test('should withdraw commission (admin only)', async () => {
    const { testAccount, generateAccount } = localnet.context
    const { client, factory } = await deploy(testAccount)

    const assetId = await createNft(testAccount)
    const listPrice = 1_000_000n

    // Opt app into asset
    const optInMbrPay = await localnet.algorand.createTransaction.payment({
      sender: testAccount,
      receiver: client.appAddress,
      amount: (0.1).algo(),
    })

    await client.send.optInToAsset({
      args: {
        mbrPay: optInMbrPay,
        asset: assetId,
      },
      extraFee: (0.001).algo(),
      populateAppCallResources: true,
    })

    // Create transactions for listing
    const listMbrPay = await localnet.algorand.createTransaction.payment({
      sender: testAccount,
      receiver: client.appAddress,
      amount: { microAlgo: BOX_MBR },
    })

    const nftXfer = await localnet.algorand.createTransaction.assetTransfer({
      sender: testAccount,
      receiver: client.appAddress,
      assetId: assetId,
      amount: 1n,
    })

    await client.send.listNft({
      args: {
        mbrPay: listMbrPay,
        nftXfer: nftXfer,
        price: listPrice,
      },
      populateAppCallResources: true,
    })

    // Create buyer and complete purchase
    const buyer = await generateAccount({ initialFunds: (10).algo() })
    await localnet.algorand.send.assetOptIn({
      sender: buyer.addr,
      assetId: assetId,
    })

    const buyerClient = factory.getAppClientById({
      appId: client.appId,
      defaultSender: buyer.addr,
    })

    // Create payment for buying
    const buyPayment = await localnet.algorand.createTransaction.payment({
      sender: buyer.addr,
      receiver: client.appAddress,
      amount: { microAlgo: listPrice },
    })

    await buyerClient.send.buyNft({
      args: {
        payment: buyPayment,
        seller: testAccount.toString(),
        asset: assetId,
      },
      extraFee: (0.004).algo(),
      populateAppCallResources: true,
    })

    // Verify commission is collected
    let commission = await client.send.getCollectedCommission({ args: {} })
    expect(commission.return).toBe(25000n)

    // Record admin balance before withdrawal
    const adminBalanceBefore = (await localnet.algorand.account.getInformation(testAccount)).balance

    // Withdraw commission (as admin)
    await client.send.withdrawCommission({
      args: {},
      extraFee: (0.001).algo(), // Cover 1 inner txn
    })

    // Verify commission is reset to 0
    commission = await client.send.getCollectedCommission({ args: {} })
    expect(commission.return).toBe(0n)

    // Verify admin received the commission (minus transaction fees)
    const adminBalanceAfter = (await localnet.algorand.account.getInformation(testAccount)).balance
    // Balance should increase by roughly 25000 microALGO (commission) minus fees
    const balanceIncrease = adminBalanceAfter.microAlgo - adminBalanceBefore.microAlgo
    expect(balanceIncrease).toBeGreaterThan(20000n) // Allow for some fee variance
  })

  test('should reject non-admin commission withdrawal', async () => {
    const { testAccount, generateAccount } = localnet.context
    const { client, factory } = await deploy(testAccount)

    // Create non-admin user
    const nonAdmin = await generateAccount({ initialFunds: (5).algo() })

    const nonAdminClient = factory.getAppClientById({
      appId: client.appId,
      defaultSender: nonAdmin.addr,
    })

    // Attempt to withdraw as non-admin should fail
    await expect(
      nonAdminClient.send.withdrawCommission({
        args: {},
        extraFee: (0.001).algo(),
      })
    ).rejects.toThrow()
  })

  test('should reject buyer purchasing their own NFT', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const assetId = await createNft(testAccount)
    const listPrice = 1_000_000n

    // Opt app into asset
    const optInMbrPay = await localnet.algorand.createTransaction.payment({
      sender: testAccount,
      receiver: client.appAddress,
      amount: (0.1).algo(),
    })

    await client.send.optInToAsset({
      args: {
        mbrPay: optInMbrPay,
        asset: assetId,
      },
      extraFee: (0.001).algo(),
      populateAppCallResources: true,
    })

    // Create transactions for listing
    const listMbrPay = await localnet.algorand.createTransaction.payment({
      sender: testAccount,
      receiver: client.appAddress,
      amount: { microAlgo: BOX_MBR },
    })

    const nftXfer = await localnet.algorand.createTransaction.assetTransfer({
      sender: testAccount,
      receiver: client.appAddress,
      assetId: assetId,
      amount: 1n,
    })

    await client.send.listNft({
      args: {
        mbrPay: listMbrPay,
        nftXfer: nftXfer,
        price: listPrice,
      },
      populateAppCallResources: true,
    })

    // Create payment for buying
    const buyPayment = await localnet.algorand.createTransaction.payment({
      sender: testAccount,
      receiver: client.appAddress,
      amount: { microAlgo: listPrice },
    })

    // Attempt to buy own NFT should fail
    await expect(
      client.send.buyNft({
        args: {
          payment: buyPayment,
          seller: testAccount.toString(),
          asset: assetId,
        },
        extraFee: (0.004).algo(),
        populateAppCallResources: true,
      })
    ).rejects.toThrow()
  })
})
