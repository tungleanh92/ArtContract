// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface IPoolFactory {

    function totalAllocPoint() external view returns(uint256);

    event LinerPoolCreated(
        address indexed LinerPoolAddress
    );

    event AllocationPoolCreated(
        address indexed LinerPoolAddress
    );

    event ChangeLinerImpl(
        address LinerImplAddress
    );

    event ChangeAllocationImpl(
        address LinerImplAddress
    );

    struct LinerParams {
        address[] stakeToken;
        address[] saleToken;
        uint256  APR;
        uint256  cap;
        uint256  startTimeJoin;
        uint256  endTimeJoin;
        uint256  minInvestment;
        uint256  maxInvestment;
        uint256  lockDuration;
        address  rewardDistributor;
    }

    struct AllocationParams {
        address[] lpToken;
        address[] rewardToken;
        uint256 bonusMultiplier;
        uint256  startBlock;
        uint256  allocPoint;
        uint256  bonusEndBlock;
    }

    function setTotalAllocPoint(uint256 _newTotalAllocPoint) external;

    function getLinerParameters()
        external
        returns (
            address[] memory stakeToken,
            address[] memory saleToken,
            uint256 APR,
            uint256 cap,
            uint256 startTimeJoin,
            uint256 endTimeJoin,
            uint256 minInvestment,
            uint256 maxInvestment,
            uint256 lockDuration,
            address rewardDistributor
        );

    function getAllocationParameters()
        external
        returns (
            address[] memory lpToken,
            address[] memory rewardToken,
            uint256 bonusMultiplier,
            uint256  startBlock,
            uint256  allocPoint,
            uint256  bonusEndBlock
        );
}