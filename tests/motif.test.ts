import {
  Ask,
  Bid,
  BidShares,
  constructAsk,
  constructBid,
  constructBidShares,
  constructItemData,
  Decimal,
  EIP712Signature,
  generateMetadata,
  ItemData,
  sha256FromBuffer,
  signMintWithSigMessage,
  signPermitMessage,
  Motif,
} from '../src'
import { JsonRpcProvider } from '@ethersproject/providers'
import { Wallet } from '@ethersproject/wallet'
import { addresses as MotifAddresses } from '../src/addresses'
import { deployCurrency, setupMotif, MotifConfiguredAddresses } from './helpers'
import { Blockchain, generatedWallets } from '@motif-foundation/asset/dist/utils'
import { BigNumber, Bytes } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'
import { AddressZero } from '@ethersproject/constants'
import { ItemFactory } from '@motif-foundation/asset/dist/typechain'
import MockAdapter from 'axios-mock-adapter'
import axios from 'axios'
import { promises as fs } from 'fs'

let provider = new JsonRpcProvider()
let blockchain = new Blockchain(provider)
jest.setTimeout(1000000)

describe('Motif', () => {
  describe('#constructor', () => {
    it('throws an error if a itemAddress is specified but not a itemExchangeAddress', () => {
      const wallet = Wallet.createRandom()
      expect(function () {
        new Motif(wallet, 4, '0x1D7022f5B17d2F8B695918FB48fa1089C9f85401')
      }).toThrow(
        'Motif Constructor: itemAddress and itemExchangeAddress must both be non-null or both be null'
      )
    })

    it('throws an error if the itemExchangeAddress is specified but not a itemAddress', () => {
      const wallet = Wallet.createRandom()
      expect(function () {
        new Motif(wallet, 4, '', '0x1D7022f5B17d2F8B695918FB48fa1089C9f85401')
      }).toThrow(
        'Motif Constructor: itemAddress and itemExchangeAddress must both be non-null or both be null'
      )
    })

    it('throws an error if one of the itemExchange or item addresses in not a valid ethereum address', () => {
      const wallet = Wallet.createRandom()
      expect(function () {
        new Motif(
          wallet,
          4,
          'not a valid ethereum address',
          '0x1D7022f5B17d2F8B695918FB48fa1089C9f85401'
        )
      }).toThrow('Invariant failed: not a valid ethereum address is not a valid address')

      expect(function () {
        new Motif(
          wallet,
          4,
          '0x1D7022f5B17d2F8B695918FB48fa1089C9f85401',
          'not a valid ethereum address'
        )
      }).toThrow('Invariant failed: not a valid ethereum address is not a valid address')
    })

    it('throws an error if the chainId does not map to a network with deployed instance of the Motif Protocol', () => {
      const wallet = Wallet.createRandom()

      expect(function () {
        new Motif(wallet, 50)
      }).toThrow(
        'Invariant failed: chainId 50 not officially supported by the Motif Protocol'
      )
    })

    it('throws an error if the chainId does not map to a network with deployed instance of the Motif Protocol', () => {
      const wallet = Wallet.createRandom()

      expect(function () {
        new Motif(
          wallet,
          50,
          '0x1D7022f5B17d2F8B695918FB48fa1089C9f85401',
          '0x1dC4c1cEFEF38a777b15aA20260a54E584b16C48'
        )
      }).not.toThrow(
        'Invariant failed: chainId 50 not officially supported by the Motif Protocol'
      )
    })

    it('sets the Motif instance to readOnly = false if a signer is specified', () => {
      const wallet = Wallet.createRandom()

      const motif = new Motif(
        wallet,
        50,
        '0x1D7022f5B17d2F8B695918FB48fa1089C9f85401',
        '0x1dC4c1cEFEF38a777b15aA20260a54E584b16C48'
      )
      expect(motif.readOnly).toBe(false)
    })

    it('sets the Motif instance to readOnly = true if a signer is specified', () => {
      const provider = new JsonRpcProvider()

      const motif = new Motif(
        provider,
        50,
        '0x1D7022f5B17d2F8B695918FB48fa1089C9f85401',
        '0x1dC4c1cEFEF38a777b15aA20260a54E584b16C48'
      )
      expect(motif.readOnly).toBe(true)
    })

    it('initializes a Motif instance with the checksummed item and itemExchange address for the specified chainId', () => {
      const wallet = Wallet.createRandom()
      const rinkebyItemAddress = MotifAddresses['rinkeby'].item
      const rinkebyItemExchangeAddress = MotifAddresses['rinkeby'].itemExchange
      const motif = new Motif(wallet, 4)
      expect(motif.itemExchangeAddress).toBe(rinkebyItemExchangeAddress)
      expect(motif.itemAddress).toBe(rinkebyItemAddress)
      expect(motif.itemExchange.address).toBe(rinkebyItemExchangeAddress)
      expect(motif.item.address).toBe(rinkebyItemAddress)
    })

    it('initializes a Motif instance with the specified item and itemExchange address if they are passed in', () => {
      const wallet = Wallet.createRandom()
      const itemAddress = '0x1D7022f5B17d2F8B695918FB48fa1089C9f85401'
      const itemExchangeAddress = '0x1dC4c1cEFEF38a777b15aA20260a54E584b16C48'

      const motif = new Motif(wallet, 50, itemAddress, itemExchangeAddress)
      expect(motif.readOnly).toBe(false)
      expect(motif.itemExchangeAddress).toBe(itemExchangeAddress)
      expect(motif.itemAddress).toBe(itemAddress)
      expect(motif.itemExchange.address).toBe(itemExchangeAddress)
      expect(motif.item.address).toBe(itemAddress)

      const motif1 = new Motif(wallet, 50, itemAddress, itemExchangeAddress)
      expect(motif1.readOnly).toBe(false)
      expect(motif1.itemExchangeAddress).toBe(itemExchangeAddress)
      expect(motif1.itemAddress).toBe(itemAddress)
      expect(motif1.itemExchange.address).toBe(itemExchangeAddress)
      expect(motif1.item.address).toBe(itemAddress)
    })
  })

  describe('contract functions', () => {
    let motifConfig: MotifConfiguredAddresses
    let provider = new JsonRpcProvider()
    let [mainWallet, otherWallet] = generatedWallets(provider)
    //let mainWallet = generatedWallets(provider)[0]

    beforeEach(async () => {
      await blockchain.resetAsync()
      motifConfig = await setupMotif(mainWallet, [otherWallet])
    })

    /******************
     * Write Functions
     ******************
     */

    describe('Write Functions', () => {
      let contentHash: string
      let contentHashBytes: Bytes
      let metadataHash: string
      let metadataHashBytes: Bytes
      let metadata: any
      let minifiedMetadata: string

      let defaultItemData: ItemData
      let defaultBidShares: BidShares
      let defaultAsk: Ask
      let defaultBid: Bid
      let eipSig: EIP712Signature

      beforeEach(() => {
        metadata = {
          version: 'motif-MotifItem20210905',
          name: 'blah blah',
          description: 'blah blah blah',
          mimeType: 'text/plain',
        }
        minifiedMetadata = generateMetadata(metadata.version, metadata)
        metadataHash = sha256FromBuffer(Buffer.from(minifiedMetadata))
        contentHash = sha256FromBuffer(Buffer.from('invert'))

        defaultItemData = constructItemData(
          'https://example.com',
          'https://metadata.com',
          contentHash,
          metadataHash
        )
        defaultBidShares = constructBidShares(10, 90, 0)
        defaultAsk = constructAsk(motifConfig.currency, Decimal.new(100).value)
        defaultBid = constructBid(
          motifConfig.currency,
          Decimal.new(99).value,
          otherWallet.address,
          otherWallet.address,
          10
        )

        eipSig = {
          deadline: 1000,
          v: 0,
          r: '0x00',
          s: '0x00',
        }
      })

      describe('#updateContentURI', () => {
        it('throws an error if called on a readOnly Motif instance', async () => {
          const provider = new JsonRpcProvider()

          const motif = new Motif(provider, 50, motifConfig.item, motifConfig.itemExchange)
          expect(motif.readOnly).toBe(true)

          await expect(motif.updateContentURI(0, 'new uri')).rejects.toBe(
            'ensureNotReadOnly: readOnly Motif instance cannot call contract methods that require a signer.'
          )
        })

        it('throws an error if the tokenURI does not begin with `https://`', async () => {
          const motif = new Motif(otherWallet, 50, motifConfig.item, motifConfig.itemExchange)
          await motif.mint(defaultItemData, defaultBidShares)
          await expect(motif.updateContentURI(0, 'http://example.com')).rejects.toBe(
            'Invariant failed: http://example.com must begin with `https://`'
          )
        })

        it('updates the content uri', async () => {
          const mainMotif = new Motif(mainWallet, 50, motifConfig.item, motifConfig.itemExchange)
          await mainMotif.mint(defaultItemData, defaultBidShares)

          const tokenURI = await mainMotif.fetchContentURI(0)
          expect(tokenURI).toEqual(defaultItemData.tokenURI)

          await mainMotif.updateContentURI(0, 'https://newURI.com')

          const newTokenURI = await mainMotif.fetchContentURI(0)
          expect(newTokenURI).toEqual('https://newURI.com')
        })
      })

      describe('#updateMetadataURI', () => {
        it('throws an error if called on a readOnly Motif instance', async () => {
          const provider = new JsonRpcProvider()

          const motif = new Motif(provider, 50, motifConfig.item, motifConfig.itemExchange)
          expect(motif.readOnly).toBe(true)

          await expect(motif.updateMetadataURI(0, 'new uri')).rejects.toBe(
            'ensureNotReadOnly: readOnly Motif instance cannot call contract methods that require a signer.'
          )
        })

        it('throws an error if the metadataURI does not begin with `https://`', async () => {
          const motif = new Motif(otherWallet, 50, motifConfig.item, motifConfig.itemExchange)
          await motif.mint(defaultItemData, defaultBidShares)
          await expect(motif.updateMetadataURI(0, 'http://example.com')).rejects.toBe(
            'Invariant failed: http://example.com must begin with `https://`'
          )
        })

        it('updates the metadata uri', async () => {
          const mainMotif = new Motif(mainWallet, 50, motifConfig.item, motifConfig.itemExchange)
          await mainMotif.mint(defaultItemData, defaultBidShares)

          const metadataURI = await mainMotif.fetchMetadataURI(0)
          expect(metadataURI).toEqual(defaultItemData.metadataURI)

          await mainMotif.updateMetadataURI(0, 'https://newMetadataURI.com')

          const newMetadataURI = await mainMotif.fetchMetadataURI(0)
          expect(newMetadataURI).toEqual('https://newMetadataURI.com')
        })
      })

      describe('#mint', () => {
        it('throws an error if called on a readOnly Motif instance', async () => {
          const provider = new JsonRpcProvider()

          const motif = new Motif(provider, 50, motifConfig.item, motifConfig.itemExchange)
          expect(motif.readOnly).toBe(true)

          await expect(motif.mint(defaultItemData, defaultBidShares)).rejects.toBe(
            'ensureNotReadOnly: readOnly Motif instance cannot call contract methods that require a signer.'
          )
        })

        it('throws an error if bid shares do not sum to 100', async () => {
          const motif = new Motif(otherWallet, 50, motifConfig.item, motifConfig.itemExchange)
          const invalidBidShares = {
            prevOwner: Decimal.new(10),
            owner: Decimal.new(70),
            creator: Decimal.new(10),
          }
          expect(motif.readOnly).toBe(false)

          await expect(motif.mint(defaultItemData, invalidBidShares)).rejects.toBe(
            'Invariant failed: The BidShares sum to 90000000000000000000, but they must sum to 100000000000000000000'
          )
        })

        it('throws an error if the tokenURI does not begin with `https://`', async () => {
          const motif = new Motif(otherWallet, 50, motifConfig.item, motifConfig.itemExchange)
          const invalidItemData = {
            tokenURI: 'http://example.com',
            metadataURI: 'https://metadata.com',
            contentHash: contentHashBytes,
            metadataHash: metadataHashBytes,
          }
          expect(motif.readOnly).toBe(false)

          await expect(motif.mint(invalidItemData, defaultBidShares)).rejects.toBe(
            'Invariant failed: http://example.com must begin with `https://`'
          )
        })

        it('throws an error if the metadataURI does not begin with `https://`', async () => {
          const motif = new Motif(otherWallet, 50, motifConfig.item, motifConfig.itemExchange)
          const invalidItemData = {
            tokenURI: 'https://example.com',
            metadataURI: 'http://metadata.com',
            contentHash: contentHashBytes,
            metadataHash: metadataHashBytes,
          }
          expect(motif.readOnly).toBe(false)

          await expect(motif.mint(invalidItemData, defaultBidShares)).rejects.toBe(
            'Invariant failed: http://metadata.com must begin with `https://`'
          )
        })

        it('pads the gas limit by 10%', async () => {
          const otherMotifConfig = await setupMotif(otherWallet, [mainWallet])
          const motifItem = ItemFactory.connect(motifConfig.item, mainWallet)
          const tx = await motifItem.mint(defaultItemData, defaultBidShares)
          const otherMotif = new Motif(
            otherWallet,
            50,
            otherMotifConfig.item,
            otherMotifConfig.itemExchange
          )
          const paddedTx = await otherMotif.mint(defaultItemData, defaultBidShares)

          expect(paddedTx.gasLimit).toEqual(tx.gasLimit.mul(110).div(100))
        })

        it('creates a new piece of item', async () => {
          const mainMotif = new Motif(mainWallet, 50, motifConfig.item, motifConfig.itemExchange)
          const totalSupply = await mainMotif.fetchTotalItem()
          expect(totalSupply.toNumber()).toEqual(0)

          await mainMotif.mint(defaultItemData, defaultBidShares)

          const owner = await mainMotif.fetchOwnerOf(0)
          const creator = await mainMotif.fetchCreator(0)
          const onChainContentHash = await mainMotif.fetchContentHash(0)
          const onChainMetadataHash = await mainMotif.fetchMetadataHash(0)

          const onChainBidShares = await mainMotif.fetchCurrentBidShares(0)
          const onChainContentURI = await mainMotif.fetchContentURI(0)
          const onChainMetadataURI = await mainMotif.fetchMetadataURI(0)

          expect(owner.toLowerCase()).toBe(mainWallet.address.toLowerCase())
          expect(creator.toLowerCase()).toBe(mainWallet.address.toLowerCase())
          expect(onChainContentHash).toBe(contentHash)
          expect(onChainContentURI).toBe(defaultItemData.tokenURI)
          expect(onChainMetadataURI).toBe(defaultItemData.metadataURI)
          expect(onChainMetadataHash).toBe(metadataHash)
          expect(onChainBidShares.creator.value).toEqual(defaultBidShares.creator.value)
          expect(onChainBidShares.owner.value).toEqual(defaultBidShares.owner.value)
          expect(onChainBidShares.prevOwner.value).toEqual(
            defaultBidShares.prevOwner.value
          )
        })
      })

      describe('#mintWithSig', () => {
        it('throws an error if called on a readOnly Motif instance', async () => {
          const provider = new JsonRpcProvider()

          const motif = new Motif(provider, 50, motifConfig.item, motifConfig.itemExchange)
          expect(motif.readOnly).toBe(true)

          await expect(
            motif.mintWithSig(
              otherWallet.address,
              defaultItemData,
              defaultBidShares,
              eipSig
            )
          ).rejects.toBe(
            'ensureNotReadOnly: readOnly Motif instance cannot call contract methods that require a signer.'
          )
        })

        it('throws an error if bid shares do not sum to 100', async () => {
          const motif = new Motif(otherWallet, 50, motifConfig.item, motifConfig.itemExchange)
          const invalidBidShares = {
            prevOwner: Decimal.new(10),
            owner: Decimal.new(70),
            creator: Decimal.new(10),
          }
          expect(motif.readOnly).toBe(false)

          await expect(
            motif.mintWithSig(
              otherWallet.address,
              defaultItemData,
              invalidBidShares,
              eipSig
            )
          ).rejects.toBe(
            'Invariant failed: The BidShares sum to 90000000000000000000, but they must sum to 100000000000000000000'
          )
        })

        it('throws an error if the tokenURI does not begin with `https://`', async () => {
          const motif = new Motif(otherWallet, 50, motifConfig.item, motifConfig.itemExchange)
          const invalidItemData = {
            tokenURI: 'http://example.com',
            metadataURI: 'https://metadata.com',
            contentHash: contentHashBytes,
            metadataHash: metadataHashBytes,
          }
          expect(motif.readOnly).toBe(false)

          await expect(
            motif.mintWithSig(
              otherWallet.address,
              invalidItemData,
              defaultBidShares,
              eipSig
            )
          ).rejects.toBe(
            'Invariant failed: http://example.com must begin with `https://`'
          )
        })

        it('throws an error if the metadataURI does not begin with `https://`', async () => {
          const motif = new Motif(otherWallet, 50, motifConfig.item, motifConfig.itemExchange)
          const invalidItemData = {
            tokenURI: 'https://example.com',
            metadataURI: 'http://metadata.com',
            contentHash: contentHashBytes,
            metadataHash: metadataHashBytes,
          }
          expect(motif.readOnly).toBe(false)

          await expect(motif.mint(invalidItemData, defaultBidShares)).rejects.toBe(
            'Invariant failed: http://metadata.com must begin with `https://`'
          )
        })

        it('creates a new piece of item', async () => {
          const otherMotif = new Motif(otherWallet, 50, motifConfig.item, motifConfig.itemExchange)
          const deadline = Math.floor(new Date().getTime() / 1000) + 60 * 60 * 24 // 24 hours
          const domain = otherMotif.eip712Domain()
          const nonce = await otherMotif.fetchMintWithSigNonce(mainWallet.address)
          const eipSig = await signMintWithSigMessage(
            mainWallet,
            contentHash,
            metadataHash,
            Decimal.new(10).value,
            nonce.toNumber(),
            deadline,
            domain
          )

          const totalSupply = await otherMotif.fetchTotalItem()
          expect(totalSupply.toNumber()).toEqual(0)

          await otherMotif.mintWithSig(
            mainWallet.address,
            defaultItemData,
            defaultBidShares,
            eipSig
          )

          const owner = await otherMotif.fetchOwnerOf(0)
          const creator = await otherMotif.fetchCreator(0)
          const onChainContentHash = await otherMotif.fetchContentHash(0)
          const onChainMetadataHash = await otherMotif.fetchMetadataHash(0)

          const onChainBidShares = await otherMotif.fetchCurrentBidShares(0)
          const onChainContentURI = await otherMotif.fetchContentURI(0)
          const onChainMetadataURI = await otherMotif.fetchMetadataURI(0)

          expect(owner.toLowerCase()).toBe(mainWallet.address.toLowerCase())
          expect(creator.toLowerCase()).toBe(mainWallet.address.toLowerCase())
          expect(onChainContentHash).toBe(contentHash)
          expect(onChainContentURI).toBe(defaultItemData.tokenURI)
          expect(onChainMetadataURI).toBe(defaultItemData.metadataURI)
          expect(onChainMetadataHash).toBe(metadataHash)
          expect(onChainBidShares.creator.value).toEqual(defaultBidShares.creator.value)
          expect(onChainBidShares.owner.value).toEqual(defaultBidShares.owner.value)
          expect(onChainBidShares.prevOwner.value).toEqual(
            defaultBidShares.prevOwner.value
          )
        })
      })

      describe('#setAsk', () => {
        it('throws an error if called on a readOnly Motif instance', async () => {
          const provider = new JsonRpcProvider()

          const motif = new Motif(provider, 50, motifConfig.item, motifConfig.itemExchange)
          expect(motif.readOnly).toBe(true)

          await expect(motif.setAsk(0, defaultAsk)).rejects.toBe(
            'ensureNotReadOnly: readOnly Motif instance cannot call contract methods that require a signer.'
          )
        })

        it('sets an ask for a piece of item', async () => {
          const mainMotif = new Motif(mainWallet, 50, motifConfig.item, motifConfig.itemExchange)
          await mainMotif.mint(defaultItemData, defaultBidShares)

          await mainMotif.setAsk(0, defaultAsk)

          const onChainAsk = await mainMotif.fetchCurrentAsk(0)
          expect(onChainAsk.currency.toLowerCase()).toEqual(
            defaultAsk.currency.toLowerCase()
          )
          expect(parseFloat(formatUnits(onChainAsk.amount, 'wei'))).toEqual(
            parseFloat(formatUnits(defaultAsk.amount, 'wei'))
          )
        })
      })

      describe('#setBid', () => {
        it('throws an error if called on a readOnly Motif instance', async () => {
          const provider = new JsonRpcProvider()

          const motif = new Motif(provider, 50, motifConfig.item, motifConfig.itemExchange)
          expect(motif.readOnly).toBe(true)

          await expect(motif.setBid(0, defaultBid)).rejects.toBe(
            'ensureNotReadOnly: readOnly Motif instance cannot call contract methods that require a signer.'
          )
        })

        it('creates a new bid on chain', async () => {
          const mainMotif = new Motif(mainWallet, 50, motifConfig.item, motifConfig.itemExchange)
          await mainMotif.mint(defaultItemData, defaultBidShares)

          const otherMotif = new Motif(otherWallet, 50, motifConfig.item, motifConfig.itemExchange)
          const nullOnChainBid = await otherMotif.fetchCurrentBidForBidder(
            0,
            otherWallet.address
          )

          expect(nullOnChainBid.currency).toEqual(AddressZero)

          await otherMotif.setBid(0, defaultBid)
          const onChainBid = await otherMotif.fetchCurrentBidForBidder(
            0,
            otherWallet.address
          )

          expect(parseFloat(formatUnits(onChainBid.amount, 'wei'))).toEqual(
            parseFloat(formatUnits(onChainBid.amount, 'wei'))
          )
          expect(onChainBid.currency.toLowerCase()).toEqual(
            defaultBid.currency.toLowerCase()
          )
          expect(onChainBid.bidder.toLowerCase()).toEqual(defaultBid.bidder.toLowerCase())
          expect(onChainBid.recipient.toLowerCase()).toEqual(
            defaultBid.recipient.toLowerCase()
          )
          expect(onChainBid.sellOnShare.value).toEqual(defaultBid.sellOnShare.value)
        })
      })

      describe('#removeAsk', () => {
        it('throws an error if called on a readOnly Motif instance', async () => {
          const provider = new JsonRpcProvider()

          const motif = new Motif(provider, 50, motifConfig.item, motifConfig.itemExchange)
          expect(motif.readOnly).toBe(true)

          await expect(motif.removeAsk(0)).rejects.toBe(
            'ensureNotReadOnly: readOnly Motif instance cannot call contract methods that require a signer.'
          )
        })

        it('removes an ask', async () => {
          const mainMotif = new Motif(mainWallet, 50, motifConfig.item, motifConfig.itemExchange)
          await mainMotif.mint(defaultItemData, defaultBidShares)
          await mainMotif.setAsk(0, defaultAsk)

          const onChainAsk = await mainMotif.fetchCurrentAsk(0)
          expect(onChainAsk.currency.toLowerCase()).toEqual(
            defaultAsk.currency.toLowerCase()
          )

          await mainMotif.removeAsk(0)

          const nullOnChainAsk = await mainMotif.fetchCurrentAsk(0)
          expect(nullOnChainAsk.currency).toEqual(AddressZero)
        })
      })

      describe('#removeBid', () => {
        it('throws an error if called on a readOnly Motif instance', async () => {
          const provider = new JsonRpcProvider()

          const motif = new Motif(provider, 50, motifConfig.item, motifConfig.itemExchange)
          expect(motif.readOnly).toBe(true)

          await expect(motif.removeBid(0)).rejects.toBe(
            'ensureNotReadOnly: readOnly Motif instance cannot call contract methods that require a signer.'
          )
        })

        it('removes a bid', async () => {
          const mainMotif = new Motif(mainWallet, 50, motifConfig.item, motifConfig.itemExchange)
          await mainMotif.mint(defaultItemData, defaultBidShares)
          const otherMotif = new Motif(otherWallet, 50, motifConfig.item, motifConfig.itemExchange)
          await otherMotif.setBid(0, defaultBid)
          const onChainBid = await otherMotif.fetchCurrentBidForBidder(
            0,
            otherWallet.address
          )

          expect(parseFloat(formatUnits(onChainBid.amount, 'wei'))).toEqual(
            parseFloat(formatUnits(onChainBid.amount, 'wei'))
          )
          expect(onChainBid.currency.toLowerCase()).toEqual(
            defaultBid.currency.toLowerCase()
          )
          expect(onChainBid.bidder.toLowerCase()).toEqual(defaultBid.bidder.toLowerCase())
          expect(onChainBid.recipient.toLowerCase()).toEqual(
            defaultBid.recipient.toLowerCase()
          )
          expect(onChainBid.sellOnShare.value).toEqual(defaultBid.sellOnShare.value)

          await otherMotif.removeBid(0)

          const nullOnChainBid = await otherMotif.fetchCurrentBidForBidder(
            0,
            otherWallet.address
          )

          expect(nullOnChainBid.currency).toEqual(AddressZero)
        })
      })

      describe('#acceptBid', () => {
        it('throws an error if called on a readOnly Motif instance', async () => {
          const provider = new JsonRpcProvider()

          const motif = new Motif(provider, 50, motifConfig.item, motifConfig.itemExchange)
          expect(motif.readOnly).toBe(true)

          await expect(motif.acceptBid(0, defaultBid)).rejects.toBe(
            'ensureNotReadOnly: readOnly Motif instance cannot call contract methods that require a signer.'
          )
        })

        it('accepts a bid', async () => {
          const mainMotif = new Motif(mainWallet, 50, motifConfig.item, motifConfig.itemExchange)
          await mainMotif.mint(defaultItemData, defaultBidShares)
          const otherMotif = new Motif(otherWallet, 50, motifConfig.item, motifConfig.itemExchange)
          await otherMotif.setBid(0, defaultBid)
          await mainMotif.acceptBid(0, defaultBid)
          const newOwner = await otherMotif.fetchOwnerOf(0)
          expect(newOwner.toLowerCase()).toEqual(otherWallet.address.toLowerCase())
        })
      })

      describe('#permit', () => {
        it('throws an error if called on a readOnly Motif instance', async () => {
          const provider = new JsonRpcProvider()

          const motif = new Motif(provider, 50, motifConfig.item, motifConfig.itemExchange)
          expect(motif.readOnly).toBe(true)

          await expect(motif.permit(otherWallet.address, 0, eipSig)).rejects.toBe(
            'ensureNotReadOnly: readOnly Motif instance cannot call contract methods that require a signer.'
          )
        })

        it('grants approval to a different address', async () => {
          const mainMotif = new Motif(mainWallet, 50, motifConfig.item, motifConfig.itemExchange)
          await mainMotif.mint(defaultItemData, defaultBidShares)
          const otherMotif = new Motif(otherWallet, 50, motifConfig.item, motifConfig.itemExchange)

          const deadline = Math.floor(new Date().getTime() / 1000) + 60 * 60 * 24 // 24 hours
          const domain = mainMotif.eip712Domain()
          const eipSig = await signPermitMessage(
            mainWallet,
            otherWallet.address,
            0,
            0,
            deadline,
            domain
          )

          await otherMotif.permit(otherWallet.address, 0, eipSig)
          const approved = await otherMotif.fetchApproved(0)
          expect(approved.toLowerCase()).toBe(otherWallet.address.toLowerCase())
        })
      })

      describe('#revokeApproval', () => {
        it('throws an error if called on a readOnly Motif instance', async () => {
          const provider = new JsonRpcProvider()

          const motif = new Motif(provider, 50, motifConfig.item, motifConfig.itemExchange)
          expect(motif.readOnly).toBe(true)

          await expect(motif.revokeApproval(0)).rejects.toBe(
            'ensureNotReadOnly: readOnly Motif instance cannot call contract methods that require a signer.'
          )
        })

        it("revokes an addresses approval of another address's item", async () => {
          const mainMotif = new Motif(mainWallet, 50, motifConfig.item, motifConfig.itemExchange)
          await mainMotif.mint(defaultItemData, defaultBidShares)
          await mainMotif.approve(otherWallet.address, 0)
          const approved = await mainMotif.fetchApproved(0)
          expect(approved.toLowerCase()).toBe(otherWallet.address.toLowerCase())

          const otherMotif = new Motif(otherWallet, 50, motifConfig.item, motifConfig.itemExchange)
          await otherMotif.revokeApproval(0)
          const nullApproved = await mainMotif.fetchApproved(0)
          expect(nullApproved).toBe(AddressZero)
        })
      })

      describe('#burn', () => {
        it('throws an error if called on a readOnly Motif instance', async () => {
          const provider = new JsonRpcProvider()

          const motif = new Motif(provider, 50, motifConfig.item, motifConfig.itemExchange)
          expect(motif.readOnly).toBe(true)

          await expect(motif.burn(0)).rejects.toBe(
            'ensureNotReadOnly: readOnly Motif instance cannot call contract methods that require a signer.'
          )
        })

        it('burns a piece of item', async () => {
          const mainMotif = new Motif(mainWallet, 50, motifConfig.item, motifConfig.itemExchange)
          await mainMotif.mint(defaultItemData, defaultBidShares)

          const owner = await mainMotif.fetchOwnerOf(0)
          expect(owner.toLowerCase()).toEqual(mainWallet.address.toLowerCase())

          const totalSupply = await mainMotif.fetchTotalItem()
          expect(totalSupply.toNumber()).toEqual(1)

          await mainMotif.burn(0)

          const zeroSupply = await mainMotif.fetchTotalItem()
          expect(zeroSupply.toNumber()).toEqual(0)
        })
      })

      describe('#approve', () => {
        it('throws an error if called on a readOnly Motif instance', async () => {
          const provider = new JsonRpcProvider()

          const motif = new Motif(provider, 50, motifConfig.item, motifConfig.itemExchange)
          expect(motif.readOnly).toBe(true)

          await expect(motif.approve(otherWallet.address, 0)).rejects.toBe(
            'ensureNotReadOnly: readOnly Motif instance cannot call contract methods that require a signer.'
          )
        })

        it('grants approval for another address for a piece of item', async () => {
          const mainMotif = new Motif(mainWallet, 50, motifConfig.item, motifConfig.itemExchange)
          await mainMotif.mint(defaultItemData, defaultBidShares)
          const nullApproved = await mainMotif.fetchApproved(0)
          expect(nullApproved).toBe(AddressZero)
          await mainMotif.approve(otherWallet.address, 0)
          const approved = await mainMotif.fetchApproved(0)
          expect(approved.toLowerCase()).toBe(otherWallet.address.toLowerCase())
        })
      })

      describe('#setApprovalForAll', () => {
        it('throws an error if called on a readOnly Motif instance', async () => {
          const provider = new JsonRpcProvider()

          const motif = new Motif(provider, 50, motifConfig.item, motifConfig.itemExchange)
          expect(motif.readOnly).toBe(true)

          await expect(motif.setApprovalForAll(otherWallet.address, true)).rejects.toBe(
            'ensureNotReadOnly: readOnly Motif instance cannot call contract methods that require a signer.'
          )
        })

        it('sets approval for another address for all item owned by owner', async () => {
          const mainMotif = new Motif(mainWallet, 50, motifConfig.item, motifConfig.itemExchange)
          await mainMotif.mint(defaultItemData, defaultBidShares)
          const notApproved = await mainMotif.fetchIsApprovedForAll(
            mainWallet.address,
            otherWallet.address
          )
          expect(notApproved).toBe(false)
          await mainMotif.setApprovalForAll(otherWallet.address, true)
          const approved = await mainMotif.fetchIsApprovedForAll(
            mainWallet.address,
            otherWallet.address
          )
          expect(approved).toBe(true)

          await mainMotif.setApprovalForAll(otherWallet.address, false)
          const revoked = await mainMotif.fetchIsApprovedForAll(
            mainWallet.address,
            otherWallet.address
          )
          expect(revoked).toBe(false)
        })
      })

      describe('#transferFrom', () => {
        it('throws an error if called on a readOnly Motif instance', async () => {
          const provider = new JsonRpcProvider()

          const motif = new Motif(provider, 50, motifConfig.item, motifConfig.itemExchange)
          expect(motif.readOnly).toBe(true)

          await expect(
            motif.transferFrom(mainWallet.address, otherWallet.address, 0)
          ).rejects.toBe(
            'ensureNotReadOnly: readOnly Motif instance cannot call contract methods that require a signer.'
          )
        })

        it('transfers item to another address', async () => {
          const mainMotif = new Motif(mainWallet, 50, motifConfig.item, motifConfig.itemExchange)
          await mainMotif.mint(defaultItemData, defaultBidShares)
          const owner = await mainMotif.fetchOwnerOf(0)
          expect(owner.toLowerCase()).toEqual(mainWallet.address.toLowerCase())

          await mainMotif.transferFrom(mainWallet.address, otherWallet.address, 0)
          const newOwner = await mainMotif.fetchOwnerOf(0)
          expect(newOwner.toLowerCase()).toEqual(otherWallet.address.toLowerCase())
        })
      })

      describe('#safeTransferFrom', () => {
        it('throws an error if called on a readOnly Motif instance', async () => {
          const provider = new JsonRpcProvider()

          const motif = new Motif(provider, 50, motifConfig.item, motifConfig.itemExchange)
          expect(motif.readOnly).toBe(true)

          await expect(
            motif.safeTransferFrom(mainWallet.address, otherWallet.address, 0)
          ).rejects.toBe(
            'ensureNotReadOnly: readOnly Motif instance cannot call contract methods that require a signer.'
          )
        })
      })

      describe('#eip712Domain', () => {
        it('returns chainId 1 on a local blockchain', () => {
          const provider = new JsonRpcProvider()

          const motif = new Motif(provider, 50, motifConfig.item, motifConfig.itemExchange)
          const domain = motif.eip712Domain()
          expect(domain.chainId).toEqual(1)
          expect(domain.verifyingContract.toLowerCase()).toEqual(
            motif.itemAddress.toLowerCase()
          )
        })

        it('returns the motif chainId', () => {
          const provider = new JsonRpcProvider()
          const motif = new Motif(provider, 4, motifConfig.item, motifConfig.itemExchange)
          const domain = motif.eip712Domain()

          expect(domain.chainId).toEqual(4)
          expect(domain.verifyingContract.toLowerCase()).toEqual(
            motif.itemAddress.toLowerCase()
          )
        })
      })

      describe('#isValidBid', () => {
        it('returns true if the bid amount can be evenly split by current bidShares', async () => {
          const motif = new Motif(mainWallet, 50, motifConfig.item, motifConfig.itemExchange)
          await motif.mint(defaultItemData, defaultBidShares)
          const isValid = await motif.isValidBid(0, defaultBid)
          expect(isValid).toEqual(true)
        })

        it('returns false if the bid amount cannot be evenly split by current bidShares', async () => {
          const cur = await deployCurrency(mainWallet, 'CUR', 'CUR', 2)
          const motif = new Motif(mainWallet, 50, motifConfig.item, motifConfig.itemExchange)
          const bid = constructBid(
            cur,
            BigNumber.from(200),
            otherWallet.address,
            otherWallet.address,
            10
          )

          const preciseBidShares = {
            creator: Decimal.new(33.3333),
            owner: Decimal.new(33.3333),
            prevOwner: Decimal.new(33.3334),
          }

          await motif.mint(defaultItemData, preciseBidShares)
          const isValid = await motif.isValidBid(0, bid)
          expect(isValid).toEqual(false)
        })

        it('returns false if the sell on share is invalid', async () => {
          const motif = new Motif(mainWallet, 50, motifConfig.item, motifConfig.itemExchange)
          await motif.mint(defaultItemData, defaultBidShares)

          const bid = constructBid(
            motifConfig.currency,
            BigNumber.from(200),
            otherWallet.address,
            otherWallet.address,
            90.1
          )

          const isValid = await motif.isValidBid(0, bid)
          expect(isValid).toEqual(false)
        })
      })

      describe('#isValidAsk', () => {
        it('returns true if the ask amount can be evenly split by current bidShares', async () => {
          const motif = new Motif(mainWallet, 50, motifConfig.item, motifConfig.itemExchange)
          await motif.mint(defaultItemData, defaultBidShares)
          const isValid = await motif.isValidAsk(0, defaultAsk)
          expect(isValid).toEqual(true)
        })

        it('returns false if the ask amount cannot be evenly split by current bidShares', async () => {
          const cur = await deployCurrency(mainWallet, 'CUR', 'CUR', 2)
          const motif = new Motif(mainWallet, 50, motifConfig.item, motifConfig.itemExchange)
          const ask = constructAsk(cur, BigNumber.from(200))

          const preciseBidShares = {
            creator: Decimal.new(33.3333),
            owner: Decimal.new(33.3333),
            prevOwner: Decimal.new(33.3334),
          }

          await motif.mint(defaultItemData, preciseBidShares)
          const isValid = await motif.isValidAsk(0, ask)
          expect(isValid).toEqual(false)
        })
      })

      describe('#isVerifiedItem', () => {
        it('returns true if the item is verified', async () => {
          const motif = new Motif(mainWallet, 50, motifConfig.item, motifConfig.itemExchange)
          const mock = new MockAdapter(axios)
          const helloWorldBuf = await fs.readFile('./fixtures/HelloWorld.txt')
          const helloWorldURI =
            'https://ipfs/io/ipfs/Qmf1rtki74jvYmGeqaaV51hzeiaa6DyWc98fzDiuPatzyy'
          const kanyeBuf = await fs.readFile('./fixtures/kanye.jpg')
          const kanyeURI =
            'https://ipfs.io/ipfs/QmRhK7o7gpjkkpubu9EvqDGJEgY1nQxSkP7XsMcaX7pZwV'

          mock.onGet(kanyeURI).reply(200, kanyeBuf)
          mock.onGet(helloWorldURI).reply(200, helloWorldBuf)

          const itemData = constructItemData(
            kanyeURI,
            helloWorldURI,
            sha256FromBuffer(kanyeBuf),
            sha256FromBuffer(helloWorldBuf)
          )
          await motif.mint(itemData, defaultBidShares)

          const verified = await motif.isVerifiedItem(0)
          expect(verified).toEqual(true)
        })

        it('returns false if the item is not verified', async () => {
          const motif = new Motif(mainWallet, 50, motifConfig.item, motifConfig.itemExchange)
          const mock = new MockAdapter(axios)
          const helloWorldBuf = await fs.readFile('./fixtures/HelloWorld.txt')
          const helloWorldURI =
            'https://ipfs/io/ipfs/Qmf1rtki74jvYmGeqaaV51hzeiaa6DyWc98fzDiuPatzyy'
          const kanyeBuf = await fs.readFile('./fixtures/kanye.jpg')
          const kanyeURI =
            'https://ipfs.io/ipfs/QmRhK7o7gpjkkpubu9EvqDGJEgY1nQxSkP7XsMcaX7pZwV'

          mock.onGet(kanyeURI).reply(200, kanyeBuf)
          mock.onGet(helloWorldURI).reply(200, kanyeBuf) // this will cause verification to fail!

          const itemData = constructItemData(
            kanyeURI,
            helloWorldURI,
            sha256FromBuffer(kanyeBuf),
            sha256FromBuffer(helloWorldBuf)
          )
          await motif.mint(itemData, defaultBidShares)

          const verified = await motif.isVerifiedItem(0)
          expect(verified).toEqual(false)
        })

        it('rejects the promise if the item does not exist', async () => {
          const motif = new Motif(mainWallet, 50, motifConfig.item, motifConfig.itemExchange)
          await expect(motif.isVerifiedItem(0)).rejects.toContain(
            'token with that id does not exist'
          )
        })
      })
    })
  })
})
