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
    ({ fixedToken, mintableToken, poolFactory } = await loadFixture(fixture));

    await mintableToken.transfer(account1.address, toWei("1000"));
    await mintableToken.transfer(account2.address, toWei("1000"));
    await fixedToken.transfer(distributor.address, toWei("10000"));

    const poolAddress = await poolFactory.callStatic.createLinerPool(
      [mintableToken.address],
      [fixedToken.address],
      toWei("10"),
      0,
      (await time.latest()).toNumber(),
      duration.hours("1"),
      distributor.address,
    );

    await poolFactory.createLinerPool(
      [mintableToken.address],
      [fixedToken.address],
      toWei("10"),
      0,
      (await time.latest()).toNumber(),
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
      0,
      (await time.latest()).toNumber(),
      duration.hours("1"),
      ethers.constants.AddressZero,
    );

    await poolFactory.createLinerPool(
      [mintableToken.address],
      [fixedToken.address],
      toWei("10"),
      0,
      (await time.latest()).toNumber(),
      duration.hours("1"),
      ethers.constants.AddressZero,
    );

    const poolFutureAddress = await poolFactory.callStatic.createLinerPool(
      [mintableToken.address],
      [fixedToken.address],
      toWei("10"),
      0,
      (await time.latest()).toNumber() + 3600,
      duration.hours("1"),
      distributor.address,
    );

    await poolFactory.createLinerPool(
      [mintableToken.address],
      [fixedToken.address],
      toWei("10"),
      0,
      (await time.latest()).toNumber() + 3600,
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
        "LinearStakingPool: not started yet"
      );

      await time.increaseTo(duration.hours(1).add(delta.toString()));
      await poolFuture.linearSetPool(true);

      await expect(
        poolFuture.connect(account1).linearDeposit([toWei("5")])
      ).to.be.revertedWith(
        "LinearStakingPool: already closed"
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
        "LinearStakingPool: emergency not allowed"
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
      // Reward = 5 wei * 2 * 3600 * 10 / 31536000 = 114155251141552

      await time.increaseTo(duration.hours(2).add(delta.toString()));

      await pool.connect(account1).linearWithdraw([toWei("5")]);

      let acc1Amounts = await (await pool.linearBalanceOf(account1.address)).map(e => e.toString());

      expect(acc1Amounts).to.deep.equal([toWei("0")]);
      const acc1Reward = await fixedToken.balanceOf(account1.address);

      // After 5 hours user 2 withdraw
      // Reward = 5 wei * 5 * 3600 * 10 / 31536000 = 285372272957889

      await time.increaseTo(duration.hours(5).add(delta.toString()));

      await pool.connect(account2).linearWithdraw([toWei("4")]);

      let acc2Amounts = await (await pool.linearBalanceOf(account2.address)).map(e => e.toString());
      expect(acc2Amounts).to.deep.equal([toWei("1")]);
      const acc2Reward = await fixedToken.balanceOf(account2.address);

      expect(acc1Reward).to.equal("114155251141552");
      expect(acc2Reward).to.equal("285372272957889");
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
        "LinearStakingPool: invalid distributor"
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
      // Reward = 5 wei * 2 * 3600 * 10 / 31536000 = 114155251141552

      await time.increaseTo(duration.hours(2).add(delta.toString()));

      await pool.connect(account1).linearClaimReward();

      let acc1Amounts = await (await pool.linearBalanceOf(account1.address)).map(e => e.toString());
      expect(acc1Amounts).to.deep.equal([toWei("5")]);
      const acc1Reward = await fixedToken.balanceOf(account1.address);

      expect(acc1Reward).to.equal("114155251141552");

      // Reward at this time is: 114155251141552 
      await pool.connect(account2).linearDeposit([toWei("10")]);

      let acc2Amounts = await (await pool.linearBalanceOf(account2.address)).map(e => e.toString());
      expect(acc2Amounts).to.deep.equal([toWei("15")]);

      // Wait 1 hours and claim
      // Rewards: 114155251141552 + 15 wei * 1 * 3601 * 10 / 31536000 = 285483257229832
      await time.increase(duration.hours(1).add(1));
      await pool.connect(account2).linearClaimReward();
      let acc2Rewards = await balanceOf(
        deployer,
        account2.address,
        fixedToken.address
      );

      expect(acc2Rewards).to.equal(fromWei('285483257229832'));

      //Reward of user 2 now is: 0
      // Wait 1 hour and stop pool
      await time.increase(duration.hours(1));
      await pool.linearSetPool(true);
      // Rewards will stop here: 15 wei * 3601 * 10 / 31536000 + 285483257229832 = 456763698630136
      // Wait 2 hour and claim
      await time.increase(duration.hours(2).add(1));
      await pool.connect(account2).linearClaimReward();
      
      acc2Rewards = await balanceOf(
        deployer,
        account2.address,
        fixedToken.address
      );

      expect(acc2Rewards).to.equal(fromWei('456763698630136'));
      // Start pool
      await pool.linearSetPool(false);


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
        "LinearStakingPool: invalid distributor"
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


      await poolFactory.grantRole(MOD_ROLE, account1.address);
      await expect(pool.connect(account1).linearSetRewardDistributor(account2.address)).not.to.be.reverted;
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