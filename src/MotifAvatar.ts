import { Ask, Bid, BidShares, EIP712Domain, EIP712Signature, AvatarData } from './types'
import { Decimal } from './Decimal'
import { BigNumber, BigNumberish } from '@ethersproject/bignumber'
import { ContractTransaction } from '@ethersproject/contracts'
import { Provider } from '@ethersproject/providers'
import { Signer } from '@ethersproject/abstract-signer'
import {
  AvatarExchange,
  AvatarExchangeFactory,
  Avatar,
  AvatarFactory,
} from '@motif-foundation/asset/dist/typechain'
import { addresses } from './addresses'
import {
  chainIdToNetworkName,
  constructAvatarData,
  isAvatarDataVerified,
  validateAndParseAddress,
  validateBidShares,
  validateURI,
} from './utils'
import invariant from 'tiny-invariant'

export class MotifAvatar {
  public chainId: number
  public avatarAddress: string
  public avatarExchangeAddress: string
  public signerOrProvider: Signer | Provider
  public avatar: Avatar
  public avatarExchange: AvatarExchange
  public readOnly: boolean

  constructor(signerOrProvider: Signer | Provider, chainId: number) {
    if (Signer.isSigner(signerOrProvider)) {
      this.readOnly = false
    } else {
      this.readOnly = true
    }

    this.signerOrProvider = signerOrProvider
    this.chainId = chainId

    const network = chainIdToNetworkName(chainId)
    this.avatarAddress = addresses[network].avatar
    this.avatarExchangeAddress = addresses[network].avatarExchange

    this.avatar = AvatarFactory.connect(this.avatarAddress, signerOrProvider)
    this.avatarExchange = AvatarExchangeFactory.connect(
      this.avatarExchangeAddress,
      signerOrProvider
    )
  }

  /*********************
   * Motif View Methods
   *********************
   */

  /**
   * Fetches the content hash for the specified avatar on the Motif Avatar Contract
   * @param avatarId
   */
  public async fetchContentHash(avatarId: BigNumberish): Promise<string> {
    return this.avatar.tokenContentHashes(avatarId)
  }

  /**
   * Fetches the metadata hash for the specified avatar on an instance of the Motif Avatar Contract
   * @param avatarId
   */
  public async fetchMetadataHash(avatarId: BigNumberish): Promise<string> {
    return this.avatar.tokenMetadataHashes(avatarId)
  }

  /**
   * Fetches the metadata hash for the specified avatar on an instance of the Motif Avatar Contract
   * @param avatarId
   */
  public async fetchTokenContract(avatarId: BigNumberish): Promise<string> {
    return this.avatar.tokenContractAddresses(avatarId)
  }

  /**
   * Fetches the content uri for the specified avatar on an instance of the Motif Avatar Contract
   * @param avatarId
   */
  public async fetchContentURI(avatarId: BigNumberish): Promise<string> {
    return this.avatar.tokenURI(avatarId)
  }

  /**
   * Fetches the metadata uri for the specified avatar on an instance of the Motif Avatar Contract
   * @param avatarId
   */
  public async fetchMetadataURI(avatarId: BigNumberish): Promise<string> {
    return this.avatar.tokenMetadataURI(avatarId)
  }

  /**
   * Fetches the default for the specified avatar on an instance of the Motif Avatar Contract
   * @param avatarId
   */
  public async fetchIsDefault(avatarId: BigNumberish): Promise<boolean> {
    return this.avatar.tokenDefault(avatarId)
  }

  /**
   * Fetches the creator for the specified avatar on an instance of the Motif Avatar Contract
   * @param avatarId
   */
  public async fetchCreator(avatarId: BigNumberish): Promise<string> {
    return this.avatar.tokenCreators(avatarId)
  }

  /**
   * Fetches the current bid shares for the specified avatar on an instance of the Motif Avatar Contract
   * @param avatarId
   */
  public async fetchCurrentBidShares(avatarId: BigNumberish): Promise<BidShares> {
    return this.avatarExchange.bidSharesForToken(avatarId)
  }

  /**
   * Fetches the current ask for the specified avatar on an instance of the Motif Avatar Contract
   * @param avatarId
   */
  public async fetchCurrentAsk(avatarId: BigNumberish): Promise<Ask> {
    return this.avatarExchange.currentAskForToken(avatarId)
  }

  /**
   * Fetches the current bid for the specified bidder for the specified avatar on an instance of the Motif Avatar Contract
   * @param avatarId
   * @param bidder
   */
  public async fetchCurrentBidForBidder(
    avatarId: BigNumberish,
    bidder: string
  ): Promise<Bid> {
    return this.avatarExchange.bidForTokenBidder(avatarId, bidder)
  }

  /**
   * Fetches the permit nonce on the specified avatar id for the owner address
   * @param address
   * @param avatarId
   */
  public async fetchPermitNonce(
    address: string,
    avatarId: BigNumberish
  ): Promise<BigNumber> {
    return this.avatar.permitNonces(address, avatarId)
  }

  /**
   * Fetches the current mintWithSig nonce for the specified address
   * @param address
   * @param avatarId
   */
  public async fetchMintWithSigNonce(address: string): Promise<BigNumber> {
    return this.avatar.mintWithSigNonces(address)
  }

  /*********************
   * Motif Write Methods
   *********************
   */

  /**
   * Updates the content uri for the specified avatar on an instance of the Motif Avatar Contract
   * @param avatarId
   * @param tokenURI
   */
  public async updateContentURI(
    avatarId: BigNumberish,
    tokenURI: string
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
      validateURI(tokenURI)
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.avatar.updateTokenURI(avatarId, tokenURI)
  }

  /**
   * Updates the metadata uri for the specified avatar on an instance of the Motif Avatar Contract
   * @param avatarId
   * @param metadataURI
   */
  public async updateMetadataURI(
    avatarId: BigNumberish,
    metadataURI: string
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
      validateURI(metadataURI)
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.avatar.updateTokenMetadataURI(avatarId, metadataURI)
  }

  /**
   * Updates the metadata uri for the specified avatar on an instance of the Motif Avatar Contract
   * @param avatarId
   * @param isDefault
   */
  public async updateIsDefault(
    avatarId: BigNumberish,
    isDefault: boolean
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.avatar.updateTokenDefault(avatarId, isDefault)
  }

  /**
   * Mints a new piece of avatar on an instance of the Motif Avatar Contract
   * @param mintData
   * @param bidShares
   */
  public async mint(
    avatarData: AvatarData,
    bidShares: BidShares
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
      validateURI(avatarData.metadataURI)
      validateURI(avatarData.tokenURI)
      validateBidShares(bidShares.creator, bidShares.owner, bidShares.prevOwner)
    } catch (err) {
      return Promise.reject(err.message)
    }

    const gasEstimate = await this.avatar.estimateGas.mint(avatarData, bidShares)
    const paddedEstimate = gasEstimate.mul(110).div(100)
    return this.avatar.mint(avatarData, bidShares, {
      gasLimit: paddedEstimate.toString(),
    })
  }

  /**
   * Mints a new piece of avatar on an instance of the Motif Avatar Contract
   * @param creator
   * @param avatarData
   * @param bidShares
   * @param sig
   */
  public async mintWithSig(
    creator: string,
    avatarData: AvatarData,
    bidShares: BidShares,
    sig: EIP712Signature
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
      validateURI(avatarData.metadataURI)
      validateURI(avatarData.tokenURI)
      validateBidShares(bidShares.creator, bidShares.owner, bidShares.prevOwner)
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.avatar.mintWithSig(creator, avatarData, bidShares, sig)
  }

  /**
   * Sets an ask on the specified avatar on an instance of the Motif Avatar Contract
   * @param avatarId
   * @param ask
   */
  public async setAsk(avatarId: BigNumberish, ask: Ask): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.avatar.setAsk(avatarId, ask)
  }

  /**
   * Sets a bid on the specified avatar on an instance of the Motif Avatar Contract
   * @param avatarId
   * @param bid
   */
  public async setBid(avatarId: BigNumberish, bid: Bid): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.avatar.setBid(avatarId, bid)
  }

  /**
   * Removes the ask on the specified avatar on an instance of the Motif Avatar Contract
   * @param avatarId
   */
  public async removeAsk(avatarId: BigNumberish): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.avatar.removeAsk(avatarId)
  }

  /**
   * Removes the bid for the msg.sender on the specified avatar on an instance of the Motif Avatar Contract
   * @param avatarId
   */
  public async removeBid(avatarId: BigNumberish): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.avatar.removeBid(avatarId)
  }

  /**
   * Accepts the specified bid on the specified avatar on an instance of the Motif Avatar Contract
   * @param avatarId
   * @param bid
   */
  public async acceptBid(avatarId: BigNumberish, bid: Bid): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.avatar.acceptBid(avatarId, bid)
  }

  /**
   * Grants the spender approval for the specified avatar using meta transactions as outlined in EIP-712
   * @param sender
   * @param avatarId
   * @param sig
   */
  public async permit(
    spender: string,
    avatarId: BigNumberish,
    sig: EIP712Signature
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.avatar.permit(spender, avatarId, sig)
  }

  /**
   * Revokes the approval of an approved account for the specified avatar on an instance of the Motif Avatar Contract
   * @param avatarId
   */
  public async revokeApproval(avatarId: BigNumberish): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.avatar.revokeApproval(avatarId)
  }

  /**
   * Burns the specified avatar on an instance of the Motif Avatar Contract
   * @param avatarId
   */
  public async burn(avatarId: BigNumberish): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.avatar.burn(avatarId)
  }

  /***********************
   * ERC-721 View Methods
   ***********************
   */

  /**
   * Fetches the total balance of avatar owned by the specified owner on an instance of the Motif Avatar Contract
   * @param owner
   */
  public async fetchBalanceOf(owner: string): Promise<BigNumber> {
    return this.avatar.balanceOf(owner)
  }

  /**
   * Fetches the owner of the specified avatar on an instance of the Motif Avatar Contract
   * @param avatarId
   */
  public async fetchOwnerOf(avatarId: BigNumberish): Promise<string> {
    return this.avatar.ownerOf(avatarId)
  }

  /**
   * Fetches the avatarId of the specified owner by index on an instance of the Motif Avatar Contract
   * @param owner
   * @param index
   */
  public async fetchAvatarOfOwnerByIndex(
    owner: string,
    index: BigNumberish
  ): Promise<BigNumber> {
    return this.avatar.tokenOfOwnerByIndex(owner, index)
  }

  /**
   * Fetches the total amount of non-burned avatar that has been minted on an instance of the Motif Avatar Contract
   */
  public async fetchTotalAvatar(): Promise<BigNumber> {
    return this.avatar.totalSupply()
  }

  /**
   * Fetches the avatarId by index on an instance of the Motif Avatar Contract
   * @param index
   */
  public async fetchAvatarByIndex(index: BigNumberish): Promise<BigNumber> {
    return this.avatar.tokenByIndex(index)
  }

  /**
   * Fetches the approved account for the specified avatar on an instance of the Motif Avatar Contract
   * @param avatarId
   */
  public async fetchApproved(avatarId: BigNumberish): Promise<string> {
    return this.avatar.getApproved(avatarId)
  }

  /**
   * Fetches if the specified operator is approved for all avatar owned by the specified owner on an instance of the Motif Avatar Contract
   * @param owner
   * @param operator
   */
  public async fetchIsApprovedForAll(owner: string, operator: string): Promise<boolean> {
    return this.avatar.isApprovedForAll(owner, operator)
  }

  /***********************
   * ERC-721 Write Methods
   ***********************
   */

  /**
   * Grants approval to the specified address for the specified avatar on an instance of the Motif Avatar Contract
   * @param to
   * @param avatarId
   */
  public async approve(to: string, avatarId: BigNumberish): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.avatar.approve(to, avatarId)
  }

  /**
   * Grants approval for all avatar owner by msg.sender on an instance of the Motif Avatar Contract
   * @param operator
   * @param approved
   */
  public async setApprovalForAll(
    operator: string,
    approved: boolean
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.avatar.setApprovalForAll(operator, approved)
  }

  /**
   * Transfers the specified avatar to the specified to address on an instance of the Motif Avatar Contract
   * @param from
   * @param to
   * @param avatarId
   */
  public async transferFrom(
    from: string,
    to: string,
    avatarId: BigNumberish
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.avatar.transferFrom(from, to, avatarId)
  }

  /**
   * Executes a SafeTransfer of the specified avatar to the specified address if and only if it adheres to the ERC721-Receiver Interface
   * @param from
   * @param to
   * @param avatarId
   */
  public async safeTransferFrom(
    from: string,
    to: string,
    avatarId: BigNumberish
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.avatar.safeTransferFrom(from, to, avatarId)
  }

  /****************
   * Miscellaneous
   * **************
   */

  /**
   * Returns the EIP-712 Domain for an instance of the Motif Avatar Contract
   */
  public eip712Domain(): EIP712Domain {
    // Due to a bug in ganache-core, set the chainId to 1 if its a local blockchain
    // https://github.com/trufflesuite/ganache-core/issues/515
    const chainId = this.chainId == 50 ? 1 : this.chainId

    return {
      name: 'Motif',
      version: '1',
      chainId: chainId,
      verifyingContract: this.avatarAddress,
    }
  }

  /**
   * Checks to see if a Bid's amount is evenly splittable given the avatar's current bidShares
   *
   * @param avatarId
   * @param bid
   */
  public async isValidBid(avatarId: BigNumberish, bid: Bid): Promise<boolean> {
    const isAmountValid = await this.avatarExchange.isValidBid(avatarId, bid.amount)
    const decimal100 = Decimal.new(100)
    const currentBidShares = await this.fetchCurrentBidShares(avatarId)
    const isSellOnShareValid = bid.sellOnShare.value.lte(
      decimal100.value.sub(currentBidShares.creator.value)
    )

    return isAmountValid && isSellOnShareValid
  }

  /**
   * Checks to see if an Ask's amount is evenly splittable given the avatar's current bidShares
   *
   * @param avatarId
   * @param ask
   */
  public isValidAsk(avatarId: BigNumberish, ask: Ask): Promise<boolean> {
    return this.avatarExchange.isValidBid(avatarId, ask.amount)
  }

  /**
   * Checks to see if a piece of avatar has verified uris that hash to their immutable hashes
   *
   * @param avatarId
   * @param timeout
   */
  public async isVerifiedAvatar(
    avatarId: BigNumberish,
    timeout: number = 10
  ): Promise<boolean> {
    try {
      const [tokenURI, metadataURI, contentHash, metadataHash, isDefault] =
        await Promise.all([
          this.fetchContentURI(avatarId),
          this.fetchMetadataURI(avatarId),
          this.fetchContentHash(avatarId),
          this.fetchMetadataHash(avatarId),
          this.fetchIsDefault(avatarId),
        ])

      const avatarData = constructAvatarData(
        tokenURI,
        metadataURI,
        contentHash,
        metadataHash,
        isDefault
      )
      return isAvatarDataVerified(avatarData, timeout)
    } catch (err) {
      return Promise.reject(err.message)
    }
  }

  /******************
   * Private Methods
   ******************
   */

  /**
   * Throws an error if called on a readOnly == true instance of Motif Sdk
   * @private
   */
  private ensureNotReadOnly() {
    if (this.readOnly) {
      throw new Error(
        'ensureNotReadOnly: readOnly Motif instance cannot call contract methods that require a signer.'
      )
    }
  }
}
