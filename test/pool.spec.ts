import web3 from "web3";
import { BigNumber, Wallet } from "ethers";
import { ethers, waffle } from "hardhat";
import { fixture } from "./utils/fixture";
import { expect } from "chai";
import { MintableToken } from "../typechain/MintableToken";
import { FixedToken } from "../typechain/FixedToken";
import { LinearPool, PoolFactory } from "../typechain";
import { balanceOf, fakeWithdrawData, fakeWithdrawData02 } from "./utils/utils";
import { MOD_ROLE, ADMIN_ROLE } from "./utils/constant";
import { duration } from "./utils/time";
import * as time from "./utils/time";
const { toWei, fromWei } = web3.utils;

describe("Pool", () => {
  let wallets: Wallet[];
  let deployer: Wallet;
  let account1: Wallet;
  let account2: Wallet;
  let distributor: Wallet;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let fixedToken: FixedToken;
  let mintableToken: MintableToken;
  let poolFactory: PoolFactory;
  let pool: LinearPool;
  let poolZero: LinearPool;
  let poolFuture: LinearPool;

  before("create fixture loader", async () => {
    wallets = await (ethers as any).getSigners();
    deployer = wallets[0];
    account1 = wallets[1];
    account2 = wallets[2];
    distributor = wallets[3];
  });

  beforeEach(async () => {
    loadFixture = waffle.createFixtureLoader(wallets as any);
    ({ fixedToken, mintableToken } = await loadFixture(fixture));

    await mintableToken.transfer(account1.address, toWei("1000"));
    await mintableToken.transfer(account2.address, toWei("1000"));
    await fixedToken.transfer(distributor.address, toWei("10000"));

    const poolFactoryDeployer = await ethers.getContractFactory(
      "PoolFactory",
    );

    poolFactory =
      (await poolFactoryDeployer.deploy()) as PoolFactory;

    const poolAddress = await poolFactory.callStatic.createLinerPool(
      [mintableToken.address],
      [fixedToken.address],
      toWei("10"),
      (await time.latest()).toNumber(),
      (await time.latest()).toNumber() + duration.years(1).toNumber(),
      toWei("1"),
      toWei("10"),
      duration.hours("1"),
      distributor.address,
    );

    await poolFactory.createLinerPool(
      [mintableToken.address],
      [fixedToken.address],
      toWei("10"),
      (await time.latest()).toNumber(),
      (await time.latest()).toNumber() + duration.years(1).toNumber(),
      toWei("1"),
      toWei("10"),
      duration.hours("1"),
      distributor.address,
    );

    pool = (await ethers.getContractAt(
      "LinearPool",
      poolAddress,
    )) as LinearPool;

    const poolZeroAddress = await poolFactory.callStatic.createLinerPool(
      [mintableToken.address],
      [fixedToken.address],
      toWei("10"),
      (await time.latest()).toNumber(),
      (await time.latest()).toNumber() + 30,
      toWei("1"),
      toWei("10"),
      duration.hours("1"),
      ethers.constants.AddressZero,
    );

    await poolFactory.createLinerPool(
      [mintableToken.address],
      [fixedToken.address],
      toWei("10"),
      (await time.latest()).toNumber(),
      (await time.latest()).toNumber() + 30,
      toWei("1"),
      toWei("10"),
      duration.hours("1"),
      ethers.constants.AddressZero,
    );

    const poolFutureAddress = await poolFactory.callStatic.createLinerPool(
      [mintableToken.address],
      [fixedToken.address],
      toWei("10"),
      (await time.latest()).toNumber() + 3600,
      (await time.latest()).toNumber() + 6400,
      toWei("1"),
      toWei("10"),
      duration.hours("1"),
      distributor.address,
    );

    await poolFactory.createLinerPool(
      [mintableToken.address],
      [fixedToken.address],
      toWei("10"),
      (await time.latest()).toNumber() + 3600,
      (await time.latest()).toNumber() + 6400,
      toWei("1"),
      toWei("10"),
      duration.hours("1"),
      distributor.address,
    );

    poolZero = (await ethers.getContractAt(
      "LinearPool",
      poolZeroAddress,
    )) as LinearPool;

    poolFuture = (await ethers.getContractAt(
      "LinearPool",
      poolFutureAddress,
    )) as LinearPool;

    await mintableToken.connect(account1).approve(poolAddress, ethers.constants.MaxUint256);
    await mintableToken.connect(account2).approve(poolAddress, ethers.constants.MaxUint256);
    await fixedToken.connect(distributor).approve(poolAddress, ethers.constants.MaxUint256);

    await mintableToken.connect(account1).approve(poolZeroAddress, ethers.constants.MaxUint256);
    await mintableToken.connect(account2).approve(poolZeroAddress, ethers.constants.MaxUint256);
    await fixedToken.connect(distributor).approve(poolZeroAddress, ethers.constants.MaxUint256);

    await mintableToken.connect(account1).approve(poolFutureAddress, ethers.constants.MaxUint256);
    await mintableToken.connect(account2).approve(poolFutureAddress, ethers.constants.MaxUint256);
    await fixedToken.connect(distributor).approve(poolFutureAddress, ethers.constants.MaxUint256);

  });

  context("With liner pool - Stake", async () => {
    let delta: BigNumber;

    beforeEach(async () => {
      delta = await time.latest();
    });

    it("Stake", async () => {
      await pool.connect(account1).linearDeposit([toWei("5")]);
      await pool.connect(account2).linearDeposit([toWei("5")]);

      const acc1Amounts = await (await pool.linearBalanceOf(account1.address)).map(e => e.toString());
      let acc2Amounts = await (await pool.linearBalanceOf(account2.address)).map(e => e.toString());

      expect(acc1Amounts).to.deep.equal([toWei("5")]).to.deep.equal(acc2Amounts);

      await pool.connect(account1).linearDepositSpecifyReceiver([toWei("5")], account2.address);
      acc2Amounts = await (await pool.linearBalanceOf(account2.address)).map(e => e.toString());
      expect(acc2Amounts).to.deep.equal([toWei("10")])

    });

    it("Stake - revert cases", async () => {

      await expect(
        pool.connect(account1).linearDeposit([toWei("5"), toWei("1")])
      ).to.be.revertedWith(
        "LinearStakingPool: inffuse amounts"
      );

      await expect(
        poolFuture.connect(account1).linearDeposit([toWei("5")])
      ).to.be.revertedWith(
        "LinearStakingPool: pool is not started yet"
      );

      await time.increaseTo(duration.years(1).add(delta.toString()));

      await expect(
        poolFuture.connect(account1).linearDeposit([toWei("5")])
      ).to.be.revertedWith(
        "LinearStakingPool: pool is already closed"
      );
    })

  })

  context("With liner pool - Stake - Withdraw", async () => {
    let delta: BigNumber;

    beforeEach(async () => {
      delta = await time.latest();

      await pool.connect(account1).linearDeposit([toWei("5")]);
      await pool.connect(account2).linearDeposit([toWei("5")]);

      await poolZero.connect(account1).linearDeposit([toWei("5")]);
    });

    it("emergencyWithdraw", async () => {
      await expect(
        pool.connect(account1).linearEmergencyWithdraw()
      ).to.be.revertedWith(
        "LinearStakingPool: emergency withdrawal is not allowed yet"
      );

      await pool.linearSetAllowEmergencyWithdraw(true);

      let acc1Amounts = await (await pool.linearBalanceOf(account1.address)).map(e => e.toString());

      expect(acc1Amounts).to.eql([toWei("5")]);

      await pool.connect(account1).linearEmergencyWithdraw();

      acc1Amounts = await (await pool.linearBalanceOf(account1.address)).map(e => e.toString());

      expect(acc1Amounts).to.deep.equal([toWei("0")]);
    });

    it("withdraw", async () => {

      // After 2 hours user 1 withdraw
      // Reward = 5 wei * 1 * 3600 * 10 / 31536000 = 57077625570776

      await time.increaseTo(duration.hours(2).add(delta.toString()));

      await pool.connect(account1).linearWithdraw([toWei("5")]);

      let acc1Amounts = await (await pool.linearBalanceOf(account1.address)).map(e => e.toString());

      expect(acc1Amounts).to.deep.equal([toWei("0")]);
      const acc1Reward = await fixedToken.balanceOf(account1.address);

      // After 5 hours user 2 withdraw
      // Reward = 5 wei * 1 * 3600 * 10 / 31536000 = 57077625570776

      await time.increaseTo(duration.hours(5).add(delta.toString()));

      await pool.connect(account2).linearWithdraw([toWei("4")]);

      let acc2Amounts = await (await pool.linearBalanceOf(account2.address)).map(e => e.toString());
      expect(acc2Amounts).to.deep.equal([toWei("1")]);
      const acc2Reward = await fixedToken.balanceOf(account2.address);

      expect(acc1Reward).to.equal("57077625570776");
      expect(acc2Reward).to.equal("57077625570776");
    });

    it("withdraw - all revert cases", async () => {

      // Withdraw before lock time: 30s after staked

      await time.increaseTo(duration.seconds(30).add(delta.toString()));
      await expect(
        pool.connect(account1).linearWithdraw([toWei("5")])
      ).to.be.revertedWith(
        "LinearStakingPool: still locked"
      );

      // Withdraw with an account hasn't staked

      await time.increaseTo(duration.hours(2).add(delta.toString()));
      await expect(
        pool.connect(deployer).linearWithdraw([toWei("5")])
      ).to.be.revertedWith(
        "LinearStakingPool: nothing to withdraw"
      );

      // Withdraw when distributor is zero address
      await expect(
        poolZero.connect(account1).linearWithdraw([toWei("5")])
      ).to.be.revertedWith(
        "LinearStakingPool: invalid reward distributor"
      );
    });

  });

  context("With liner pool - Stake - Claim", async () => {
    let delta: BigNumber;

    beforeEach(async () => {
      delta = await time.latest();

      await pool.connect(account1).linearDeposit([toWei("5")]);
      await pool.connect(account2).linearDeposit([toWei("5")]);

      await poolZero.connect(account1).linearDeposit([toWei("5")]);


    });

    it("Claim rewards", async () => {
      // After 2 hours user 1 claim
      // Reward = 5 wei * 1 * 3600 * 10 / 31536000 = 57077625570776

      await time.increaseTo(duration.hours(2).add(delta.toString()));

      await pool.connect(account1).linearClaimReward();

      let acc1Amounts = await (await pool.linearBalanceOf(account1.address)).map(e => e.toString());

      expect(acc1Amounts).to.deep.equal([toWei("5")]);
      const acc1Reward = await fixedToken.balanceOf(account1.address);

      expect(acc1Reward).to.equal("57077625570776");

      // Reward at this time is: 57077625570776 
      await pool.connect(account2).linearDeposit([toWei("10")]);

      let acc2Amounts = await (await pool.linearBalanceOf(account2.address)).map(e => e.toString());
      expect(acc2Amounts).to.deep.equal([toWei("15")]);

      // Wait 1 hours and claim
      // Rewards: 57077625570776 + 15 wei * 1 * 3600 * 10 / 31536000 = 228310502283104
      await time.increase(duration.hours(1).add(1));
      await pool.connect(account2).linearClaimReward();
      const acc2Rewards = await balanceOf(
        deployer,
        account2.address,
        fixedToken.address
      );

      expect(acc2Rewards).to.equal(fromWei('228310502283104'));
    });

    it("Claim rewards - all revert cases", async () => {
      
      await expect(
        pool.connect(account1).linearClaimReward()
      ).to.be.revertedWith(
        "LinearStakingPool: still locked"
      );

      await time.increaseTo(duration.hours(2).add(delta.toString()));

      await expect(
        poolZero.connect(account1).linearClaimReward()
      ).to.be.revertedWith(
        "LinearStakingPool: invalid reward distributor"
      );
    })
  });

  context("With liner pool - other cases", async () => {
    it("pause unpause contract", async () => {
      await expect(
        pool.connect(account1).pauseContract()
      ).to.be.revertedWith(
        "LinearStakingPool: forbidden"
      );

      await expect(
        pool.connect(account1).unpauseContract()
      ).to.be.revertedWith(
        "LinearStakingPool: forbidden"
      );

      await poolFactory.grantRole(MOD_ROLE, account1.address);
      
      await expect(pool.connect(account1).pauseContract()).not.to.be.reverted;
      await expect(pool.connect(account1).unpauseContract()).not.to.be.reverted;
    });

    it("Set pool status", async () => {
      
      await expect(
        pool.connect(account1).linearSetRewardDistributor(account2.address)
      ).to.be.revertedWith(
        "LinearStakingPool: forbidden"
      );

      await expect(
        pool.connect(account1).linearSetMaxRewardToken(6)
      ).to.be.revertedWith(
        "LinearStakingPool: forbidden"
      );

      await poolFactory.grantRole(ADMIN_ROLE, account1.address);
      await expect(
        pool.connect(account1).linearSetMaxRewardToken(6)
      ).to.be.revertedWith(
        "LinearStakingPool: invalid reward token length"
      );
      await expect(pool.connect(account1).linearSetRewardDistributor(account2.address)).not.to.be.reverted;
      await expect(pool.connect(account1).linearSetMaxRewardToken(4)).not.to.be.reverted;
    });

    it("Admin withdraw", async () => {
      await fixedToken.transfer(pool.address, toWei("10"));
      const amountBefore = await fixedToken.balanceOf(pool.address);
      await pool.linearAdminRecoverFund(fixedToken.address, deployer.address, toWei("5"));
      const amountAfter = await fixedToken.balanceOf(pool.address);

      expect(amountBefore.sub(amountAfter).toString()).to.be.equal(toWei("5"));
    })
  })
})