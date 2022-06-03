import { Ask, Bid, BidShares, EIP712Domain, EIP712Signature, ItemData } from './types'
import { Decimal } from './Decimal'
import { BigNumber, BigNumberish } from '@ethersproject/bignumber'
import { ContractTransaction } from '@ethersproject/contracts'
import { Provider } from '@ethersproject/providers'
import { Signer } from '@ethersproject/abstract-signer'
import {
  ItemExchange,
  ItemExchangeFactory,
  Item,
  ItemFactory,
} from '@motif-foundation/asset/dist/typechain'
import { addresses } from './addresses'
import {
  chainIdToNetworkName,
  constructItemData,
  isItemDataVerified,
  validateAndParseAddress,
  validateBidShares,
  validateURI,
} from './utils'
import invariant from 'tiny-invariant'

export class MotifItem {
  public chainId: number
  public itemAddress: string
  public itemExchangeAddress: string
  public signerOrProvider: Signer | Provider
  public item: Item
  public itemExchange: ItemExchange
  public readOnly: boolean

  constructor(
    signerOrProvider: Signer | Provider,
    chainId: number,
    itemAddress?: string,
    itemExchangeAddress?: string
  ) {
    if (!itemAddress != !itemExchangeAddress) {
      invariant(
        false,
        'Motif Constructor: itemAddress and itemExchangeAddress must both be non-null or both be null'
      )
    }

    if (Signer.isSigner(signerOrProvider)) {
      this.readOnly = false
    } else {
      this.readOnly = true
    }

    this.signerOrProvider = signerOrProvider
    this.chainId = chainId

    if (itemAddress && itemExchangeAddress) {
      const parsedItemAddress = validateAndParseAddress(itemAddress)
      const parsedItemExchangeAddress = validateAndParseAddress(itemExchangeAddress)
      this.itemAddress = parsedItemAddress
      this.itemExchangeAddress = parsedItemExchangeAddress
    } else {
      const network = chainIdToNetworkName(chainId)
      this.itemAddress = addresses[network].item
      this.itemExchangeAddress = addresses[network].itemExchange
    }

    this.item = ItemFactory.connect(this.itemAddress, signerOrProvider)
    this.itemExchange = ItemExchangeFactory.connect(
      this.itemExchangeAddress,
      signerOrProvider
    )
  }

  /*********************
   * Motif View Methods
   *********************
   */

  /**
   * Fetches the content hash for the specified item on the Motif Item Contract
   * @param itemId
   */
  public async fetchContentHash(itemId: BigNumberish): Promise<string> {
    return this.item.tokenContentHashes(itemId)
  }

  /**
   * Fetches the metadata hash for the specified item on an instance of the Motif Item Contract
   * @param itemId
   */
  public async fetchMetadataHash(itemId: BigNumberish): Promise<string> {
    return this.item.tokenMetadataHashes(itemId)
  }

  /**
   * Fetches the metadata hash for the specified item on an instance of the Motif Item Contract
   * @param itemId
   */
  public async fetchTokenContract(itemId: BigNumberish): Promise<string> {
    return this.item.tokenContractAddresses(itemId)
  }

  /**
   * Fetches the content uri for the specified item on an instance of the Motif Item Contract
   * @param itemId
   */
  public async fetchContentURI(itemId: BigNumberish): Promise<string> {
    return this.item.tokenURI(itemId)
  }
  /**
   * Fetches the metadata uri for the specified item on an instance of the Motif Item Contract
   * @param itemId
   */
  public async fetchMetadataURI(itemId: BigNumberish): Promise<string> {
    return this.item.tokenMetadataURI(itemId)
  }

  /**
   * Fetches the creator for the specified item on an instance of the Motif Item Contract
   * @param itemId
   */
  public async fetchCreator(itemId: BigNumberish): Promise<string> {
    return this.item.tokenCreators(itemId)
  }

  /**
   * Fetches the current bid shares for the specified item on an instance of the Motif Item Contract
   * @param itemId
   */
  public async fetchCurrentBidShares(itemId: BigNumberish): Promise<BidShares> {
    return this.itemExchange.bidSharesForToken(itemId)
  }

  /**
   * Fetches the current ask for the specified item on an instance of the Motif Item Contract
   * @param itemId
   */
  public async fetchCurrentAsk(itemId: BigNumberish): Promise<Ask> {
    return this.itemExchange.currentAskForToken(itemId)
  }

  /**
   * Fetches the current bid for the specified bidder for the specified item on an instance of the Motif Item Contract
   * @param itemId
   * @param bidder
   */
  public async fetchCurrentBidForBidder(
    itemId: BigNumberish,
    bidder: string
  ): Promise<Bid> {
    return this.itemExchange.bidForTokenBidder(itemId, bidder)
  }

  /**
   * Fetches the permit nonce on the specified item id for the owner address
   * @param address
   * @param itemId
   */
  public async fetchPermitNonce(
    address: string,
    itemId: BigNumberish
  ): Promise<BigNumber> {
    return this.item.permitNonces(address, itemId)
  }

  /**
   * Fetches the current mintWithSig nonce for the specified address
   * @param address
   * @param itemId
   */
  public async fetchMintWithSigNonce(address: string): Promise<BigNumber> {
    return this.item.mintWithSigNonces(address)
  }

  /*********************
   * Motif Write Methods
   *********************
   */

  /**
   * Updates the content uri for the specified item on an instance of the Motif Item Contract
   * @param itemId
   * @param tokenURI
   */
  public async updateContentURI(
    itemId: BigNumberish,
    tokenURI: string
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
      validateURI(tokenURI)
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.item.updateTokenURI(itemId, tokenURI)
  }

  /**
   * Updates the metadata uri for the specified item on an instance of the Motif Item Contract
   * @param itemId
   * @param metadataURI
   */
  public async updateMetadataURI(
    itemId: BigNumberish,
    metadataURI: string
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
      validateURI(metadataURI)
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.item.updateTokenMetadataURI(itemId, metadataURI)
  }

  /**
   * Mints a new piece of item on an instance of the Motif Item Contract
   * @param mintData
   * @param bidShares
   */
  public async mint(
    itemData: ItemData,
    bidShares: BidShares
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
      validateURI(itemData.metadataURI)
      validateURI(itemData.tokenURI)
      validateBidShares(bidShares.creator, bidShares.owner, bidShares.prevOwner)
    } catch (err) {
      return Promise.reject(err.message)
    }

    const gasEstimate = await this.item.estimateGas.mint(itemData, bidShares)
    const paddedEstimate = gasEstimate.mul(110).div(100)
    return this.item.mint(itemData, bidShares, { gasLimit: paddedEstimate.toString() })
  }

  public async mintMultiple(
    itemData: Array<ItemData>,
    bidShares: Array<BidShares>
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
      itemData.map((item, index) => {
        validateURI(item.metadataURI)
        validateURI(item.tokenURI)
        validateBidShares(
          bidShares[index].creator,
          bidShares[index].owner,
          bidShares[index].prevOwner
        )
      })
    } catch (err) {
      return Promise.reject(err.message)
    }

    const gasEstimate = await this.item.estimateGas.mintMultiple(itemData, bidShares)
    const paddedEstimate = gasEstimate.mul(110).div(100)
    return this.item.mintMultiple(itemData, bidShares, {
      gasLimit: paddedEstimate.toString(),
    })
  }

  /**
   * Mints a new piece of item on an instance of the Motif Item Contract
   * @param creator
   * @param itemData
   * @param bidShares
   * @param sig
   */
  public async mintWithSig(
    creator: string,
    itemData: ItemData,
    bidShares: BidShares,
    sig: EIP712Signature
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
      validateURI(itemData.metadataURI)
      validateURI(itemData.tokenURI)
      validateBidShares(bidShares.creator, bidShares.owner, bidShares.prevOwner)
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.item.mintWithSig(creator, itemData, bidShares, sig)
  }

  /**
   * Sets an ask on the specified item on an instance of the Motif Item Contract
   * @param itemId
   * @param ask
   */
  public async setAsk(itemId: BigNumberish, ask: Ask): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.item.setAsk(itemId, ask)
  }

  /**
   * Sets a bid on the specified item on an instance of the Motif Item Contract
   * @param itemId
   * @param bid
   */
  public async setBid(itemId: BigNumberish, bid: Bid): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.item.setBid(itemId, bid)
  }

  /**
   * Removes the ask on the specified item on an instance of the Motif Item Contract
   * @param itemId
   */
  public async removeAsk(itemId: BigNumberish): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.item.removeAsk(itemId)
  }

  /**
   * Removes the bid for the msg.sender on the specified item on an instance of the Motif Item Contract
   * @param itemId
   */
  public async removeBid(itemId: BigNumberish): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.item.removeBid(itemId)
  }

  /**
   * Accepts the specified bid on the specified item on an instance of the Motif Item Contract
   * @param itemId
   * @param bid
   */
  public async acceptBid(itemId: BigNumberish, bid: Bid): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.item.acceptBid(itemId, bid)
  }

  /**
   * Grants the spender approval for the specified item using meta transactions as outlined in EIP-712
   * @param sender
   * @param itemId
   * @param sig
   */
  public async permit(
    spender: string,
    itemId: BigNumberish,
    sig: EIP712Signature
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.item.permit(spender, itemId, sig)
  }

  /**
   * Revokes the approval of an approved account for the specified item on an instance of the Motif Item Contract
   * @param itemId
   */
  public async revokeApproval(itemId: BigNumberish): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.item.revokeApproval(itemId)
  }

  /**
   * Burns the specified item on an instance of the Motif Item Contract
   * @param itemId
   */
  public async burn(itemId: BigNumberish): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.item.burn(itemId)
  }

  /***********************
   * ERC-721 View Methods
   ***********************
   */

  /**
   * Fetches the total balance of item owned by the specified owner on an instance of the Motif Item Contract
   * @param owner
   */
  public async fetchBalanceOf(owner: string): Promise<BigNumber> {
    return this.item.balanceOf(owner)
  }

  /**
   * Fetches the owner of the specified item on an instance of the Motif Item Contract
   * @param itemId
   */
  public async fetchOwnerOf(itemId: BigNumberish): Promise<string> {
    return this.item.ownerOf(itemId)
  }

  /**
   * Fetches the itemId of the specified owner by index on an instance of the Motif Item Contract
   * @param owner
   * @param index
   */
  public async fetchItemOfOwnerByIndex(
    owner: string,
    index: BigNumberish
  ): Promise<BigNumber> {
    return this.item.tokenOfOwnerByIndex(owner, index)
  }

  /**
   * Fetches the total amount of non-burned item that has been minted on an instance of the Motif Item Contract
   */
  public async fetchTotalItem(): Promise<BigNumber> {
    return this.item.totalSupply()
  }

  /**
   * Fetches the itemId by index on an instance of the Motif Item Contract
   * @param index
   */
  public async fetchItemByIndex(index: BigNumberish): Promise<BigNumber> {
    return this.item.tokenByIndex(index)
  }

  /**
   * Fetches the approved account for the specified item on an instance of the Motif Item Contract
   * @param itemId
   */
  public async fetchApproved(itemId: BigNumberish): Promise<string> {
    return this.item.getApproved(itemId)
  }

  /**
   * Fetches if the specified operator is approved for all item owned by the specified owner on an instance of the Motif Item Contract
   * @param owner
   * @param operator
   */
  public async fetchIsApprovedForAll(owner: string, operator: string): Promise<boolean> {
    return this.item.isApprovedForAll(owner, operator)
  }

  /***********************
   * ERC-721 Write Methods
   ***********************
   */

  /**
   * Grants approval to the specified address for the specified item on an instance of the Motif Item Contract
   * @param to
   * @param itemId
   */
  public async approve(to: string, itemId: BigNumberish): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.item.approve(to, itemId)
  }

  /**
   * Grants approval for all item owner by msg.sender on an instance of the Motif Item Contract
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

    return this.item.setApprovalForAll(operator, approved)
  }

  /**
   * Transfers the specified item to the specified to address on an instance of the Motif Item Contract
   * @param from
   * @param to
   * @param itemId
   */
  public async transferFrom(
    from: string,
    to: string,
    itemId: BigNumberish
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.item.transferFrom(from, to, itemId)
  }

  /**
   * Executes a SafeTransfer of the specified item to the specified address if and only if it adheres to the ERC721-Receiver Interface
   * @param from
   * @param to
   * @param itemId
   */
  public async safeTransferFrom(
    from: string,
    to: string,
    itemId: BigNumberish
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly()
    } catch (err) {
      return Promise.reject(err.message)
    }

    return this.item.safeTransferFrom(from, to, itemId)
  }

  /****************
   * Miscellaneous
   * **************
   */

  /**
   * Returns the EIP-712 Domain for an instance of the Motif Item Contract
   */
  public eip712Domain(): EIP712Domain {
    // Due to a bug in ganache-core, set the chainId to 1 if its a local blockchain
    // https://github.com/trufflesuite/ganache-core/issues/515
    const chainId = this.chainId == 50 ? 1 : this.chainId

    return {
      name: 'Motif',
      version: '1',
      chainId: chainId,
      verifyingContract: this.itemAddress,
    }
  }

  /**
   * Checks to see if a Bid's amount is evenly splittable given the item's current bidShares
   *
   * @param itemId
   * @param bid
   */
  public async isValidBid(itemId: BigNumberish, bid: Bid): Promise<boolean> {
    const isAmountValid = await this.itemExchange.isValidBid(itemId, bid.amount)
    const decimal100 = Decimal.new(100)
    const currentBidShares = await this.fetchCurrentBidShares(itemId)
    const isSellOnShareValid = bid.sellOnShare.value.lte(
      decimal100.value.sub(currentBidShares.creator.value)
    )

    return isAmountValid && isSellOnShareValid
  }

  /**
   * Checks to see if an Ask's amount is evenly splittable given the item's current bidShares
   *
   * @param itemId
   * @param ask
   */
  public isValidAsk(itemId: BigNumberish, ask: Ask): Promise<boolean> {
    return this.itemExchange.isValidBid(itemId, ask.amount)
  }

  /**
   * Checks to see if a piece of item has verified uris that hash to their immutable hashes
   *
   * @param itemId
   * @param timeout
   */
  public async isVerifiedItem(
    itemId: BigNumberish,
    timeout: number = 10
  ): Promise<boolean> {
    try {
      const [tokenURI, metadataURI, contentHash, metadataHash] = await Promise.all([
        this.fetchContentURI(itemId),
        this.fetchMetadataURI(itemId),
        this.fetchContentHash(itemId),
        this.fetchMetadataHash(itemId),
      ])

      const itemData = constructItemData(tokenURI, metadataURI, contentHash, metadataHash)
      return isItemDataVerified(itemData, timeout)
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
