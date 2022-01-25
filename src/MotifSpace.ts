import {
  Ask,
  Bid,
  BidShares,
  EIP712Domain,
  EIP712Signature,
  SpaceData,
} from "./types";
import { Decimal } from "./Decimal";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { ContractTransaction } from "@ethersproject/contracts";
import { Provider } from "@ethersproject/providers";
import { Signer } from "@ethersproject/abstract-signer";
import {
  SpaceExchange,
  SpaceExchangeFactory,
  Space,
  SpaceFactory,
} from "@motif-foundation/asset/dist/typechain";
import { addresses } from "./addresses";
import { Wallet } from "@ethersproject/wallet";
import { JsonRpcProvider } from "@ethersproject/providers";

import {
  chainIdToNetworkName,
  constructSpaceData,
  isSpaceDataVerified,
  validateAndParseAddress,
  validateBidShares,
  validateURI,
} from "./utils";
import invariant from "tiny-invariant";

export class MotifSpace {
  public chainId: number;
  public spaceAddress: string;
  public spaceExchangeAddress: string;
  public signerOrProvider: Signer | Provider;
  public space: Space;
  public spaceExchange: SpaceExchange;
  public readOnly: boolean;

  constructor(
    signerOrProvider: Signer | Provider,
    chainId: number,
    spaceAddress?: string,
    spaceExchangeAddress?: string
  ) {
    if (!spaceAddress != !spaceExchangeAddress) {
      invariant(
        false,
        "Motif Constructor: spaceAddress and spaceExchangeAddress must both be non-null or both be null"
      );
    }

    if (Signer.isSigner(signerOrProvider)) {
      this.readOnly = false;
    } else {
      this.readOnly = true;
    }

    this.signerOrProvider = signerOrProvider;
    this.chainId = chainId;

    if (spaceAddress && spaceExchangeAddress) {
      const parsedSpaceAddress = validateAndParseAddress(spaceAddress);
      const parsedSpaceExchangeAddress =
        validateAndParseAddress(spaceExchangeAddress);
      this.spaceAddress = parsedSpaceAddress;
      this.spaceExchangeAddress = parsedSpaceExchangeAddress;
    } else {
      const network = chainIdToNetworkName(chainId);
      this.spaceAddress = addresses[network].space;
      this.spaceExchangeAddress = addresses[network].spaceExchange;
    }

    this.space = SpaceFactory.connect(this.spaceAddress, signerOrProvider);
    this.spaceExchange = SpaceExchangeFactory.connect(
      this.spaceExchangeAddress,
      signerOrProvider
    );
  }

  /*********************
   * Space Read Methods
   *********************
   */

  public async fetchContentHash(spaceId: BigNumberish): Promise<string> {
    return this.space.tokenContentHashes(spaceId);
  }

  public async fetchMetadataHash(spaceId: BigNumberish): Promise<string> {
    return this.space.tokenMetadataHashes(spaceId);
  }

  public async fetchContentURI(spaceId: BigNumberish): Promise<string> {
    return this.space.tokenURI(spaceId);
  }

  public async fetchMetadataURI(spaceId: BigNumberish): Promise<string> {
    return this.space.tokenMetadataURI(spaceId);
  }

  public async fetchIsPublic(spaceId: BigNumberish): Promise<boolean> {
    return this.space.isPublic(spaceId);
  }

  public async fetchLands(spaceId: BigNumberish): Promise<Array<BigNumberish>> {
    return this.space.lands(spaceId);
  }

  public async fetchCreator(spaceId: BigNumberish): Promise<string> {
    return this.space.tokenCreators(spaceId);
  }

  public async fetchCurrentBidShares(spaceId: BigNumberish): Promise<BidShares> {
    return this.spaceExchange.bidSharesForToken(spaceId);
  }

  public async fetchCurrentAsk(spaceId: BigNumberish): Promise<Ask> {
    return this.spaceExchange.currentAskForToken(spaceId);
  }

  public async fetchCurrentBidForBidder(
    spaceId: BigNumberish,
    bidder: string
  ): Promise<Bid> {
    return this.spaceExchange.bidForTokenBidder(spaceId, bidder);
  }

  public async fetchPermitNonce(
    address: string,
    spaceId: BigNumberish
  ): Promise<BigNumber> {
    return this.space.permitNonces(address, spaceId);
  }

  public async fetchMintWithSigNonce(address: string): Promise<BigNumber> {
    return this.space.mintWithSigNonces(address);
  }

  /*********************
   *  Space Write Methods
   *********************
   */

  public async updateContentURI(
    spaceId: BigNumberish,
    tokenURI: string
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly();
      validateURI(tokenURI);
    } catch (err) {
      return Promise.reject(err.message);
    }

    return this.space.updateTokenURI(spaceId, tokenURI);
  }

  public async updateMetadataURI(
    spaceId: BigNumberish,
    metadataURI: string
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly();
      validateURI(metadataURI);
    } catch (err) {
      return Promise.reject(err.message);
    }

    return this.space.updateTokenMetadataURI(spaceId, metadataURI);
  }

  public async mint(
    spaceData: SpaceData,
    bidShares: BidShares
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly();
      validateURI(spaceData.metadataURI);
      validateURI(spaceData.tokenURI);
      validateBidShares(
        bidShares.creator,
        bidShares.owner,
        bidShares.prevOwner
      );
    } catch (err) {
      return Promise.reject(err.message);
    }

    const gasEstimate = await this.space.estimateGas.mint(spaceData, bidShares);
    const paddedEstimate = gasEstimate.mul(110).div(100);
    return this.space.mint(spaceData, bidShares, {
      gasLimit: paddedEstimate.toString(),
    });
  }
 

  public async setAsk(
    spaceId: BigNumberish,
    ask: Ask
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly();
    } catch (err) {
      return Promise.reject(err.message);
    }

    return this.space.setAsk(spaceId, ask);
  }

  public async setBid(
    spaceId: BigNumberish,
    bid: Bid
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly();
    } catch (err) {
      return Promise.reject(err.message);
    }

    return this.space.setBid(spaceId, bid);
  }

  public async removeAsk(spaceId: BigNumberish): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly();
    } catch (err) {
      return Promise.reject(err.message);
    }

    return this.space.removeAsk(spaceId);
  }

  public async removeBid(spaceId: BigNumberish): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly();
    } catch (err) {
      return Promise.reject(err.message);
    }

    return this.space.removeBid(spaceId);
  }

  public async acceptBid(
    spaceId: BigNumberish,
    bid: Bid
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly();
    } catch (err) {
      return Promise.reject(err.message);
    }

    return this.space.acceptBid(spaceId, bid);
  }

  public async permit(
    spender: string,
    spaceId: BigNumberish,
    sig: EIP712Signature
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly();
    } catch (err) {
      return Promise.reject(err.message);
    }

    return this.space.permit(spender, spaceId, sig);
  }

  public async revokeApproval(
    spaceId: BigNumberish
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly();
    } catch (err) {
      return Promise.reject(err.message);
    }

    return this.space.revokeApproval(spaceId);
  }

  public async burn(spaceId: BigNumberish): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly();
    } catch (err) {
      return Promise.reject(err.message);
    }

    return this.space.burn(spaceId);
  }

  /***********************
   * ERC-721 Read Methods
   ***********************
   */

  public async fetchBalanceOf(owner: string): Promise<BigNumber> {
    return this.space.balanceOf(owner);
  }

  public async fetchOwnerOf(spaceId: BigNumberish): Promise<string> {
    return this.space.ownerOf(spaceId);
  }

  public async fetchSpaceOfOwnerByIndex(
    owner: string,
    index: BigNumberish
  ): Promise<BigNumber> {
    return this.space.tokenOfOwnerByIndex(owner, index);
  }

  public async fetchTotalSpace(): Promise<BigNumber> {
    return this.space.totalSupply();
  }

  public async fetchSpaceByIndex(index: BigNumberish): Promise<BigNumber> {
    return this.space.tokenByIndex(index);
  }

  public async fetchApproved(spaceId: BigNumberish): Promise<string> {
    return this.space.getApproved(spaceId);
  }

  public async fetchIsApprovedForAll(
    owner: string,
    operator: string
  ): Promise<boolean> {
    return this.space.isApprovedForAll(owner, operator);
  }

  /***********************
   * ERC-721 Write Methods
   ***********************
   */

  public async approve(
    to: string,
    spaceId: BigNumberish
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly();
    } catch (err) {
      return Promise.reject(err.message);
    }

    return this.space.approve(to, spaceId);
  }

  public async setApprovalForAll(
    operator: string,
    approved: boolean
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly();
    } catch (err) {
      return Promise.reject(err.message);
    }

    return this.space.setApprovalForAll(operator, approved);
  }

  public async setApprovalForAllCustom(
    operator: string,
    approved: boolean,
    spaceAddress: string
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly();
    } catch (err) {
      return Promise.reject(err.message);
    }
    const path = `${process.cwd()}/.env.prod`;
    await require("dotenv").config({ path });
    const provider = new JsonRpcProvider(process.env.RPC_ENDPOINT);
    const wallet = new Wallet(`0x${process.env.PRIVATE_KEY}`, provider);
    const space_ = SpaceFactory.connect(spaceAddress, wallet);
    return space_.setApprovalForAll(operator, approved);
  }

  public async transferFrom(
    from: string,
    to: string,
    spaceId: BigNumberish
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly();
    } catch (err) {
      return Promise.reject(err.message);
    }

    return this.space.transferFrom(from, to, spaceId);
  }

  public async safeTransferFrom(
    from: string,
    to: string,
    spaceId: BigNumberish
  ): Promise<ContractTransaction> {
    try {
      this.ensureNotReadOnly();
    } catch (err) {
      return Promise.reject(err.message);
    }

    return this.space.safeTransferFrom(from, to, spaceId);
  }

  /****************
   * Miscellaneous
   * **************
   */

  public eip712Domain(): EIP712Domain {
    // Due to a bug in ganache-core, set the chainId to 1 if its a local blockchain
    // https://github.com/trufflesuite/ganache-core/issues/515
    const chainId = this.chainId == 50 ? 1 : this.chainId;

    return {
      name: "Motif",
      version: "1",
      chainId: chainId,
      verifyingContract: this.spaceAddress,
    };
  }

  public async isValidBid(spaceId: BigNumberish, bid: Bid): Promise<boolean> {
    const isAmountValid = await this.spaceExchange.isValidBid(
      spaceId,
      bid.amount
    );
    const decimal100 = Decimal.new(100);
    const currentBidShares = await this.fetchCurrentBidShares(spaceId);
    const isSellOnShareValid = bid.sellOnShare.value.lte(
      decimal100.value.sub(currentBidShares.creator.value)
    );

    return isAmountValid && isSellOnShareValid;
  }

  public isValidAsk(spaceId: BigNumberish, ask: Ask): Promise<boolean> {
    return this.spaceExchange.isValidBid(spaceId, ask.amount);
  }

  public async isVerifiedSpace(
    spaceId: BigNumberish,
    timeout: number = 10
  ): Promise<boolean> {
    try {
      const [tokenURI, metadataURI, contentHash, metadataHash, isPublic, lands] =
        await Promise.all([
          this.fetchContentURI(spaceId),
          this.fetchMetadataURI(spaceId),
          this.fetchContentHash(spaceId),
          this.fetchMetadataHash(spaceId),
          this.fetchIsPublic(spaceId),
          this.fetchLands(spaceId)
        ]);

      const spaceData = constructSpaceData(
        tokenURI,
        metadataURI,
        contentHash,
        metadataHash,
        isPublic,
        lands
      );
      return isSpaceDataVerified(spaceData, timeout);
    } catch (err) {
      return Promise.reject(err.message);
    }
  }

  /******************
   * Private Methods
   ******************
   */

  private ensureNotReadOnly() {
    if (this.readOnly) {
      throw new Error(
        "ensureNotReadOnly: readOnly Motif instance cannot call contract methods that require a signer."
      );
    }
  }
}
