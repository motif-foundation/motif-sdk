import { BigNumber, BigNumberish } from '@ethersproject/bignumber'
import { BytesLike } from '@ethersproject/bytes'

/**
 * Internal type to represent a Decimal Value
 */
export type DecimalValue = { value: BigNumber }

/**
 * Motif Item Protocol BidShares
 */
export type BidShares = {
  owner: DecimalValue
  prevOwner: DecimalValue
  creator: DecimalValue
}

/**
 * Motif Item Protocol Ask
 */
export type Ask = {
  currency: string
  amount: BigNumberish
}

/**
 * Motif Item Protocol Bid
 */
export type Bid = {
  currency: string
  amount: BigNumberish
  bidder: string
  recipient: string
  sellOnShare: DecimalValue
}

/**
 * Motif Item Protocol ItemData
 */
export type ItemData = {
  tokenURI: string
  metadataURI: string
  contentHash: BytesLike
  metadataHash: BytesLike
}

export type AvatarData = {
  tokenURI: string
  metadataURI: string
  contentHash: BytesLike
  metadataHash: BytesLike
  isDefault: boolean
}

export type SpaceData = {
  tokenURI: string
  metadataURI: string
  contentHash: BytesLike
  metadataHash: BytesLike
  isPublic: boolean
  lands: Array<BigNumberish>
  pin: string
}

export type LandData = {
  tokenURI: string
  metadataURI: string
  contentHash: BytesLike
  metadataHash: BytesLike
  xCoordinate: number
  yCoordinate: number
}

/**
 * EIP712 Signature
 */
export type EIP712Signature = {
  deadline: BigNumberish
  v: number
  r: BytesLike
  s: BytesLike
}

/**
 * EIP712 Domain
 */
export type EIP712Domain = {
  name: string
  version: string
  chainId: number
  verifyingContract: string
}
