'use strict'
import { BigNumber, BigNumberish, ethers, Signer } from 'ethers'
import { Provider, TransactionReceipt } from '@ethersproject/providers'
import {
  ItemListing as ItemListingContract,
  ItemListing__factory,
} from '@motif-foundation/listing/dist/typechain'
import mainnetAddresses from '@motif-foundation/listing/dist/addresses/1.json'
import ropstenAddresses from '@motif-foundation/listing/dist/addresses/3.json'
import motifAddresses from '@motif-foundation/listing/dist/addresses/7018.json'
import motifTestnetAddresses from '@motif-foundation/listing/dist/addresses/7019.json'
import polygonAddresses from '@motif-foundation/listing/dist/addresses/137.json'
import binanceAddresses from '@motif-foundation/listing/dist/addresses/56.json'
import { addresses } from './addresses'
import { chainIdToNetworkName, validateAndParseAddress } from './utils'

const itemListingAddresses: { [key: string]: string } = {
  mainnet: mainnetAddresses.itemListing,
  ropsten: ropstenAddresses.itemListing,
  polygon: polygonAddresses.itemListing,
  binance: binanceAddresses.itemListing,
  motif: motifAddresses.itemListing,
  motifTestnet: motifTestnetAddresses.itemListing,
}

function sumOfArrVal(arr: any) {
  let sum = 0
  arr.map((val) => (sum += val))
  return sum
}

export interface ItemList {
  approved: boolean
  amount: BigNumber
  startsAt: BigNumber
  duration: BigNumber
  firstBidTime: BigNumber
  listPrice: BigNumber
  listType: number
  intermediaryFeePercentage: number
  tokenOwner: string
  bidder: string
  intermediary: string
  listCurrency: string
}

export class ItemListing {
  public readonly chainId: number
  public readonly readOnly: boolean
  public readonly signerOrProvider: Signer | Provider
  public readonly itemListing: ItemListingContract
  public itemAddress: string

  constructor(
    signerOrProvider: Signer | Provider,
    chainId: number,
    itemAddress?: string
  ) {
    this.chainId = chainId
    this.readOnly = !Signer.isSigner(signerOrProvider)
    this.signerOrProvider = signerOrProvider
    const network = chainIdToNetworkName(chainId)
    const address = itemListingAddresses[network]
    this.itemListing = ItemListing__factory.connect(address, signerOrProvider)

    if (itemAddress) {
      const parsedItemAddress = validateAndParseAddress(itemAddress)
      this.itemAddress = parsedItemAddress
    } else {
      this.itemAddress = addresses[network].item
    }
  }

  public async fetchListing(listingId: BigNumberish): Promise<ItemList> {
    return this.itemListing.listings(listingId)
  }

  public async fetchListingFromTransactionReceipt(
    receipt: TransactionReceipt
  ): Promise<ItemList | null> {
    for (const log of receipt.logs) {
      const description = this.itemListing.interface.parseLog(log)

      if (description.args.listingId && log.address === this.itemListing.address) {
        return this.fetchListing(description.args.listingId)
      }
    }

    return null
  }

  public async createListing(
    tokenId: BigNumberish,
    startsAt: BigNumberish,
    duration: BigNumberish,
    listPrice: BigNumberish,
    listType: number,
    intermediary: string,
    intermediaryFeePercentages: number,
    listCurrency: string,
    tokenAddress: string = this.itemAddress
  ) {
    return this.itemListing.createListing(
      tokenId,
      tokenAddress,
      startsAt,
      duration,
      listPrice,
      listType,
      intermediary,
      intermediaryFeePercentages,
      listCurrency
    )
  }

  public async createMultipleListings(
    tokenIds: Array<BigNumberish>,
    startsAt: BigNumberish,
    duration: BigNumberish,
    listPrices: Array<BigNumberish>,
    listType: number,
    intermediary: string,
    intermediaryFeePercentages: number,
    listCurrency: string,
    tokenAddress: string = this.itemAddress
  ) {
    // return this.itemListing.createMultipleListings(
    //   tokenIds,
    //   tokenAddress,
    //   startsAt,
    //   duration,
    //   listPrices,
    //   listType,
    //   intermediary,
    //   intermediaryFeePercentages,
    //   listCurrency
    // )
    const gasEstimate = await this.itemListing.estimateGas.createMultipleListings(
      tokenIds,
      tokenAddress,
      startsAt,
      duration,
      listPrices,
      listType,
      intermediary,
      intermediaryFeePercentages,
      listCurrency
    )
    const paddedEstimate = gasEstimate.mul(105).div(100)
    return this.itemListing.createMultipleListings(
      tokenIds,
      tokenAddress,
      startsAt,
      duration,
      listPrices,
      listType,
      intermediary,
      intermediaryFeePercentages,
      listCurrency,
      {
        gasLimit: paddedEstimate.toString(),
      }
    )
  }

  public async setListingApproval(listingId: BigNumberish, approved: boolean) {
    return this.itemListing.setListingApproval(listingId, approved)
  }

  public async setListingDropApproval(
    listingId: BigNumberish,
    approved: boolean,
    startsAt: BigNumberish
  ) {
    return this.itemListing.setListingDropApproval(listingId, approved, startsAt)
  }

  public async setListingListPrice(listingId: BigNumberish, listPrice: BigNumberish) {
    return this.itemListing.setListingListPrice(listingId, listPrice)
  }

  public async createBid(listingId: BigNumberish, amount: BigNumberish) {
    const { listCurrency } = await this.itemListing.listings(listingId)
    // If ETH listing, include the ETH in this transaction
    if (listCurrency === ethers.constants.AddressZero) {
      return this.itemListing.createBid(listingId, amount, { value: amount })
    } else {
      return this.itemListing.createBid(listingId, amount)
    }
  }

  public async endFixedPriceListing(listingId: BigNumberish, amount: BigNumberish) {
    const { listCurrency } = await this.itemListing.listings(listingId)
    if (listCurrency === ethers.constants.AddressZero) {
      return this.itemListing.endFixedPriceListing(listingId, amount, { value: amount })
    } else {
      return this.itemListing.endFixedPriceListing(listingId, amount)
    }
  }

  public async endListing(listingId: BigNumberish) {
    return this.itemListing.endListing(listingId)
  }

  public async cancelListing(listingId: BigNumberish) {
    return this.itemListing.cancelListing(listingId)
  }
}
