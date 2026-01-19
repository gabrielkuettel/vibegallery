import {
  Contract,
  GlobalState,
  BoxMap,
  Account,
  Asset,
  Txn,
  Global,
  assert,
  itxn,
  Uint64,
  gtxn,
  contract,
  clone,
} from '@algorandfoundation/algorand-typescript'
import type { uint64 } from '@algorandfoundation/algorand-typescript'
import { readonly } from '@algorandfoundation/algorand-typescript/arc4'

// Listing data stored in BoxMap
type Listing = {
  seller: Account
  price: uint64
  isActive: boolean
}

// Box key combining seller address and asset ID
type ListingKey = {
  seller: Account
  assetId: uint64
}

// Commission rate: 2.5% = 25 / 1000
const COMMISSION_NUMERATOR = 25
const COMMISSION_DENOMINATOR = 1000

// Minimum balance requirement for box storage
// Box MBR = 2500 + (key_size + value_size) * 400
// Key: 32 (Account) + 8 (uint64) = 40 bytes + prefix
// Value: 32 (Account) + 8 (uint64) + 1 (boolean) = 41 bytes
// Total: 2500 + (41 + 41) * 400 = 2500 + 32800 = 35300 microALGO (with some buffer)
const BOX_MBR = 35300

@contract({ stateTotals: { globalUints: 2, globalBytes: 1 } })
export class NftMarketplace extends Contract {
  // Admin address that can withdraw commission
  admin = GlobalState<Account>()

  // Total commission collected (in microALGO)
  collectedCommission = GlobalState<uint64>({ initialValue: Uint64(0) })

  // BoxMap for storing listings - keyed by composite of seller + assetId
  listings = BoxMap<ListingKey, Listing>({ keyPrefix: 'l' })

  /**
   * Initialize the marketplace with the creator as admin
   */
  createApplication(): void {
    this.admin.value = Txn.sender
  }

  /**
   * Opt the application into an NFT asset so it can receive transfers
   * @param mbrPay Payment to cover the 0.1 ALGO asset MBR
   * @param asset The NFT asset to opt into
   */
  optInToAsset(mbrPay: gtxn.PaymentTxn, asset: Asset): void {
    // Verify MBR payment is sent to the app
    assert(mbrPay.receiver === Global.currentApplicationAddress, 'Payment must be to app')
    assert(mbrPay.amount >= 100_000, 'Payment must cover asset MBR')

    // Opt into the asset via inner transaction
    itxn
      .assetTransfer({
        assetReceiver: Global.currentApplicationAddress,
        xferAsset: asset,
        assetAmount: 0,
        fee: 0,
      })
      .submit()
  }

  /**
   * List an NFT for sale on the marketplace
   * @param mbrPay Payment to cover box storage MBR
   * @param nftXfer Asset transfer of the NFT to the contract
   * @param price Sale price in microALGO
   */
  listNft(mbrPay: gtxn.PaymentTxn, nftXfer: gtxn.AssetTransferTxn, price: uint64): void {
    // Verify price is positive
    assert(price > 0, 'Price must be positive')

    // Verify MBR payment
    assert(mbrPay.receiver === Global.currentApplicationAddress, 'MBR payment must be to app')
    assert(mbrPay.amount >= BOX_MBR, 'MBR payment insufficient for box storage')

    // Verify NFT transfer
    assert(nftXfer.assetReceiver === Global.currentApplicationAddress, 'NFT must be sent to app')
    assert(nftXfer.assetAmount === Uint64(1), 'Must transfer exactly 1 NFT')
    assert(nftXfer.sender === Txn.sender, 'NFT sender must be caller')

    const asset = nftXfer.xferAsset
    const listingKey: ListingKey = { seller: Txn.sender, assetId: asset.id }

    // Ensure listing doesn't already exist
    assert(!this.listings(listingKey).exists, 'Listing already exists')

    // Create and store the listing
    this.listings(listingKey).value = {
      seller: Txn.sender,
      price: price,
      isActive: true,
    }
  }

  /**
   * Buy an NFT from the marketplace
   * @param payment Payment for the NFT purchase
   * @param seller The seller's account
   * @param asset The NFT asset to purchase
   */
  buyNft(payment: gtxn.PaymentTxn, seller: Account, asset: Asset): void {
    const listingKey: ListingKey = { seller: seller, assetId: asset.id }

    // Verify listing exists and is active
    assert(this.listings(listingKey).exists, 'Listing does not exist')
    const listing = clone(this.listings(listingKey).value)
    assert(listing.isActive, 'Listing is not active')
    assert(listing.seller === seller, 'Seller mismatch')

    // Get price and calculate commission (2.5% = 25/1000)
    const price = listing.price
    const commission: uint64 = (price * Uint64(COMMISSION_NUMERATOR)) / Uint64(COMMISSION_DENOMINATOR)
    const sellerProceeds: uint64 = price - commission

    // Verify payment covers the price
    assert(payment.receiver === Global.currentApplicationAddress, 'Payment must be to app')
    assert(payment.amount >= price, 'Payment insufficient')

    // Buyer cannot be the seller
    assert(Txn.sender !== seller, 'Cannot buy your own NFT')

    // Transfer NFT to buyer
    itxn
      .assetTransfer({
        assetReceiver: Txn.sender,
        xferAsset: asset,
        assetAmount: 1,
        fee: 0,
      })
      .submit()

    // Transfer proceeds to seller
    itxn
      .payment({
        receiver: seller,
        amount: sellerProceeds,
        fee: 0,
      })
      .submit()

    // Update collected commission
    this.collectedCommission.value = this.collectedCommission.value + commission

    // Delete the listing box
    this.listings(listingKey).delete()

    // Refund box MBR to seller
    itxn
      .payment({
        receiver: seller,
        amount: BOX_MBR,
        fee: 0,
      })
      .submit()
  }

  /**
   * Cancel a listing and reclaim the NFT
   * @param asset The NFT asset to reclaim
   */
  cancelListing(asset: Asset): void {
    const listingKey: ListingKey = { seller: Txn.sender, assetId: asset.id }

    // Verify listing exists and caller is the seller
    assert(this.listings(listingKey).exists, 'Listing does not exist')
    const listing = clone(this.listings(listingKey).value)
    assert(listing.seller === Txn.sender, 'Only seller can cancel listing')

    // Transfer NFT back to seller
    itxn
      .assetTransfer({
        assetReceiver: Txn.sender,
        xferAsset: asset,
        assetAmount: 1,
        fee: 0,
      })
      .submit()

    // Delete the listing box
    this.listings(listingKey).delete()

    // Refund box MBR to seller
    itxn
      .payment({
        receiver: Txn.sender,
        amount: BOX_MBR,
        fee: 0,
      })
      .submit()
  }

  /**
   * Update the price of an existing listing
   * @param asset The NFT asset to update price for
   * @param newPrice The new price in microALGO
   */
  updatePrice(asset: Asset, newPrice: uint64): void {
    assert(newPrice > 0, 'Price must be positive')

    const listingKey: ListingKey = { seller: Txn.sender, assetId: asset.id }

    // Verify listing exists and caller is the seller
    assert(this.listings(listingKey).exists, 'Listing does not exist')
    const listing = clone(this.listings(listingKey).value)
    assert(listing.seller === Txn.sender, 'Only seller can update price')
    assert(listing.isActive, 'Listing is not active')

    // Update the price by setting new value
    this.listings(listingKey).value = {
      seller: listing.seller,
      price: newPrice,
      isActive: true,
    }
  }

  /**
   * Admin withdraws collected commission
   */
  withdrawCommission(): void {
    // Only admin can withdraw
    assert(Txn.sender === this.admin.value, 'Only admin can withdraw commission')

    const commission = this.collectedCommission.value
    assert(commission > 0, 'No commission to withdraw')

    // Reset collected commission before transfer (checks-effects-interactions pattern)
    this.collectedCommission.value = Uint64(0)

    // Transfer commission to admin
    itxn
      .payment({
        receiver: this.admin.value,
        amount: commission,
        fee: 0,
      })
      .submit()
  }

  /**
   * Get listing information (readonly)
   * @param seller The seller's account
   * @param assetId The NFT asset ID
   * @returns The listing details
   */
  @readonly
  getListing(seller: Account, assetId: uint64): Listing {
    const listingKey: ListingKey = { seller: seller, assetId: assetId }
    assert(this.listings(listingKey).exists, 'Listing does not exist')
    return clone(this.listings(listingKey).value)
  }

  /**
   * Check if a listing exists
   * @param seller The seller's account
   * @param assetId The NFT asset ID
   * @returns True if listing exists
   */
  @readonly
  listingExists(seller: Account, assetId: uint64): boolean {
    const listingKey: ListingKey = { seller: seller, assetId: assetId }
    return this.listings(listingKey).exists
  }

  /**
   * Get the collected commission amount
   * @returns The total commission collected
   */
  @readonly
  getCollectedCommission(): uint64 {
    return this.collectedCommission.value
  }

  /**
   * Get the admin address
   * @returns The admin account
   */
  @readonly
  getAdmin(): Account {
    return this.admin.value
  }
}
