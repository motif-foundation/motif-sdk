import { BigNumber, BigNumberish, ethers, Signer } from 'ethers'
import { Provider, TransactionReceipt } from '@ethersproject/providers'
import {
  LandListing as LandListingContract,
  LandListing__factory,
} from '@motif-foundation/listing/dist/typechain' 
import motifAddresses from '@motif-foundation/listing/dist/addresses/7018.json'
import { addresses } from './addresses'
import { chainIdToNetworkName,validateAndParseAddress } from './utils'

const landListingAddresses: { [key: string]: string } = {
  motif: motifAddresses.landListing,
}

export interface LandList {
 approved: boolean;
  amount: BigNumber;
  startsAt: BigNumber;
  duration: BigNumber;
  firstBidTime: BigNumber;
  listPrice: BigNumber;
  listType: number;
  intermediaryFeePercentage: number;
  tokenOwner: string;
  bidder: string;
  intermediary: string;
  listCurrency: string;
}

export class LandListing {
  public readonly chainId: number
  public readonly readOnly: boolean
  public readonly signerOrProvider: Signer | Provider
  public readonly landListing: LandListingContract
 public  landAddress: string;

  constructor(signerOrProvider: Signer | Provider, chainId: number, landAddress?: string) {
    this.chainId = chainId;
    this.readOnly = !Signer.isSigner(signerOrProvider);
    this.signerOrProvider = signerOrProvider;
    const network = chainIdToNetworkName(chainId);
    const address = landListingAddresses[network];
    this.landListing = LandListing__factory.connect(address, signerOrProvider);

    if (landAddress) {
      const parsedLandAddress = validateAndParseAddress(landAddress); 
      this.landAddress = parsedLandAddress; 
    } else {
      this.landAddress = addresses[network].land; 
    } 
  }

  public async fetchListing(listingId: BigNumberish): Promise<LandList> {
    return this.landListing.listings(listingId)
  }

  public async fetchListingFromTransactionReceipt(
    receipt: TransactionReceipt
  ): Promise<LandList | null> {
    for (const log of receipt.logs) {
      const description = this.landListing.interface.parseLog(log)

      if (description.args.listingId && log.address === this.landListing.address) {
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
    tokenAddress: string = this.landAddress
  ) {
    return this.landListing.createListing(
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
    return this.landListing.setListingApproval(listingId, approved)
  }

  public async setListingDropApproval(
    listingId: BigNumberish,
    approved: boolean,
    startsAt: BigNumberish
  ) {
    return this.landListing.setListingDropApproval(listingId, approved, startsAt);
  }

  public async setListingListPrice(
    listingId: BigNumberish,
    listPrice: BigNumberish
  ) {
    return this.landListing.setListingListPrice(listingId, listPrice)
  }

  public async createBid(listingId: BigNumberish, amount: BigNumberish) {
    const { listCurrency } = await this.landListing.listings(listingId)
    // If ETH listing, include the ETH in this transaction
    if (listCurrency === ethers.constants.AddressZero) {
      return this.landListing.createBid(listingId, amount, { value: amount })
    } else {
      return this.landListing.createBid(listingId, amount)
    }
  }

   public async createBidForFixed(listingId: BigNumberish, amount: BigNumberish) {
    const { listCurrency } = await this.landListing.lists(listingId);
    if (listCurrency === ethers.constants.AddressZero) {
      return this.landListing.createBid(listingId, amount, { value: amount });
    } else {
      return this.landListing.createBid(listingId, amount);
    }
  }

  public async endListing(listingId: BigNumberish) {
    return this.landListing.endListing(listingId)
  }

  public async cancelListing(listingId: BigNumberish) {
    return this.landListing.cancelListing(listingId)
  }
}
