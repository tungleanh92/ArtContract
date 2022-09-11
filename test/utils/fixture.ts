import { deployContract, Fixture } from "ethereum-waffle";
import web3 from "web3";
import {
  FixedToken,
  MintableToken,
  TomiToken,
  IERC20,
} from "../../typechain";
import * as TomiTokenJSON from "../../artifacts/contracts/mocks/TomiToken.sol/TomiToken.json";
import * as FixTokenJSON from "../../artifacts/contracts/mocks/FixedToken.sol/FixedToken.json";
import * as MintableTokenJSON from "../../artifacts/contracts/mocks/MintableToken.sol/MintableToken.json";
import * as ERC20 from "@openzeppelin/contracts/build/contracts/ERC20.json";
interface IFixture {
  token0: IERC20;
  token1: IERC20;
  fixedToken: FixedToken;
  mintableToken: MintableToken;
  distributeToken: TomiToken;
}

const { toWei } = web3.utils;

export const fixture: Fixture<IFixture | any> = async ([wallet], _) => {
  // deploy tokens
  const token0 = (await deployContract(wallet as any, ERC20, [
    toWei("100000000"),
  ])) as unknown as IERC20;

  const token1 = (await deployContract(wallet as any, ERC20, [
    toWei("100000000"),
  ])) as unknown as IERC20;

  const fixedToken = (await deployContract(
    wallet as any,
    FixTokenJSON,
  )) as unknown as FixedToken;

  const mintableToken = (await deployContract(
    wallet as any,
    MintableTokenJSON,
  )) as unknown as MintableToken;

  await fixedToken.initialize("Fixed Token", "FXT", toWei("1000000"));
  await mintableToken.initialize("Mintable Token", "MAT", toWei("1000000"));

  const distributeToken = (await deployContract(wallet as any, TomiTokenJSON, [
    wallet.address,
    wallet.address,
    wallet.address,
  ])) as unknown as TomiToken;

  return {
    token0,
    token1,
    distributeToken,
    fixedToken,
    mintableToken,
  };
};