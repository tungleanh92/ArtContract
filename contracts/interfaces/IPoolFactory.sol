// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IPoolFactory {

    event LinerPoolCreated(
        address indexed LinerPoolAddress
    );

    event ChangeLinerImpl(
        address LinerImplAddress
    );

    struct LinerParams {
        address[] stakeToken;
        address[] saleToken;
        uint256  APR;
        uint256  startTimeJoin;
        uint256  endTimeJoin;
        uint256  minInvestment;
        uint256  maxInvestment;
        uint256  lockDuration;
        address  rewardDistributor;
    }

    function getLinerParameters()
        external
        returns (
            address[] memory stakeToken,
            address[] memory saleToken,
            uint256 APR,
            uint256 startTimeJoin,
            uint256 endTimeJoin,
            uint256 minInvestment,
            uint256 maxInvestment,
            uint256 lockDuration,
            address rewardDistributor
        );
}