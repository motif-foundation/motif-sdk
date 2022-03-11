import { BigNumber, BigNumberish, ethers, Signer } from 'ethers'
import { Provider, TransactionReceipt } from '@ethersproject/providers'
import {
  AvatarListing as AvatarListingContract,
  AvatarListing__factory,
} from '@motif-foundation/listing/dist/typechain'
import motifAddresses from '@motif-foundation/listing/dist/addresses/7018.json'
import { addresses } from './addresses'
import { chainIdToNetworkName, validateAndParseAddress } from './utils'

const avatarListingAddresses: { [key: string]: string } = {
  motif: motifAddresses.avatarListing,
}

export interface AvatarList {
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

export class AvatarListing {
  public readonly chainId: number
  public readonly readOnly: boolean
  public readonly signerOrProvider: Signer | Provider
  public readonly avatarListing: AvatarListingContract
  public avatarAddress: string

  constructor(
    signerOrProvider: Signer | Provider,
    chainId: number,
    avatarAddress?: string
  ) {
    this.chainId = chainId
    this.readOnly = !Signer.isSigner(signerOrProvider)
    this.signerOrProvider = signerOrProvider
    const network = chainIdToNetworkName(chainId)
    const address = avatarListingAddresses[network]
    this.avatarListing = AvatarListing__factory.connect(address, signerOrProvider)

    if (avatarAddress) {
      const parsedAvatarAddress = validateAndParseAddress(avatarAddress)
      this.avatarAddress = parsedAvatarAddress
    } else {
      this.avatarAddress = addresses[network].avatar
    }
  }

  public async fetchListing(listingId: BigNumberish): Promise<AvatarList> {
    return this.avatarListing.listings(listingId)
  }

  public async fetchListingFromTransactionReceipt(
    receipt: TransactionReceipt
  ): Promise<AvatarList | null> {
    for (const log of receipt.logs) {
      const description = this.avatarListing.interface.parseLog(log)

      if (description.args.listingId && log.address === this.avatarListing.address) {
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
    tokenAddress: string = this.avatarAddress
  ) {
    return this.avatarListing.createListing(
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
    return this.avatarListing.setListingApproval(listingId, approved)
  }

  public async setListingDropApproval(
    listingId: BigNumberish,
    approved: boolean,
    startsAt: BigNumberish
  ) {
    return this.avatarListing.setListingDropApproval(listingId, approved, startsAt)
  }

  public async setListingListPrice(listingId: BigNumberish, listPrice: BigNumberish) {
    return this.avatarListing.setListingListPrice(listingId, listPrice)
  }

  public async createBid(listingId: BigNumberish, amount: BigNumberish) {
    const { listCurrency } = await this.avatarListing.listings(listingId)
    // If ETH listing, include the ETH in this transaction
    if (listCurrency === ethers.constants.AddressZero) {
      return this.avatarListing.createBid(listingId, amount, { value: amount })
    } else {
      return this.avatarListing.createBid(listingId, amount)
    }
  }

  public async endFixedPriceListing(listingId: BigNumberish, amount: BigNumberish) {
    const { listCurrency } = await this.avatarListing.listings(listingId)
    if (listCurrency === ethers.constants.AddressZero) {
      return this.avatarListing.endFixedPriceListing(listingId, amount, { value: amount })
    } else {
      return this.avatarListing.endFixedPriceListing(listingId, amount)
    }
  }

  public async endListing(listingId: BigNumberish) {
    return this.avatarListing.endListing(listingId)
  }

  public async cancelListing(listingId: BigNumberish) {
    return this.avatarListing.cancelListing(listingId)
  }
}
