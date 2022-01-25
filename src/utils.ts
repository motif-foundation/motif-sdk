import { getAddress } from "@ethersproject/address";
import warning from "tiny-warning";
import invariant from "tiny-invariant";
import sjcl from "sjcl";
import {
  Ask,
  Bid,
  BidShares,
  DecimalValue,
  EIP712Domain,
  EIP712Signature,
  ItemData,
  LandData,
  AvatarData,
  SpaceData 
} from "./types";
import { Decimal } from "./Decimal";
import {
  arrayify,
  BytesLike,
  hexDataLength,
  hexlify,
  isHexString,
} from "@ethersproject/bytes";
//import { recoverTypedSignature, signTypedData_v4 } from "eth-sig-util";
//import { fromRpcSig, toRpcSig } from "ethereumjs-util";
import { BaseErc20Factory } from "@motif-foundation/asset/dist/typechain";
import axios from "axios";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { ethers, Wallet } from "ethers";
import { ContractTransaction } from "@ethersproject/contracts";

/********************
 * Type Constructors
 ********************
 */

export function constructItemData(
  tokenURI: string,
  metadataURI: string,
  contentHash: BytesLike,
  metadataHash: BytesLike
): ItemData {
  // validate the hash to ensure it fits in bytes32
  validateBytes32(contentHash);
  validateBytes32(metadataHash);
  validateURI(tokenURI);
  validateURI(metadataURI);

  return {
    tokenURI: tokenURI,
    metadataURI: metadataURI,
    contentHash: contentHash,
    metadataHash: metadataHash,
  };
}

export function constructSpaceData(
  tokenURI: string,
  metadataURI: string,
  contentHash: BytesLike,
  metadataHash: BytesLike,
  isPublic: boolean,
  lands: Array<BigNumberish>
): SpaceData {
  // validate the hash to ensure it fits in bytes32
  validateBytes32(contentHash);
  validateBytes32(metadataHash);
  validateURI(tokenURI);
  validateURI(metadataURI);

  return {
    tokenURI: tokenURI,
    metadataURI: metadataURI,
    contentHash: contentHash,
    metadataHash: metadataHash,
    isPublic: isPublic,
    lands: lands
  };
}

export function constructAvatarData(
  tokenURI: string,
  metadataURI: string,
  contentHash: BytesLike,
  metadataHash: BytesLike 
): AvatarData {
  // validate the hash to ensure it fits in bytes32
  validateBytes32(contentHash);
  validateBytes32(metadataHash);
  validateURI(tokenURI);
  validateURI(metadataURI);

  return {
    tokenURI: tokenURI,
    metadataURI: metadataURI,
    contentHash: contentHash,
    metadataHash: metadataHash 
  };
}

export function constructLandData(
  tokenURI: string,
  metadataURI: string,
  contentHash: BytesLike,
  metadataHash: BytesLike,
  xCoordinate: number,
  yCoordinate: number

): LandData {
  // validate the hash to ensure it fits in bytes32
  validateBytes32(contentHash);
  validateBytes32(metadataHash);
  validateURI(tokenURI);
  validateURI(metadataURI);

  return {
    tokenURI: tokenURI,
    metadataURI: metadataURI,
    contentHash: contentHash,
    metadataHash: metadataHash,
    xCoordinate: xCoordinate,
    yCoordinate: yCoordinate
  };
}

export function constructBidShares(
  creator: number,
  owner: number,
  prevOwner: number
): BidShares {
  const decimalCreator = Decimal.new(parseFloat(creator.toFixed(4)));
  const decimalOwner = Decimal.new(parseFloat(owner.toFixed(4)));
  const decimalPrevOwner = Decimal.new(parseFloat(prevOwner.toFixed(4)));

  validateBidShares(decimalCreator, decimalOwner, decimalPrevOwner);

  return {
    creator: decimalCreator,
    owner: decimalOwner,
    prevOwner: decimalPrevOwner,
  };
}

export function validateBidShares(
  creator: DecimalValue,
  owner: DecimalValue,
  prevOwner: DecimalValue
): void {
  const decimal100 = Decimal.new(100);

  const sum = creator.value.add(owner.value).add(prevOwner.value);

  if (sum.toString() != decimal100.value.toString()) {
    invariant(
      false,
      `The BidShares sum to ${sum.toString()}, but they must sum to ${decimal100.value.toString()}`
    );
  }
}

export function constructAsk(currency: string, amount: BigNumberish): Ask {
  const parsedCurrency = validateAndParseAddress(currency);
  return {
    currency: parsedCurrency,
    amount: amount,
  };
}

export function constructBid(
  currency: string,
  amount: BigNumberish,
  bidder: string,
  recipient: string,
  sellOnShare: number
): Bid {
  let parsedCurrency: string;
  let parsedBidder: string;
  let parsedRecipient: string;

  try {
    parsedCurrency = validateAndParseAddress(currency);
  } catch (err) {
    throw new Error(`Currency address is invalid: ${err.message}`);
  }

  try {
    parsedBidder = validateAndParseAddress(bidder);
  } catch (err) {
    throw new Error(`Bidder address is invalid: ${err.message}`);
  }

  try {
    parsedRecipient = validateAndParseAddress(recipient);
  } catch (err) {
    throw new Error(`Recipient address is invalid: ${err.message}`);
  }

  const decimalSellOnShare = Decimal.new(parseFloat(sellOnShare.toFixed(4)));

  return {
    currency: parsedCurrency,
    amount: amount,
    bidder: parsedBidder,
    recipient: parsedRecipient,
    sellOnShare: decimalSellOnShare,
  };
}

export function validateBytes32(value: BytesLike) {
  if (typeof value == "string") {
    if (isHexString(value) && hexDataLength(value) == 32) {
      return;
    }

    invariant(false, `${value} is not a 0x prefixed 32 bytes hex string`);
  } else {
    if (hexDataLength(hexlify(value)) == 32) {
      return;
    }

    invariant(false, `value is not a length 32 byte array`);
  }
}

export function validateURI(uri: string) {
  if (!uri.match(/^https:\/\/(.*)/)) {
    invariant(false, `${uri} must begin with \`https://\``);
  }
}

export function validateAndParseAddress(address: string): string {
  try {
    const checksummedAddress = getAddress(address);
    warning(address === checksummedAddress, `${address} is not checksummed.`);
    return checksummedAddress;
  } catch (error) {
    invariant(false, `${address} is not a valid address.`);
  }
}

export function chainIdToNetworkName(chainId: number): string {
  switch (chainId) {
    case 7018: {
      return "motif";
    }
    case 3: {
      return "ropsten";
    }
    case 1: {
      return "mainnet";
    }
  }

  invariant(false, `chainId ${chainId} not officially supported by the Motif`);
}

/********************
 * Hashing Utilities
 ********************
 */

export function sha256FromBuffer(buffer: Buffer): string {
  const bitArray = sjcl.codec.hex.toBits(buffer.toString("hex"));
  const hashArray = sjcl.hash.sha256.hash(bitArray);
  return "0x".concat(sjcl.codec.hex.fromBits(hashArray));
}

export function sha256FromHexString(data: string): string {
  if (!isHexString(data)) {
    throw new Error(`${data} is not valid 0x prefixed hex`);
  }

  const bitArray = sjcl.codec.hex.toBits(data);
  const hashArray = sjcl.hash.sha256.hash(bitArray);
  return "0x".concat(sjcl.codec.hex.fromBits(hashArray));
}

export function stripHexPrefix(hex: string) {
  return hex.slice(0, 2) == "0x" ? hex.slice(2) : hex;
}

/*********************
 * EIP-712 Utilities
 *********************
 */
/*
export async function signPermitMessage(
  owner: Wallet,
  toAddress: string,
  itemId: number,
  nonce: number,
  deadline: number,
  domain: EIP712Domain
): Promise<EIP712Signature> {
  const tokenId = itemId;

  return new Promise<EIP712Signature>(async (res, reject) => {
    try {
      const sig = signTypedData_v4(
        Buffer.from(owner.privateKey.slice(2), "hex"),
        {
          data: {
            types: {
              EIP712Domain: [
                { name: "name", type: "string" },
                { name: "version", type: "string" },
                { name: "chainId", type: "uint256" },
                { name: "verifyingContract", type: "address" },
              ],
              Permit: [
                { name: "spender", type: "address" },
                { name: "tokenId", type: "uint256" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
              ],
            },
            primaryType: "Permit",
            domain: domain,
            message: {
              spender: toAddress,
              tokenId,
              nonce,
              deadline,
            },
          },
        }
      );

      const response = fromRpcSig(sig);

      res({
        r: response.r,
        s: response.s,
        v: response.v,
        deadline: deadline.toString(),
      });
    } catch (e) {
      console.error(e);
      reject(e);
    }
  });
}

export async function recoverSignatureFromPermit(
  toAddress: string,
  itemId: number,
  nonce: number,
  deadline: number,
  domain: EIP712Domain,
  eipSig: EIP712Signature
) {
  const r = arrayify(eipSig.r);
  const s = arrayify(eipSig.s);

  const tokenId = itemId;

  const recovered = recoverTypedSignature({
    data: {
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        Permit: [
          { name: "spender", type: "address" },
          { name: "tokenId", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      },
      primaryType: "Permit",
      domain: domain,
      message: {
        spender: toAddress,
        tokenId,
        nonce,
        deadline,
      },
    },
    sig: toRpcSig(eipSig.v, Buffer.from(r), Buffer.from(s)),
  });
  return recovered;
}

export async function recoverSignatureFromMintWithSig(
  contentHash: BytesLike,
  metadataHash: BytesLike,
  creatorShareBN: BigNumber,
  nonce: number,
  deadline: number,
  domain: EIP712Domain,
  eipSig: EIP712Signature
) {
  const r = arrayify(eipSig.r);
  const s = arrayify(eipSig.s);
  const creatorShare = creatorShareBN.toString();

  const recovered = recoverTypedSignature({
    data: {
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        MintForCreatorWithSig: [
          { name: "contentHash", type: "bytes32" },
          { name: "metadataHash", type: "bytes32" },
          { name: "creatorShare", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      },
      primaryType: "MintForCreatorWithSig",
      domain: domain,
      message: {
        contentHash,
        metadataHash,
        creatorShare,
        nonce,
        deadline,
      },
    },
    sig: toRpcSig(eipSig.v, Buffer.from(r), Buffer.from(s)),
  });
  return recovered;
}

export async function signMintWithSigMessage(
  owner: Wallet,
  contentHash: BytesLike,
  metadataHash: BytesLike,
  creatorShareBN: BigNumber,
  nonce: number,
  deadline: number,
  domain: EIP712Domain
): Promise<EIP712Signature> {
  try {
    validateBytes32(contentHash);
    validateBytes32(metadataHash);
  } catch (err) {
    return Promise.reject(err.message);
  }

  const creatorShare = creatorShareBN.toString();

  return new Promise<EIP712Signature>(async (res, reject) => {
    try {
      const sig = signTypedData_v4(
        Buffer.from(owner.privateKey.slice(2), "hex"),
        {
          data: {
            types: {
              EIP712Domain: [
                { name: "name", type: "string" },
                { name: "version", type: "string" },
                { name: "chainId", type: "uint256" },
                { name: "verifyingContract", type: "address" },
              ],
              MintForCreatorWithSig: [
                { name: "contentHash", type: "bytes32" },
                { name: "metadataHash", type: "bytes32" },
                { name: "creatorShare", type: "uint256" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
              ],
            },
            primaryType: "MintForCreatorWithSig",
            domain: domain,
            message: {
              contentHash,
              metadataHash,
              creatorShare,
              nonce,
              deadline,
            },
          },
        }
      );
      const response = fromRpcSig(sig);
      res({
        r: response.r,
        s: response.s,
        v: response.v,
        deadline: deadline.toString(),
      });
    } catch (e) {
      console.error(e);
      reject(e);
    }
  });
}*/

export async function approveERC20(
  wallet: Wallet,
  erc20Address: string,
  spender: string,
  amount: BigNumberish
): Promise<ContractTransaction> {
  const erc20 = BaseErc20Factory.connect(erc20Address, wallet);
  return erc20.approve(spender, amount);
}

export async function isURIHashVerified(
  uri: string,
  expectedHash: BytesLike,
  timeout: number = 10
): Promise<boolean> {
  try {
    validateURI(uri);

    const resp = await axios.get(uri, {
      timeout: timeout,
      responseType: "arraybuffer",
    });
    const uriHash = sha256FromBuffer(resp.data);
    const normalizedExpectedHash = hexlify(expectedHash);

    return uriHash == normalizedExpectedHash;
  } catch (err) {
    return Promise.reject(err.message);
  }
}

export async function isItemDataVerified(
  itemData: ItemData,
  timeout: number = 10
): Promise<boolean> {
  const isTokenURIVerified = await isURIHashVerified(
    itemData.tokenURI,
    itemData.contentHash,
    timeout
  );

  const isMetadataURIVerified = await isURIHashVerified(
    itemData.metadataURI,
    itemData.metadataHash,
    timeout
  );

  return isTokenURIVerified && isMetadataURIVerified;
}

export async function isAvatarDataVerified(
  avatarData: AvatarData,
  timeout: number = 10
): Promise<boolean> {
  const isTokenURIVerified = await isURIHashVerified(
    avatarData.tokenURI,
    avatarData.contentHash,
    timeout
  );

  const isMetadataURIVerified = await isURIHashVerified(
    avatarData.metadataURI,
    avatarData.metadataHash,
    timeout
  );

  return isTokenURIVerified && isMetadataURIVerified;
}

export async function isSpaceDataVerified(
  spaceData: SpaceData,
  timeout: number = 10
): Promise<boolean> {
  const isTokenURIVerified = await isURIHashVerified(
    spaceData.tokenURI,
    spaceData.contentHash,
    timeout
  );

  const isMetadataURIVerified = await isURIHashVerified(
    spaceData.metadataURI,
    spaceData.metadataHash,
    timeout
  );

  return isTokenURIVerified && isMetadataURIVerified;
}

export async function isLandDataVerified(
  landData: LandData,
  timeout: number = 10
): Promise<boolean> {
  const isTokenURIVerified = await isURIHashVerified(
    landData.tokenURI,
    landData.contentHash,
    timeout
  );

  const isMetadataURIVerified = await isURIHashVerified(
    landData.metadataURI,
    landData.metadataHash,
    timeout
  );

  return isTokenURIVerified && isMetadataURIVerified;
}

export async function wrapETH(
  wallet: Wallet,
  wethAddress: string,
  amount: BigNumber
): Promise<ContractTransaction> {
  const abi = ["function deposit() public payable"];
  const weth = new ethers.Contract(wethAddress, abi, wallet);
  return weth.deposit({ value: amount });
}

export async function unwrapWETH(
  wallet: Wallet,
  wethAddress: string,
  amount: BigNumber
): Promise<ContractTransaction> {
  const abi = ["function withdraw(uint256) public"];
  const weth = new ethers.Contract(wethAddress, abi, wallet);
  return weth.withdraw(amount);
}
