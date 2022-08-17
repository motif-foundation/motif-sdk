import mainnetAddresses from '@motif-foundation/asset/dist/addresses/1.json'
import ropstenAddresses from '@motif-foundation/asset/dist/addresses/3.json'
import motifAddresses from '@motif-foundation/asset/dist/addresses/7018.json'
import motifTestnetAddresses from '@motif-foundation/asset/dist/addresses/7019.json'
import polygonAddresses from '@motif-foundation/asset/dist/addresses/137.json'
import binanceAddresses from '@motif-foundation/asset/dist/addresses/56.json'

interface AddressBook {
  [key: string]: {
    [key: string]: string
  }
}

export const addresses: AddressBook = {
  polygon: polygonAddresses,
  binance: binanceAddresses,
  mainnet: mainnetAddresses,
  ropsten: ropstenAddresses,
  motif: motifAddresses,
  motifTestnet: motifTestnetAddresses,
}
