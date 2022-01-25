import motifAddresses from '@motif-foundation/asset/dist/addresses/7018.json'

interface AddressBook {
  [key: string]: {
    [key: string]: string
  }
}

/**
 * Mapping from Network to Officially Deployed Instances of the Motif Item Protocol
 */
export const addresses: AddressBook = {
  motif: motifAddresses
}
