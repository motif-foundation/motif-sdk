import { Ask, Bid, BidShares, EIP712Domain, EIP712Signature, LandData } from './types'
import { Decimal } from './Decimal'
import { BigNumber, BigNumberish } from '@ethersproject/bignumber'
import { ContractTransaction } from '@ethersproject/contracts'
import { Provider } from '@ethersproject/providers'
import { Signer } from '@ethersproject/abstract-signer'
import {
  LandExchange,
  LandExchangeFactory,
  Land,
  LandFactory,
} from '@motif-foundation/asset/dist/typechain'
import { addresses } from './addresses'
import { Wallet } from '@ethersproject/wallet'
import { JsonRpcProvider } from '@ethersproject/providers'

import {
  chainIdToNetworkName,
  constructLandData,
  isLandDataVerified,
  validateAndParseAddress,
  validateBidShares,
  validateURI,
} from './utils'
import invariant from 'tiny-invariant'

export class MotifLand {
  public chainId: number
  public landAddress: string
  public landExchangeAddress: string
  public signerOrProvider: Signer | Provider
  public land: Land
  public landExchange: LandExchange
  public readOnly: boolean

  constructor(
    signerOrProvider: Signer | Provider,
    chainId: number,
    landAddress?: string,
    landExchangeAddress?: string,
    spaceContractAddress?: string,
    landOperatorAddr?: string
  ) {
    if (!landAddress != !landExchangeAddress) {
      invariant(
        false,
        'Motif Constructor: landAddress and landExchangeAddress must both be non-null or both be null'
      )
    }

    if (Signer.isSigner(signerOrProvider)) {
      this.readOnly = false
    } else {
      this.readOnly = true
    }

    this.signerOrProvider = signerOrProvider
    this.chainId = chainId

    if (landAddress && landExchangeAddress) {
      const parsedLandAddress = validateAndParseAddress(landAddress)
      const parsedLandExchangeAddress = validateAndParseAddress(landExchangeAddress)
      this.landAddress = parsedLandAddress
      this.landExchangeAddress = parsedLandExchangeAddress
    } else {
      const network = chainIdToNetworkName(chainId)
      this.landAddress = addresses[network].land
      this.landExchangeAddress = addresses[network].landExchange
    }

    this.land = LandFactory.connect(this.landAddress, signerOrProvider)
    this.landExchange = LandExchangeFactory.connect(
      this.landExchangeAddress,
      signerOrProvider
    )
  }

  /*********************
   * Land Read Methods
   *********************
   */

  public async fetchContentHash(landId: BigNumberish): Promise<string> {
    return this.land.tokenContentHashes(landId)
  }

  public async fetchMetadataHash(landId: BigNumberish): Promise<string> {
    return this.land.tokenMetadataHashes(landId)
  }

  public async fetchContentURI(landId: BigNumberish): Promise<string> {
    return this.land.tokenURI(landId)
  }

  public async fetchMetadataURI(landId: BigNumberish): Promise<string> {
    return this.land.tokenMetadataURI(landId)
  }

  public async fetchCreator(landId: BigNumberish): Promise<string> {
    return this.land.tokenCreators(landId)
  }

  public async fetchXCoordinate(landId: BigNumberish): Promise<number> {
    return this.land.xCoordinate(landId)
  }

  public async fetchYCoordinate(landId: BigNumberish): Promise<number> {
    return this.land.yCoordinate(landId)
  }

  public async fetchCurrentBidShares(landId: BigNumberish): Promise<BidShares> {
    return this.landExchange.bidSharesForToken(landId)
  }

  public async fetchCurrentAsk(landId: BigNumberish): Promise<Ask> {
    return this.landExchange.currentAskForToken(landId)
  }

  public async fetchCurrentBidForBidder(
    landId: BigNumberish,
    bidder: string
  ): Promise<Bid> {
    return this.landExchange.bidForTokenBidder(landId, bidder)
  }

  public async fetchPermitNonce(
    address: string,
    landId: BigNumberish
  ): Promise<BigNumber> {
    return this.land.permitNonces(address, landId)
  }

  public async fetchMintWithSigNonce(address: string): Promise<BigNumber> {
    return this.land.mintWithSigNonces(address)
  }

  /*********************
   *  Land Write Methods
   *********************
   */

  public async updateContentURI(
    landId: BigNumberish,
    tokenURI: string
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
      validateURI(tokenURI)
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.land.updateTokenURI(landId, tokenURI)
  }

  public async updateMetadataURI(
    landId: BigNumberish,
    metadataURI: string
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
      validateURI(metadataURI)
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.land.updateTokenMetadataURI(landId, metadataURI)
  }

  public async mint(
    landData: LandData,
    bidShares: BidShares
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
      validateURI(landData.metadataURI)
      validateURI(landData.tokenURI)
      validateBidShares(bidShares.creator, bidShares.owner, bidShares.prevOwner)
    } catch (err) {
      return Promise.reject(err.message)
    }

    const gasEstimate = await this.land.estimateGas.mint(landData, bidShares)
    const paddedEstimate = gasEstimate.mul(110).div(100)
    return this.land.mint(landData, bidShares, {
      gasLimit: paddedEstimate.toString(),
    })
  }

  public async setAsk(landId: BigNumberish, ask: Ask): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.land.setAsk(landId, ask)
  }

  public async setBid(landId: BigNumberish, bid: Bid): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.land.setBid(landId, bid)
  }

  public async removeAsk(landId: BigNumberish): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.land.removeAsk(landId)
  }

  public async removeBid(landId: BigNumberish): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.land.removeBid(landId)
  }

  public async acceptBid(landId: BigNumberish, bid: Bid): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.land.acceptBid(landId, bid)
  }

  public async permit(
    spender: string,
    landId: BigNumberish,
    sig: EIP712Signature
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.land.permit(spender, landId, sig)
  }

  public async revokeApproval(landId: BigNumberish): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.land.revokeApproval(landId)
  }

  public async burn(landId: BigNumberish): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.land.burn(landId)
  }

  /***********************
   * ERC-721 Read Methods
   ***********************
   */

  public async fetchBalanceOf(owner: string): Promise<BigNumber> {
    return this.land.balanceOf(owner)
  }

  public async fetchOwnerOf(landId: BigNumberish): Promise<string> {
    return this.land.ownerOf(landId)
  }

  public async fetchLandOfOwnerByIndex(
    owner: string,
    index: BigNumberish
  ): Promise<BigNumber> {
    return this.land.tokenOfOwnerByIndex(owner, index)
  }

  public async fetchTotalLand(): Promise<BigNumber> {
    return this.land.totalSupply()
  }

  public async fetchLandByIndex(index: BigNumberish): Promise<BigNumber> {
    return this.land.tokenByIndex(index)
  }

  public async fetchApproved(landId: BigNumberish): Promise<string> {
    return this.land.getApproved(landId)
  }

  public async fetchIsApprovedForAll(owner: string, operator: string): Promise<boolean> {
    return this.land.isApprovedForAll(owner, operator)
  }

  /***********************
   * ERC-721 Write Methods
   ***********************
   */

  public async approve(to: string, landId: BigNumberish): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.land.approve(to, landId)
  }

  public async setApprovalForAll(
    operator: string,
    approved: boolean
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.land.setApprovalForAll(operator, approved)
  }

  public async transferFrom(
    from: string,
    to: string,
    landId: BigNumberish
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.land.transferFrom(from, to, landId)
  }

  public async safeTransferFrom(
    from: string,
    to: string,
    landId: BigNumberish
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.land.safeTransferFrom(from, to, landId)
  }

  /****************
   * Miscellaneous
   * **************
   */

  public eip712Domain(): EIP712Domain {
    // Due to a bug in ganache-core, set the chainId to 1 if its a local blockchain
    // https://github.com/trufflesuite/ganache-core/issues/515
    const chainId = this.chainId == 50 ? 1 : this.chainId

    return {
      name: 'Motif',
      version: '1',
      chainId: chainId,
      verifyingContract: this.landAddress,
    }
  }

  public async isValidBid(landId: BigNumberish, bid: Bid): Promise<boolean> {
    const isAmountValid = await this.landExchange.isValidBid(landId, bid.amount)
    const decimal100 = Decimal.new(100)
    const currentBidShares = await this.fetchCurrentBidShares(landId)
    const isSellOnShareValid = bid.sellOnShare.value.lte(
      decimal100.value.sub(currentBidShares.creator.value)
    )

    return isAmountValid && isSellOnShareValid
  }

  public isValidAsk(landId: BigNumberish, ask: Ask): Promise<boolean> {
    return this.landExchange.isValidBid(landId, ask.amount)
  }

  public async isVerifiedLand(
    landId: BigNumberish,
    timeout: number = 10
  ): Promise<boolean> {
    try {
      const [tokenURI, metadataURI, contentHash, metadataHash, xCoordinate, yCoordinate] =
        await Promise.all([
          this.fetchContentURI(landId),
          this.fetchMetadataURI(landId),
          this.fetchContentHash(landId),
          this.fetchMetadataHash(landId),
          this.fetchXCoordinate(landId),
          this.fetchYCoordinate(landId),
        ])

      const landData = constructLandData(
        tokenURI,
        metadataURI,
        contentHash,
        metadataHash,
        xCoordinate,
        yCoordinate
      )
      return isLandDataVerified(landData, timeout)
    } catch (err) {
      return Promise.reject(err.message)
    }
  }

  /******************
   * Private Methods
   ******************
   */

  private ensureNotReadOnly() {
    if (this.readOnly) {
      throw new Error(
        'ensureNotReadOnly: readOnly Motif instance cannot call contract methods that require a signer.'
      )
    }
  }
}
