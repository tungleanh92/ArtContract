// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IPoolFactory.sol";
import "./libraries/Clones.sol";
import "./LinerPool.sol";

contract PoolFactory is IPoolFactory, AccessControl {
    bytes32 public constant MOD = keccak256("MOD");
    bytes32 public constant ADMIN = keccak256("ADMIN");
    
    LinearPool public linerImpl; 

    LinerParams public linerParameters;

    function getLinerParameters() 
            external 
            view 
            override 
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
            ) {
                return (
                    linerParameters.stakeToken,
                    linerParameters.saleToken,
                    linerParameters.APR,
                    linerParameters.startTimeJoin,
                    linerParameters.endTimeJoin,
                    linerParameters.minInvestment,
                    linerParameters.maxInvestment,
                    linerParameters.lockDuration,
                    linerParameters.rewardDistributor
                );
            }

    constructor( LinearPool _linerImpl ) {
        _setRoleAdmin(MOD, ADMIN);
        _setRoleAdmin(ADMIN, ADMIN);
        _setupRole(ADMIN, msg.sender);
        _setupRole(MOD, msg.sender);

        linerImpl = _linerImpl;
    }

    function changeLinerImpl( LinearPool _linerImpl) external {
        require(hasRole(ADMIN, msg.sender), "PoolFactory: require ADMIN role");
        linerImpl = _linerImpl;

        emit ChangeLinerImpl( address(_linerImpl));
    }

    function createLinerPool(
        address[] memory _stakeToken,
        address[] memory _saleToken,
        uint256 _APR,
        uint256 _startTimeJoin,
        uint256 _endTimeJoin,
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
            _startTimeJoin,
            _endTimeJoin,
            _minInvestment,
            _maxInvestment,
            _lockDuration,
            _rewardDistributor
        );

        emit LinerPoolCreated(poolAddress);
    }

    function _deployLiner(
        address[] memory _stakeToken,
        address[] memory _saleToken,
        uint256 _APR,
        uint256 _startTimeJoin,
        uint256 _endTimeJoin,
        uint256 _minInvestment,
        uint256 _maxInvestment,
        uint256 _lockDuration,
        address _rewardDistributor
    ) private returns (address poolAddress) {

        linerParameters = LinerParams({
            stakeToken: _stakeToken,
            saleToken: _saleToken,
            APR: _APR,
            startTimeJoin: _startTimeJoin,
            endTimeJoin: _endTimeJoin,
            minInvestment: _minInvestment,
            maxInvestment: _maxInvestment,
            lockDuration: _lockDuration,
            rewardDistributor: _rewardDistributor
        });

        poolAddress = Clones.clone(address( linerImpl ));

        LinearPool(poolAddress).initialize();

        delete linerParameters;
    }
}
