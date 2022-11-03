import web3 from "web3";
import { BigNumber, Wallet } from "ethers";
import { ethers, waffle } from "hardhat";
import { fixture } from "./utils/fixture";
import { expect } from "chai";
import { MintableToken } from "../typechain/MintableToken";
import { FixedToken } from "../typechain/FixedToken";
import { TomiToken } from "../typechain/TomiToken"
import { LinearPool, PoolFactory } from "../typechain";
import { balanceOf } from "./utils/utils";
import { MOD_ROLE } from "./utils/constant";
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
    let distributeToken: TomiToken;
    let poolFactory: PoolFactory;
    let pool: LinearPool;
    let pool3: LinearPool;
    let poolCap5: LinearPool;
    let poolCap10: LinearPool;
    let poolZero: LinearPool;
    let poolFuture: LinearPool;
    let pool2Token: LinearPool;

    before("create fixture loader", async () => {
        wallets = await (ethers as any).getSigners();
        deployer = wallets[0];
        account1 = wallets[1];
        account2 = wallets[2];
        distributor = wallets[3];
    });

    beforeEach(async () => {
        loadFixture = waffle.createFixtureLoader(wallets as any);
        ({ fixedToken, mintableToken, poolFactory, distributeToken } = await loadFixture(fixture));

        await mintableToken.transfer(account1.address, toWei("1000"));
        await fixedToken.transfer(account1.address, toWei("1000"));
        await distributeToken.transfer(account1.address, toWei("1000"));
        await mintableToken.transfer(account2.address, toWei("1000"));
        await fixedToken.transfer(distributor.address, toWei("10000"));
        await mintableToken.transfer(distributor.address, toWei("1000"));
        await distributeToken.transfer(distributor.address, toWei("1000"));

        const poolAddress = await poolFactory.callStatic.createLinerPool(
            [mintableToken.address],
            [mintableToken.address],
            [toWei("1")],
            toWei("10"),
            0,
            (await time.latest()).toNumber(),
            duration.hours("1"),
            distributor.address,
        );

        await poolFactory.createLinerPool(
            [mintableToken.address],
            [mintableToken.address],
            [toWei("1")],
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

        const pool3Address = await poolFactory.callStatic.createLinerPool(
            [mintableToken.address, fixedToken.address, distributeToken.address],
            [mintableToken.address, fixedToken.address, distributeToken.address],
            [toWei("2"), toWei("3"), toWei("5")],
            toWei("10"),
            0,
            (await time.latest()).toNumber(),
            duration.hours("1"),
            distributor.address,
        );

        await poolFactory.createLinerPool(
            [mintableToken.address, fixedToken.address, distributeToken.address],
            [mintableToken.address, fixedToken.address, distributeToken.address],
            [toWei("2"), toWei("3"), toWei("5")],
            toWei("10"),
            0,
            (await time.latest()).toNumber(),
            duration.hours("1"),
            distributor.address,
        );

        pool3 = (await ethers.getContractAt(
            "LinearPool",
            pool3Address,
        )) as LinearPool;

        const poolCap5Address = await poolFactory.callStatic.createLinerPool(
            [mintableToken.address],
            [mintableToken.address],
            ["1"],
            toWei("10"),
            toWei("5"),
            (await time.latest()).toNumber(),
            duration.hours("1"),
            distributor.address,
        );

        await poolFactory.createLinerPool(
            [mintableToken.address],
            [mintableToken.address],
            ["1"],
            toWei("10"),
            toWei("5"),
            (await time.latest()).toNumber(),
            duration.hours("1"),
            distributor.address,
        );

        poolCap5 = (await ethers.getContractAt(
            "LinearPool",
            poolCap5Address,
        )) as LinearPool;

        const poolCap10Address = await poolFactory.callStatic.createLinerPool(
            [mintableToken.address, mintableToken.address],
            [mintableToken.address, mintableToken.address],
            [toWei("1"), toWei("2")],
            toWei("10"),
            toWei("10"),
            (await time.latest()).toNumber(),
            duration.hours("1"),
            distributor.address,
        );

        await poolFactory.createLinerPool(
            [mintableToken.address, mintableToken.address],
            [mintableToken.address, mintableToken.address],
            [toWei("1"), toWei("2")],
            toWei("10"),
            toWei("10"),
            (await time.latest()).toNumber(),
            duration.hours("1"),
            distributor.address,
        );

        poolCap10 = (await ethers.getContractAt(
            "LinearPool",
            poolCap10Address,
        )) as LinearPool;

        const pool2TokenAddress = await poolFactory.callStatic.createLinerPool(
            [mintableToken.address, mintableToken.address],
            [mintableToken.address, mintableToken.address],
            [toWei("1"), toWei("2")],
            toWei("10"),
            toWei("5"),
            (await time.latest()).toNumber(),
            duration.hours("1"),
            distributor.address,
        );

        await poolFactory.createLinerPool(
            [mintableToken.address, mintableToken.address],
            [mintableToken.address, mintableToken.address],
            [toWei("1"), toWei("2")],
            toWei("10"),
            toWei("5"),
            (await time.latest()).toNumber(),
            duration.hours("1"),
            distributor.address,
        );

        pool2Token = (await ethers.getContractAt(
            "LinearPool",
            pool2TokenAddress,
        )) as LinearPool;

        const poolZeroAddress = await poolFactory.callStatic.createLinerPool(
            [mintableToken.address],
            [mintableToken.address],
            ["1"],
            toWei("10"),
            0,
            (await time.latest()).toNumber(),
            duration.hours("1"),
            ethers.constants.AddressZero,
        );

        await poolFactory.createLinerPool(
            [mintableToken.address],
            [mintableToken.address],
            ["1"],
            toWei("10"),
            0,
            (await time.latest()).toNumber(),
            duration.hours("1"),
            ethers.constants.AddressZero,
        );

        const poolFutureAddress = await poolFactory.callStatic.createLinerPool(
            [mintableToken.address],
            [mintableToken.address],
            ["1"],
            toWei("10"),
            0,
            (await time.latest()).toNumber() + 3600,
            duration.hours("1"),
            distributor.address,
        );

        await poolFactory.createLinerPool(
            [mintableToken.address],
            [mintableToken.address],
            ["1"],
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
        await mintableToken.connect(distributor).approve(poolAddress, ethers.constants.MaxUint256);
        await fixedToken.connect(distributor).approve(poolAddress, ethers.constants.MaxUint256);

        await distributeToken.connect(account1).approve(pool3Address, ethers.constants.MaxUint256);
        await mintableToken.connect(account1).approve(pool3Address, ethers.constants.MaxUint256);
        await fixedToken.connect(account1).approve(pool3Address, ethers.constants.MaxUint256);
        await distributeToken.connect(distributor).approve(pool3Address, ethers.constants.MaxUint256);
        await mintableToken.connect(distributor).approve(pool3Address, ethers.constants.MaxUint256);
        await fixedToken.connect(distributor).approve(pool3Address, ethers.constants.MaxUint256);

        await mintableToken.connect(account1).approve(poolCap5Address, ethers.constants.MaxUint256);
        await mintableToken.connect(account2).approve(poolCap5Address, ethers.constants.MaxUint256);
        await fixedToken.connect(distributor).approve(poolCap5Address, ethers.constants.MaxUint256);

        await mintableToken.connect(account1).approve(poolCap10Address, ethers.constants.MaxUint256);
        await mintableToken.connect(account2).approve(poolCap10Address, ethers.constants.MaxUint256);
        await fixedToken.connect(distributor).approve(poolCap10Address, ethers.constants.MaxUint256);

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

        });

        it("Stake 5_cap pool", async () => {
            await poolCap5.connect(account1).linearDeposit([toWei("2")]);
            await poolCap5.connect(account2).linearDeposit([toWei("2")]);

            const acc1Amounts = await (await poolCap5.linearBalanceOf(account1.address)).map(e => e.toString());
            let acc2Amounts = await (await poolCap5.linearBalanceOf(account2.address)).map(e => e.toString());

            expect(acc1Amounts).to.deep.equal([toWei("2")]).to.deep.equal(acc2Amounts);

            await expect(
                poolCap5.connect(account2).linearDeposit([toWei("2")])
            ).to.be.revertedWith("LinearStakingPool: pool is full");
        });

        it("Stake 10_cap with 2 address token pool", async () => {
            await poolCap10.connect(account1).linearDeposit([toWei("1"), toWei("2")]);
            await poolCap10.connect(account2).linearDeposit([toWei("1"), toWei("2")]);

            await expect(
                poolCap10.connect(account2).linearDeposit([toWei("2"), toWei("4")])
            ).to.be.revertedWith("LinearStakingPool: pool is full");
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
            await poolFuture.linearSetPool();

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

    context("Test case in excel - 3 tokens accepted", async () => {
        let delta: BigNumber;

        beforeEach(async () => {
            delta = await time.latest();
            await pool3.connect(account1).linearDeposit([toWei("200"), toWei("300"), toWei("500")]);
        });

        it("Claim 3 tokens", async () => {

            await time.increaseTo(duration.days(90).add(delta.toString()));

            await pool3.connect(account1).linearClaimReward();

            const acc1Reward1 = await mintableToken.balanceOf(account1.address);
            const acc1Reward2 = await fixedToken.balanceOf(account1.address);
            const acc1Reward3 = await distributeToken.balanceOf(account1.address);

            expect(acc1Reward1).to.equal("804931506849315068493");
            expect(acc1Reward2).to.equal("707397260273972602739");
            expect(acc1Reward3).to.equal("512328767123287671232");
        });
    })

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
            const acc1Reward = await mintableToken.balanceOf(account1.address);

            // balance of account1 is 990000000000000000000 + 114155251141552
            expect(acc1Reward).to.equal("990000114155251141552");

            // Reward at this time is: 114155251141552 
            await pool.connect(account2).linearDeposit([toWei("10")]);

            let acc2Amounts = await (await pool.linearBalanceOf(account2.address)).map(e => e.toString());
            expect(acc2Amounts).to.deep.equal([toWei("15")]);

            // Wait 1 hours and claim
            // Rewards: 114155251141552 + 15 wei * 1 * 3601 * 10 / 31536000 (1.7128044e+16...) = 285483 ...
            // 17128044
            // 11415525 1141552
            await time.increase(duration.hours(1).add(1));
            await pool.connect(account2).linearClaimReward();
            let acc2Rewards = await balanceOf(
                deployer,
                account2.address,
                mintableToken.address
            );

            // balance of account2 is 985000000000000000000 + 285483...
            expect(acc2Rewards).to.equal(fromWei('985000285483257229832'));
            acc2Amounts = await (await pool.linearBalanceOf(account2.address)).map(e => e.toString());
            expect(acc2Amounts).to.deep.equal([toWei("15")]);
            
            await time.increase(duration.minutes(60));
            // let pendingReward = await pool.connect(account2).linearPendingReward(account2.address);
            // 47564688... 1s
            // 47564687975

            // 285388128.... 1p
            // 2853881278538

            // 171232877...... 1h
            // 171232876712328

            // 342465753...... 2h
            // 342465753424657
            // expect(pendingReward[0]).to.equal('0');
            await pool.linearSetPool();
            await time.increase(duration.hours(2));
            await pool.connect(account2).linearClaimReward();

            acc2Rewards = await balanceOf(
                deployer,
                account2.address,
                mintableToken.address
            );

            expect(acc2Rewards).to.equal(fromWei('985000456763698630136'));
            // Start pool
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

        it("Admin withdraw", async () => {
            await fixedToken.transfer(pool.address, toWei("10"));
            const amountBefore = await fixedToken.balanceOf(pool.address);
            await pool.linearAdminRecoverFund(fixedToken.address, deployer.address, toWei("5"));
            const amountAfter = await fixedToken.balanceOf(pool.address);

            expect(amountBefore.sub(amountAfter).toString()).to.be.equal(toWei("5"));
        })

        it("Stake inffuse amounts", async () => {

            await expect(
                pool2Token.connect(account1).linearDeposit([toWei("2")])
            ).to.be.revertedWith(
                "LinearStakingPool: inffuse amounts"
            );
        })
    })

})