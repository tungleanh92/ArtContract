import web3 from "web3";
import { expect } from "chai";
import { BigNumber, Wallet } from "ethers";
import { ethers, waffle } from "hardhat";
import { fixture } from "./utils/fixture";
import { MintableToken } from "../typechain/MintableToken";
import { FixedToken } from "../typechain/FixedToken";
import { TomiToken } from "../typechain/TomiToken";
import { AllocationPool, PoolFactory } from "../typechain";
import * as time from "./utils/time";
import { MOD_ROLE } from "./utils/constant";
const { toWei, fromWei } = web3.utils;


describe("Pool", () => {
  let wallets: Wallet[];
  let deployer: Wallet;
  let account1: Wallet;
  let account2: Wallet;
  let account3: Wallet;
  let distributor: Wallet;
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>;
  let fixedToken: FixedToken;
  let mintableToken: MintableToken;
  let distributeToken: TomiToken;
  let distributeToken2: TomiToken;
  let poolFactory: PoolFactory;
  let pool: AllocationPool;

  before("create fixture loader", async () => {
    wallets = await (ethers as any).getSigners();
    deployer = wallets[0];
    account1 = wallets[1];
    account2 = wallets[2];
    account3 = wallets[3];
    distributor = wallets[4];

  });

  beforeEach(async () => {
    loadFixture = waffle.createFixtureLoader(wallets as any);
    ({ fixedToken, mintableToken, distributeToken, distributeToken2, poolFactory } = await loadFixture(fixture));


  });

  context("With ERC/LP token added to the field", async () => {
    beforeEach(async () => {

      await fixedToken.transfer(account1.address, "1000");
      await fixedToken.transfer(account2.address, "1000");
      await fixedToken.transfer(account3.address, "1000");

      await mintableToken.transfer(account1.address, "1000");
      await mintableToken.transfer(account2.address, "1000");
      await mintableToken.transfer(account3.address, "1000");
    });

    it("should allow emergency withdraw", async () => {
      // deploy
      const poolAddress = await poolFactory.callStatic.createAllocationPool(
        [mintableToken.address],
        [distributeToken.address],
        ["1"],
        "100",
        "100",
        "1000",
        time.duration.hours("1"),
        distributor.address,
        "10"
      );

      await poolFactory.createAllocationPool(
        [mintableToken.address],
        [distributeToken.address],
        ["1"],
        "100",
        "100",
        "1000",
        time.duration.hours("1"),
        distributor.address,
        "10"
      );

      pool = (await ethers.getContractAt(
        "AllocationPool",
        poolAddress,
      )) as AllocationPool;

      await mintableToken.connect(account1).approve(poolAddress, ethers.constants.MaxUint256);
      await mintableToken.connect(account2).approve(poolAddress, ethers.constants.MaxUint256);
      await mintableToken.connect(account3).approve(poolAddress, ethers.constants.MaxUint256);
      await distributeToken.transfer(pool.address, toWei("1375000000"));
      // console.log(await (await distributeToken.balanceOf(deployer.address)).toString());


      // nothing to withdraw
      await expect(
        pool.connect(account1).emergencyWithdraw()
      ).to.not.be.reverted;

      // 100 per block farming rate starting at block 100 with bonus until block 1000
      await pool.connect(account1).deposit(["100"]);
      expect(await mintableToken.balanceOf(account1.address)).to.equal("900");

      await pool.connect(account1).emergencyWithdraw();

      expect(await mintableToken.balanceOf(account1.address)).to.equal("1000");
    });

    it("should give out TOKENs only after farming time", async () => {

      // deploy
      const poolAddress = await poolFactory.callStatic.createAllocationPool(
        [mintableToken.address],
        [distributeToken.address],
        ["1"],
        "100",
        "100",
        "1000",
        0,
        distributor.address,
        "10"
      );

      await poolFactory.createAllocationPool(
        [mintableToken.address],
        [distributeToken.address],
        ["1"],
        "100",
        "100",
        "1000",
        0,
        distributor.address,
        "10"
      );

      pool = (await ethers.getContractAt(
        "AllocationPool",
        poolAddress,
      )) as AllocationPool;

      await mintableToken.connect(account1).approve(poolAddress, ethers.constants.MaxUint256);
      await mintableToken.connect(account2).approve(poolAddress, ethers.constants.MaxUint256);
      await mintableToken.connect(account3).approve(poolAddress, ethers.constants.MaxUint256);
      await distributeToken.transfer(distributor.address, toWei("1375000000"));
      await distributeToken.connect(distributor).approve(poolAddress, ethers.constants.MaxUint256);


      // 10 per block farming rate starting at block 100 with bonus until block 1000
      await pool.connect(account1).deposit(["100"]);
      await time.advanceBlockTo(89);

      await pool.connect(account1).deposit(["0"]); // block 90
      expect(await distributeToken.balanceOf(account1.address)).to.equal("0");
      await time.advanceBlockTo(94);

      await pool.connect(account1).deposit(["0"]); // block 95
      expect(await distributeToken.balanceOf(account1.address)).to.equal("0");
      await time.advanceBlockTo(99);

      await pool.connect(account1).deposit(["0"]); // block 100
      expect(await distributeToken.balanceOf(account1.address)).to.equal("0");
      await time.advanceBlockTo(100);

      await pool.connect(account1).claimRewards(); // block 101
      expect(await distributeToken.balanceOf(account1.address)).to.equal(toWei("1000"));

      await time.advanceBlockTo(104);
      await pool.connect(account1).claimRewards(); // block 105


      expect(await distributeToken.balanceOf(account1.address)).to.equal(toWei("5000"));

    });

    it("should distribute TOKENs properly for each staker", async () => {

      // deploy
      const poolAddress = await poolFactory.callStatic.createAllocationPool(
        [mintableToken.address],
        [distributeToken.address],
        ["1"],
        "100",
        "100",
        "1000",
        time.duration.seconds("1"),
        distributor.address,
        "10"
      );

      await poolFactory.createAllocationPool(
        [mintableToken.address],
        [distributeToken.address],
        ["1"],
        "100",
        "100",
        "1000",
        time.duration.seconds("1"),
        distributor.address,
        "10"
      );

      pool = (await ethers.getContractAt(
        "AllocationPool",
        poolAddress,
      )) as AllocationPool;

      await mintableToken.connect(account1).approve(poolAddress, ethers.constants.MaxUint256);
      await mintableToken.connect(account2).approve(poolAddress, ethers.constants.MaxUint256);
      await mintableToken.connect(account3).approve(poolAddress, ethers.constants.MaxUint256);
      await distributeToken.transfer(distributor.address, toWei("1375000000"));

      

      // 10 per block farming rate starting at block 200 with bonus until block 1000
      // user 1 deposits 10 LPs at block 210
      await time.advanceBlockTo(209);

      await pool.connect(account1).deposit(["10"]); // block 210
      // user 2  deposits 20 LPs at block 214
      await time.advanceBlockTo(213);
      await pool.connect(account2).deposit(["20"]); // block 214
      // user 3 deposits 30 LPs at block 218
      await time.advanceBlockTo(217);
      await pool.connect(account3).deposit(["30"]); // block 218

      // user 1 deposits 10 more LPs at block 220. At this point:
      //   user 1 should have: 10^18 * (4*1000 + 4*1/3*1000 + 2*1/6*1000) = 5666666666666666666666

      await time.advanceBlockTo(219);
      await pool.connect(account1).deposit(["10"]); // block 220
      
      let acc1Rewards = await (await pool.pendingToken(account1.address)).map(e => e.toString())
      expect(acc1Rewards).to.deep.equal(["5666666666666666666666"]);
      expect(await distributeToken.balanceOf(account2.address)).to.equal("0");
      expect(await distributeToken.balanceOf(account3.address)).to.equal("0");

      // user 2 withdraws 5 LPs at block 230. At this point:
      //   user 2 should have: (4*2/3*1000 + 2*2/6*1000 + 10*2/7*1000) * 10^18 = 6190476190476190476190
      await time.advanceBlockTo(229);
      await pool.connect(account2).withdraw(["5"]);
      let acc2Rewards = await (await pool.pendingToken(account2.address)).map(e => e.toString())
      expect(acc1Rewards).to.deep.equal(["5666666666666666666666"]);
      expect(acc2Rewards).to.deep.equal(["6190476190476190476190"]);
      expect(await distributeToken.balanceOf(account3.address)).to.equal("0");

      // user 1 withdraws 20 LPs at block 240.
      // user 2 withdraws 15 LPs at block 250.
      // user 3 withdraws 30 LPs at block 260.

      await time.advanceBlockTo(239);
      await pool.connect(account1).withdraw(["20"]);


      await time.advanceBlockTo(249);
      await pool.connect(account2).withdraw(["15"]);

      await time.advanceBlockTo(259);
      await pool.connect(account3).withdraw(["30"]);


      acc1Rewards = await (await pool.pendingToken(account1.address)).map(e => e.toString())
      acc2Rewards = await (await pool.pendingToken(account2.address)).map(e => e.toString())
      let acc3Rewards = await (await pool.pendingToken(account3.address)).map(e => e.toString())

      // user 1 should have: (5666666666666666666666 + 10*2/7*1000 + 10*2/6.5*1000) * 10^18 ~ 11600732600732600732600
      expect(acc1Rewards).to.deep.equal(["11600732600732600732600"]);
      // user 2 should have: (6190476190476190476190 + 10*1.5/6.5 * 1000 + 10*1.5/4.5*1000 )* 10^18 ~ 11831501831501831501831
      expect(acc2Rewards).to.deep.equal(["11831501831501831501831"]);
      // user 3 should have: (2*3/6*1000 + 10*3/7*1000 + 10*3/6.5*1000 + 10*3/4.5*1000 + 10*1000) * 10^18 = 26567765567765567765568
      expect(acc3Rewards).to.deep.equal(["26567765567765567765568"]);

      // All of them should have 1000 LPs back.

      expect(await mintableToken.balanceOf(account1.address)).to.equal("1000");
      expect(await mintableToken.balanceOf(account2.address)).to.equal("1000");
      expect(await mintableToken.balanceOf(account3.address)).to.equal("1000");
    });

    it("Stake - revert case", async () => {
      const pool2Address = await poolFactory.callStatic.createAllocationPool(
        [mintableToken.address, fixedToken.address],
        [distributeToken.address, distributeToken2.address],
        [toWei("1"), toWei("2")],
        "100",
        "20",
        "1000",
        time.duration.hours("1"),
        distributor.address,
        "10"
      );

      await poolFactory.createAllocationPool(
        [mintableToken.address, fixedToken.address],
        [distributeToken.address, distributeToken2.address],
        [toWei("1"), toWei("2")],
        "100",
        "100",
        "1000",
        time.duration.hours("1"),
        distributor.address,
        "10"
      );

      const pool2 = (await ethers.getContractAt(
        "AllocationPool",
        pool2Address,
      )) as AllocationPool;

      await fixedToken.transfer(account1.address, toWei("1000"));
      await mintableToken.transfer(account1.address, toWei("1000"));

      await distributeToken.transfer(distributor.address, toWei("1375000000"));
      await distributeToken2.transfer(distributor.address, toWei("1375000000"));
      await fixedToken.connect(account1).approve(pool2.address, ethers.constants.MaxUint256);
      await mintableToken.connect(account1).approve(pool2.address, ethers.constants.MaxUint256);

      await expect(
        pool2.connect(account1).deposit([toWei("10"), toWei("10")])
      ).to.be.revertedWith("AllocationPool: staked tokens not meet staked token rate")
    })

    it("Withdraw - revert case", async () => {
      const pool2Address = await poolFactory.callStatic.createAllocationPool(
        [mintableToken.address],
        [distributeToken.address],
        ["1"],
        "100",
        "20",
        "1000",
        time.duration.hours("1"),
        distributor.address,
        "10"
      );

      await poolFactory.createAllocationPool(
        [mintableToken.address],
        [distributeToken.address],
        ["1"],
        "100",
        "20",
        "1000",
        time.duration.hours("1"),
        distributor.address,
        "10"
      );

      const pool = (await ethers.getContractAt(
        "AllocationPool",
        pool2Address,
      )) as AllocationPool;

      await mintableToken.connect(account1).approve(pool2Address, ethers.constants.MaxUint256);
      await pool.connect(account1).deposit(["1"]);

      await expect(
        pool.connect(account1).withdraw(["1"])
      ).to.be.revertedWith(
        "AllocationStakingPool: still locked"
      );
    })

    it("should give proper TOKENs allocation to multi rewards pool", async () => {

      // deploy
      const poolAddress = await poolFactory.callStatic.createAllocationPool(
        [mintableToken.address],
        [distributeToken.address],
        ["1"],
        "100",
        "100",
        "1000",
        time.duration.hours("1"),
        distributor.address,
        "10"
      );

      await poolFactory.createAllocationPool(
        [mintableToken.address],
        [distributeToken.address],
        ["1"],
        "100",
        "100",
        "1000",
        time.duration.hours("1"),
        distributor.address,
        "10"
      );

      pool = (await ethers.getContractAt(
        "AllocationPool",
        poolAddress,
      )) as AllocationPool;

      await mintableToken.connect(account1).approve(poolAddress, ethers.constants.MaxUint256);
      await mintableToken.connect(account2).approve(poolAddress, ethers.constants.MaxUint256);
      await mintableToken.connect(account3).approve(poolAddress, ethers.constants.MaxUint256);

      const pool2Address = await poolFactory.callStatic.createAllocationPool(
        [mintableToken.address, fixedToken.address],
        [distributeToken.address, distributeToken2.address],
        ["1", "2"],
        "100",
        "100",
        "1000",
        time.duration.hours("1"),
        distributor.address,
        "10"
      );

      await poolFactory.createAllocationPool(
        [mintableToken.address, fixedToken.address],
        [distributeToken.address, distributeToken2.address],
        ["1", "2"],
        "100",
        "100",
        "1000",
        time.duration.hours("1"),
        distributor.address,
        "10"
      );

      const pool2 = (await ethers.getContractAt(
        "AllocationPool",
        pool2Address,
      )) as AllocationPool;

      await distributeToken.transfer(distributor.address, toWei("1375000000"));
      await distributeToken2.transfer(distributor.address, toWei("1375000000"));
      await distributeToken.connect(distributor).approve(pool2.address, ethers.constants.MaxUint256);
      await distributeToken2.connect(distributor).approve(pool2.address, ethers.constants.MaxUint256);
      await fixedToken.connect(account1).approve(pool2.address, ethers.constants.MaxUint256);
      await mintableToken.connect(account1).approve(pool2.address, ethers.constants.MaxUint256);

      // user 1 deposits 10 LPs at block 410
      await time.advanceBlockTo(409);
      await pool2.connect(account1).deposit(["10", "20"]);

      await time.increase(time.duration.hours("1"));
      await time.advanceBlockTo(419);
      await pool2.connect(account1).claimRewards();

      expect(await distributeToken.balanceOf(account1.address)).to.equal("3333333333333333333333")
      expect(await distributeToken2.balanceOf(account1.address)).to.equal("6666666666666666666666")

    })

    it("Pause - Unpause contract - recover fund", async () => {
      const poolAddress = await poolFactory.callStatic.createAllocationPool(
        [mintableToken.address],
        [distributeToken.address],
        ["1"],
        "100",
        "100",
        "1000",
        time.duration.hours("1"),
        distributor.address,
        "10"
      );

      await poolFactory.createAllocationPool(
        [mintableToken.address],
        [distributeToken.address],
        ["1"],
        "100",
        "100",
        "1000",
        time.duration.hours("1"),
        distributor.address,
        "10"
      );

      pool = (await ethers.getContractAt(
        "AllocationPool",
        poolAddress,
      )) as AllocationPool;

      await expect(
        pool.pauseContract()
      ).to.not.be.reverted;

      await expect(
        pool.unpauseContract()
      ).to.not.be.reverted;

      await distributeToken.transfer(pool.address, toWei("1375000000"));
      await expect(
        pool.adminRecoverFund(distributeToken.address, account1.address, "100")
      ).to.not.be.reverted;

      await expect(
        pool.connect(account1.address).getUserInfo(account1.address)
      ).to.not.be.reverted;
    })

    it("should give proper TOKENs allocation to no and half time multiper", async () => {
      // deploy
      const poolAddress = await poolFactory.callStatic.createAllocationPool(
        [mintableToken.address],
        [distributeToken.address],
        ["1"],
        "100",
        "100",
        "1000",
        time.duration.hours("1"),
        distributor.address,
        "10"
      );

      await poolFactory.createAllocationPool(
        [mintableToken.address],
        [distributeToken.address],
        ["1"],
        "100",
        "100",
        "1000",
        time.duration.hours("1"),
        distributor.address,
        "10"
      );

      pool = (await ethers.getContractAt(
        "AllocationPool",
        poolAddress,
      )) as AllocationPool;

      await mintableToken.connect(account1).approve(poolAddress, ethers.constants.MaxUint256);
      await mintableToken.connect(account2).approve(poolAddress, ethers.constants.MaxUint256);
      await mintableToken.connect(account3).approve(poolAddress, ethers.constants.MaxUint256);
      await distributeToken.transfer(distributor.address, toWei("1375000000"));

      await time.advanceBlockTo(998);
      // deposit 10 at block 990
      await pool.connect(account1).deposit(["10"]);

      await time.increase(time.duration.hours("1"));
      await time.advanceBlockTo(1009);
      // withdraw at block 1010 => 990 ~ 1000 has multiper, 1001 ~ 1010 no multiper
      await pool.connect(account1).withdraw(["10"]);

      // reward should be 10 * 10 * 100 * 10^18 + 10 * 10 * 10^18
      expect((await pool.pendingToken(account1.address))[0].toString()).to.equal(toWei("1100"));
      // deposit 10 at block 1100
      await time.advanceBlockTo(1099);
      await pool.connect(account1).deposit(["10"]);

      await time.advanceBlockTo(1109);
      await pool.connect(account1).deposit(["0"]);
      // reward should be 10 * 10 * 10^18 + 1100 * 10^18
      expect((await pool.pendingToken(account1.address))[0].toString()).to.equal(toWei("1200"));
    })

    // it("should return contract reward balance if don't have enough", async () => {
    //   // deploy
    //   const poolAddress = await poolFactory.callStatic.createAllocationPool(
    //     [mintableToken.address],
    //     [distributeToken.address],
    //     ["1"],
    //     "100",
    //     "100",
    //     "1000",
    //     time.duration.hours("1"),
    //     distributor.address
    //   );

    //   await poolFactory.createAllocationPool(
    //     [mintableToken.address],
    //     [distributeToken.address],
    //     ["1"],
    //     "100",
    //     "100",
    //     "1000",
    //     time.duration.hours("1"),
    //     distributor.address
    //   );

    //   pool = (await ethers.getContractAt(
    //     "AllocationPool",
    //     poolAddress,
    //   )) as AllocationPool;

    //   await mintableToken.connect(account1).approve(poolAddress, ethers.constants.MaxUint256);
    //   await mintableToken.connect(account2).approve(poolAddress, ethers.constants.MaxUint256);
    //   await mintableToken.connect(account3).approve(poolAddress, ethers.constants.MaxUint256);
    //   await distributeToken.transfer(distributor.address, "100000");
    //   await distributeToken.connect(distributor).approve(poolAddress, ethers.constants.MaxUint256);

    //   await time.advanceBlockTo(1999);
    //   await pool.connect(account1).deposit(["10"]);

    //   await time.increase(time.duration.hours("1"));
    //   await time.advanceBlockTo(2009);
    //   await pool.connect(account1).claimRewards();

    //   expect(await distributeToken.balanceOf(account1.address)).to.equal("100000");
    // })

    it("Set pool distributor", async () => {
      const poolAddress = await poolFactory.callStatic.createAllocationPool(
        [mintableToken.address],
        [distributeToken.address],
        ["1"],
        "100",
        "100",
        "1000",
        time.duration.hours("1"),
        distributor.address,
        "10"
      );

      await poolFactory.createAllocationPool(
        [mintableToken.address],
        [distributeToken.address],
        ["1"],
        "100",
        "100",
        "1000",
        time.duration.hours("1"),
        distributor.address,
        "10"
      );

      pool = (await ethers.getContractAt(
        "AllocationPool",
        poolAddress,
      )) as AllocationPool;

      await expect(
        pool.connect(account1).allocationSetRewardDistributor(account2.address)
      ).to.be.revertedWith(
        "AllocationPool: forbidden"
      );

      await poolFactory.grantRole(MOD_ROLE, account1.address);
      await expect(pool.connect(account1).allocationSetRewardDistributor(account2.address)).not.to.be.reverted;
    });
  })
})