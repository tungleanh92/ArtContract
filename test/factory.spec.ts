import web3 from "web3";
import { Wallet } from "ethers";
import { ethers, waffle } from "hardhat";
import { fixture } from "./utils/fixture";
import { expect } from "chai";
import { MintableToken } from "../typechain/MintableToken";
import { FixedToken } from "../typechain/FixedToken";
import { PoolFactory } from "../typechain";
import * as time from "./utils/time";
import { MOD_ROLE } from "./utils/constant";
const { toWei } = web3.utils;

describe("Pool factory", () => {
  let signer: string;
  let wallets: Wallet[];
  let account1: Wallet;
  let account2: Wallet;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let fixedToken: FixedToken;
  let mintableToken: MintableToken;
  let poolFactory: PoolFactory;

  before("create fixture loader", async () => {
    signer = new web3().eth.accounts.privateKeyToAccount(
      process.env.DEPLOYER_PRIVATE_KEY || "",
    ).address;
    wallets = await (ethers as any).getSigners();
    account1 = wallets[1];
    account2 = wallets[2];
  });

  beforeEach(async () => {
    loadFixture = waffle.createFixtureLoader(wallets as any);
    ({ fixedToken, mintableToken, poolFactory } = await loadFixture(fixture));

    await mintableToken.transfer(account1.address, toWei("1000"));
    await mintableToken.transfer(account2.address, toWei("1000"));
  });

  it("add new MOD_ROLE", async () => {
    const [, newOwner, notOwner] = await ethers.getSigners();
    const tryChange = poolFactory
      .connect(notOwner)
      .grantRole(MOD_ROLE, await notOwner.getAddress());
    await expect(tryChange).to.be.reverted;

    await poolFactory.grantRole(MOD_ROLE, await newOwner.getAddress());
    expect(
      await poolFactory.hasRole(MOD_ROLE, await newOwner.getAddress()),
    ).to.be.equal(true);
  });

  it("create liner pool", async () => {
    const [, user] = await ethers.getSigners();
    await expect(
      poolFactory
        .connect(user)
        .createLinerPool(
          [mintableToken.address],
          [fixedToken.address],
          toWei("10"),
          0,
          (await time.latest()).toNumber(),
          0,
          0,
          "0",
          signer,
        ),
    ).to.be.revertedWith("PoolFactory: require ADMIN role");

    await expect(
      poolFactory.createLinerPool(
        [mintableToken.address],
        [fixedToken.address],
        toWei("10"),
        0,
        (await time.latest()).toNumber(),
        0,
        toWei("10000000"),
        0,
        signer,
      ),
    ).to.not.reverted;

    await expect(
      poolFactory.createLinerPool(
        [mintableToken.address],
        [fixedToken.address],
        toWei("10"),
        0,
        (await time.latest()).toNumber(),
        0,
        toWei("10000000"),
        0,
        signer,
      ),
    ).to.not.reverted;

    await expect(
      poolFactory.createLinerPool(
        [mintableToken.address],
        [ethers.constants.AddressZero],
        toWei("10"),
        0,
        (await time.latest()).toNumber(),
        0,
        toWei("10000000"),
        0,
        signer,
      ),
    ).to.be.revertedWith("LinearStakingPool: invalid token address");


    await expect(
      poolFactory.createLinerPool(
        [mintableToken.address],
        [fixedToken.address],
        toWei("10"),
        0,
        (await time.latest()).toNumber(),
        toWei("10"),
        toWei("1"),
        0,
        signer,
      ),
    ).to.be.revertedWith("LinearStakingPool: Invalid investment value");
  });

  it("creat allocation pool", async () => {
    const [, user] = await ethers.getSigners();

    await expect(
      poolFactory.createAllocationPool(
        [fixedToken.address, fixedToken.address],
        [mintableToken.address],
        "100",
        "100",
        "20",
        "1000"
      )
    ).to.be.revertedWith("AllocationPool: invalid token length");

    await expect(
      poolFactory.createAllocationPool(
        [ethers.constants.AddressZero],
        [mintableToken.address],
        "100",
        "100",
        "20",
        "1000"
      )
    ).to.be.revertedWith("AllocationPool: invalid token address");

    await expect(
      poolFactory.createAllocationPool(
        [fixedToken.address],
        [mintableToken.address],
        "100",
        "100",
        "20",
        "1000"
      )
    ).to.not.be.reverted;

    
  })
});