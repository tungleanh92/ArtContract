// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./interfaces/IPoolFactory.sol";
import "./libraries/Clones.sol";
import "./LinerPool.sol";
import "./AllocationPool.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract PoolFactory is IPoolFactory, AccessControl {
    bytes32 public constant MOD = keccak256("MOD");
    bytes32 public constant ADMIN = keccak256("ADMIN");
    
    LinearPool public linerImpl; 
    AllocationPool public allocationImpl;

    LinerParams public linerParameters;
    AllocationParams public allocationParameters;

    uint256 public override totalAllocPoint;

    mapping(address => bool) allocationPools;

    function getLinerParameters() 
            external 
            view 
            override 
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
            ) {
                return (
                    linerParameters.stakeToken,
                    linerParameters.saleToken,
                    linerParameters.APR,
                    linerParameters.cap,
                    linerParameters.startTimeJoin,
                    linerParameters.endTimeJoin,
                    linerParameters.minInvestment,
                    linerParameters.maxInvestment,
                    linerParameters.lockDuration,
                    linerParameters.rewardDistributor
                );
            }

    function getAllocationParameters() 
            external 
            view 
            override 
            returns (
                address[] memory lpToken,
                address[] memory rewardToken,
                uint256 bonusMultiplier,
                uint256  startBlock,
                uint256  allocPoint,
                uint256  bonusEndBlock
            ) {
                return (
                    allocationParameters.lpToken,
                    allocationParameters.rewardToken,
                    allocationParameters.bonusMultiplier,
                    allocationParameters.startBlock,
                    allocationParameters.allocPoint,
                    allocationParameters.bonusEndBlock
                );
            }

    constructor(LinearPool _linerImpl, AllocationPool _allocImpl) {
        _setRoleAdmin(MOD, ADMIN);
        _setRoleAdmin(ADMIN, ADMIN);
        _setupRole(ADMIN, msg.sender);
        _setupRole(MOD, msg.sender);

        linerImpl = _linerImpl;
        allocationImpl = _allocImpl;
    }

    function changeLinerImpl(LinearPool _linerImpl) external {
        require(hasRole(ADMIN, msg.sender), "PoolFactory: require ADMIN role");
        linerImpl = _linerImpl;

        emit ChangeLinerImpl(address(_linerImpl));
    }

    function changeAllocationImpl(AllocationPool _allocImpl) external {
        require(hasRole(ADMIN, msg.sender), "PoolFactory: require ADMIN role");
        allocationImpl = _allocImpl;

        emit ChangeAllocationImpl(address(_allocImpl));
    }

    function setTotalAllocPoint(uint256 _newTotalAllocPoint) external override {
        require(
            allocationPools[msg.sender],
            "PoolFactory: not from our pool"
        );

        totalAllocPoint = _newTotalAllocPoint;
    }


    function createLinerPool(
        address[] memory _stakeToken,
        address[] memory _saleToken,
        uint256 _APR,
        uint256 _cap,
        uint256 _startTimeJoin,
        uint256 _minInvestment,
        uint256 _maxInvestment,
        uint256 _lockDuration,
        address _rewardDistributor
    ) external returns (address poolAddress) {
        require(hasRole(ADMIN, msg.sender), "PoolFactory: require ADMIN role");

        poolAddress = _deployLiner(
            _stakeToken,
            _saleToken,
            _APR,
            _cap,
            _startTimeJoin,
            _minInvestment,
            _maxInvestment,
            _lockDuration,
            _rewardDistributor
        );

        emit LinerPoolCreated(poolAddress);
    }

    function createAllocationPool(
        address[] memory _lpToken,
        address[] memory _rewardToken,
        uint256 _bonusMultiplier,
        uint256  _startBlock,
        uint256  _allocPoint,
        uint256  _bonusEndBlock
    ) external returns (address poolAddress) {
        require(hasRole(ADMIN, msg.sender), "PoolFactory: require ADMIN role");

        poolAddress = _deployAllocation(
            _lpToken,
            _rewardToken,
            _bonusMultiplier,
            _startBlock,
            _allocPoint,
            _bonusEndBlock
        );

        emit AllocationPoolCreated(poolAddress);
    }

    function _deployLiner(
        address[] memory _stakeToken,
        address[] memory _saleToken,
        uint256 _APR,
        uint256 _cap,
        uint256 _startTimeJoin,
        uint256 _minInvestment,
        uint256 _maxInvestment,
        uint256 _lockDuration,
        address _rewardDistributor
    ) private returns (address poolAddress) {

        linerParameters = LinerParams({
            stakeToken: _stakeToken,
            saleToken: _saleToken,
            APR: _APR,
            cap: _cap,
            startTimeJoin: _startTimeJoin,
            endTimeJoin: 0,
            minInvestment: _minInvestment,
            maxInvestment: _maxInvestment,
            lockDuration: _lockDuration,
            rewardDistributor: _rewardDistributor
        });

        poolAddress = Clones.clone(address(linerImpl));

        LinearPool(poolAddress).initialize();

        delete linerParameters;
    }

    function _deployAllocation(
        address[] memory _lpToken,
        address[] memory _rewardToken,
        uint256 _bonusMultiplier,
        uint256  _startBlock,
        uint256  _allocPoint,
        uint256  _bonusEndBlock
    ) private returns(address poolAddress) {
        allocationParameters = AllocationParams({
            lpToken: _lpToken,
            rewardToken: _rewardToken, 
            bonusMultiplier: _bonusMultiplier, 
            startBlock: _startBlock, 
            allocPoint: _allocPoint,
            bonusEndBlock: _bonusEndBlock 
        });

        poolAddress = Clones.clone(address(allocationImpl));
        allocationPools[poolAddress] = true;

        AllocationPool(poolAddress).initialize();

        delete allocationParameters;
    }
}
