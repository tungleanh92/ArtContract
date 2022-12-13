import { deployContract, Fixture } from "ethereum-waffle";
import web3 from "web3";
import {
  FixedToken,
  MintableToken,
  TomiToken,
  PoolFactory,
  LinearPool,
  AllocationPool,
  IERC20,
  IERC721,
  ERC721Token,
  NftMarketplace
} from "../../typechain";
import * as TomiTokenJSON from "../../artifacts/contracts/mocks/TomiToken.sol/TomiToken.json";
import * as FixTokenJSON from "../../artifacts/contracts/mocks/FixedToken.sol/FixedToken.json";
import * as MintableTokenJSON from "../../artifacts/contracts/mocks/MintableToken.sol/MintableToken.json";
import * as PoolFactoryJSON from "../../artifacts/contracts/PoolFactory.sol/PoolFactory.json";
import * as LinerPoolJSON from "../../artifacts/contracts/LinerPool.sol/LinearPool.json";
import * as AllocationPoolJSON from "../../artifacts/contracts/AllocationPool.sol/AllocationPool.json";
import * as ERC721TokenJSON from "../../artifacts/contracts/mocks/ERC721Token.sol/ERC721Token.json";
import * as NftMarketplaceJSON from "../../artifacts/contracts/NftMarketplace.sol/NftMarketplace.json";
import * as ERC20 from "@openzeppelin/contracts/build/contracts/ERC20.json";
import * as ERC721 from "@openzeppelin/contracts/build/contracts/ERC721.json";

interface IFixture {
  token0: IERC20;
  token1: IERC20;
  nft: IERC721;
  fixedToken: FixedToken;
  poolFactory: PoolFactory;
  mintableToken: MintableToken;
  distributeToken: TomiToken;
  distributeToken2: TomiToken;
  nonFungibleToken: ERC721Token;
  nftMarketplace: NftMarketplace;
}

const { toWei } = web3.utils;

export const fixture: Fixture<IFixture | any> = async ([wallet], _) => {
  // deploy tokens
  const token0 = (await deployContract(wallet as any, ERC20, [
    toWei("100000000000000"),
  ])) as unknown as IERC20;

  const token1 = (await deployContract(wallet as any, ERC20, [
    toWei("100000000000000"),
  ])) as unknown as IERC20;

  const fixedToken = (await deployContract(
    wallet as any,
    FixTokenJSON,
  )) as unknown as FixedToken;

  const mintableToken = (await deployContract(
    wallet as any,
    MintableTokenJSON,
  )) as unknown as MintableToken;

  const linerImpl = await deployContract(
    wallet as any,
    LinerPoolJSON,
  ) as unknown as LinearPool;

  const allocImpl = await deployContract(
    wallet as any,
    AllocationPoolJSON,
  ) as unknown as AllocationPool;

  const poolFactory = (await deployContract(
    wallet as any,
    PoolFactoryJSON,
    [linerImpl.address, allocImpl.address]
  )) as unknown as PoolFactory;

  const nftMarketplace = (await deployContract(
    wallet as any,
    NftMarketplaceJSON,
    ["0"]
  )) as unknown as PoolFactory;

  await fixedToken.initialize("Fixed Token", "FXT", toWei("1000000000000000"));
  await mintableToken.initialize("Mintable Token", "MAT", toWei("100000000000000"));

  const nonFungibleToken = (await deployContract(
    wallet as any,
    ERC721TokenJSON, [
      "Mock nft",
      "MOC"
  ])) as unknown as ERC721Token;

  const distributeToken = (await deployContract(wallet as any, TomiTokenJSON, [
    wallet.address,
    wallet.address,
    wallet.address,
  ])) as unknown as TomiToken;

  const distributeToken2 = (await deployContract(wallet as any, TomiTokenJSON, [
    wallet.address,
    wallet.address,
    wallet.address,
  ])) as unknown as TomiToken;

  return {
    token0,
    token1,
    distributeToken,
    distributeToken2,
    fixedToken,
    mintableToken,
    poolFactory,
    nonFungibleToken,
    nftMarketplace
  };
};