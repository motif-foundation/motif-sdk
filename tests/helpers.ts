import {
  BaseErc20Factory,
  ItemExchangeFactory,
  ItemFactory,
} from '@motif-foundation/asset/dist/typechain'
import { Wallet } from '@ethersproject/wallet'
import { BigNumber } from '@ethersproject/bignumber'
import { ContractTransaction } from '@ethersproject/contracts'
import { MaxUint256 } from '@ethersproject/constants'

export type MotifConfiguredAddresses = {
  item: string
  itemExchange: string
  currency: string
}

export async function setupMotif(
  wallet: Wallet,
  testWallets: Array<Wallet>
): Promise<MotifConfiguredAddresses> {
  const itemExchange = await (await new ItemExchangeFactory(wallet).deploy()).deployed()
  const itemExchangeAddress = itemExchange.address

  const item = await (await new ItemFactory(wallet).deploy(itemExchange.address, "Motif", "MOTIF", 1000000)).deployed()
  const itemAddress = item.address

  await itemExchange.configure(itemAddress)

  const currency = await (
    await new BaseErc20Factory(wallet).deploy('TEST', 'TEST', BigNumber.from(18))
  ).deployed()
  const currencyAddress = currency.address

  for (const toWallet of testWallets) {
    await mintCurrency(
      wallet,
      currencyAddress,
      toWallet.address,
      BigNumber.from('10000000000000000000000')
    )
    await approveCurrency(toWallet, currencyAddress, itemExchangeAddress)
  }

  return {
    item: itemAddress,
    itemExchange: itemExchangeAddress,
    currency: currencyAddress,
  }
}

export async function mintCurrency(
  wallet: Wallet,
  tokenAdress: string,
  to: string,
  amount: BigNumber
): Promise<ContractTransaction> {
  return BaseErc20Factory.connect(tokenAdress, wallet).mint(to, amount)
}

export async function approveCurrency(
  wallet: Wallet,
  tokenAddress: string,
  to: string
): Promise<ContractTransaction> {
  return BaseErc20Factory.connect(tokenAddress, wallet).approve(to, MaxUint256)
}

export async function deployCurrency(
  wallet: Wallet,
  name: string,
  symbol: string,
  decimals: number
): Promise<string> {
  const currency = await (
    await new BaseErc20Factory(wallet).deploy(name, symbol, BigNumber.from(decimals))
  ).deployed()
  return currency.address
}
