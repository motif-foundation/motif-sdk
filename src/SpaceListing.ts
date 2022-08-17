import { BigNumber, BigNumberish, ethers, Signer } from 'ethers'
import { Provider, TransactionReceipt } from '@ethersproject/providers'
import {
  SpaceListing as SpaceListingContract,
  SpaceListing__factory,
} from '@motif-foundation/listing/dist/typechain'
import mainnetAddresses from '@motif-foundation/listing/dist/addresses/1.json'
import ropstenAddresses from '@motif-foundation/listing/dist/addresses/3.json'
import motifAddresses from '@motif-foundation/listing/dist/addresses/7018.json'
import motifTestnetAddresses from '@motif-foundation/listing/dist/addresses/7019.json'
import polygonAddresses from '@motif-foundation/listing/dist/addresses/137.json'
import binanceAddresses from '@motif-foundation/listing/dist/addresses/56.json'
import { addresses } from './addresses'
import { chainIdToNetworkName, validateAndParseAddress } from './utils'

const spaceListingAddresses: { [key: string]: string } = {
  mainnet: mainnetAddresses.spaceListing,
  ropsten: ropstenAddresses.spaceListing,
  motif: motifAddresses.spaceListing,
  polygon: polygonAddresses.spaceListing,
  binance: binanceAddresses.spaceListing,
  motifTestnet: motifTestnetAddresses.spaceListing,
}

export interface SpaceList {
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

export class SpaceListing {
  public readonly chainId: number
  public readonly readOnly: boolean
  public readonly signerOrProvider: Signer | Provider
  public readonly spaceListing: SpaceListingContract
  public spaceAddress: string

  constructor(
    signerOrProvider: Signer | Provider,
    chainId: number,
    spaceAddress?: string
  ) {
    this.chainId = chainId
    this.readOnly = !Signer.isSigner(signerOrProvider)
    this.signerOrProvider = signerOrProvider
    const network = chainIdToNetworkName(chainId)
    const address = spaceListingAddresses[network]
    this.spaceListing = SpaceListing__factory.connect(address, signerOrProvider)

    if (spaceAddress) {
      const parsedSpaceAddress = validateAndParseAddress(spaceAddress)
      this.spaceAddress = parsedSpaceAddress
    } else {
      this.spaceAddress = addresses[network].space
    }
  }

  public async fetchListing(listingId: BigNumberish): Promise<SpaceList> {
    return this.spaceListing.listings(listingId)
  }

  public async fetchListingFromTransactionReceipt(
    receipt: TransactionReceipt
  ): Promise<SpaceList | null> {
    for (const log of receipt.logs) {
      const description = this.spaceListing.interface.parseLog(log)

      if (description.args.listingId && log.address === this.spaceListing.address) {
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
    tokenAddress: string = this.spaceAddress
  ) {
    return this.spaceListing.createListing(
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

  public async setListingApproval(listingId: BigNumberish, approved: boolean) {
    return this.spaceListing.setListingApproval(listingId, approved)
  }

  public async setListingDropApproval(
    listingId: BigNumberish,
    approved: boolean,
    startsAt: BigNumberish
  ) {
    return this.spaceListing.setListingDropApproval(listingId, approved, startsAt)
  }

  public async setListingListPrice(listingId: BigNumberish, listPrice: BigNumberish) {
    return this.spaceListing.setListingListPrice(listingId, listPrice)
  }

  public async createBid(listingId: BigNumberish, amount: BigNumberish) {
    const { listCurrency } = await this.spaceListing.listings(listingId)
    // If ETH listing, include the ETH in this transaction
    if (listCurrency === ethers.constants.AddressZero) {
      return this.spaceListing.createBid(listingId, amount, { value: amount })
    } else {
      return this.spaceListing.createBid(listingId, amount)
    }
  }

  public async endFixedPriceListing(listingId: BigNumberish, amount: BigNumberish) {
    const { listCurrency } = await this.spaceListing.listings(listingId)
    if (listCurrency === ethers.constants.AddressZero) {
      return this.spaceListing.endFixedPriceListing(listingId, amount, { value: amount })
    } else {
      return this.spaceListing.endFixedPriceListing(listingId, amount)
    }
  }

  public async endListing(listingId: BigNumberish) {
    return this.spaceListing.endListing(listingId)
  }

  public async cancelListing(listingId: BigNumberish) {
    return this.spaceListing.cancelListing(listingId)
  }
}
