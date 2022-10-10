// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./interfaces/IPoolFactory.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract AllocationPool is PausableUpgradeable {
    using SafeERC20 for IERC20;
    using Address for address;
    bytes32 public constant MOD = keccak256("MOD");
    bytes32 public constant ADMIN = keccak256("ADMIN");

    // Info of each user.
    struct UserInfo {
        uint256[] amount; // How many LP tokens the user has provided.
        uint256[] rewardDebt; // Reward debt. See explanation below.
        uint256 joinTime;
        //
        // We do some fancy math here. Basically, any point in time, the amount of TOKENs
        // entitled to a user but is pending to be distributed is:
        //
        //   pending reward = (user.amount * pool.accTokenPerShare) - user.rewardDebt
        //
        // Whenever a user deposits or withdraws LP tokens to a pool. Here's what happens:
        //   1. The pool's `accTokenPerShare` (and `lastRewardBlock`) gets updated.
        //   2. User receives the pending reward sent to his/her address.
        //   3. User's `amount` gets updated.
        //   4. User's `rewardDebt` gets updated.
    }

    // Pool creator
    address public factory;
    // How many allocation points assigned to this pool. TOKENs to distribute per block.
    uint256 public allocPoint;
    // Last block number that TOKENs distribution occurs.
    uint256 public lastRewardBlock;
    // Bonus muliplier for early token makers.
    uint256 public bonusMultiplier;
    // Block number when bonus TOKEN period ends.
    uint256 public bonusEndBlock;
    // tokens created per block.
    uint256 public constant TOKEN_PER_BLOCK = 10;
    // The block number when TOKEN mining starts.
    uint256 public startBlock;
    // Lock time to claim reward after staked
    uint256 public lockDuration;
    // Address of LP token contract.
    IERC20[] public lpToken;
    // Reward token
    IERC20[] public rewardToken;
    // Token rate each pool
    uint256[] public stakedTokenRate;
    // Accumulated TOKENs per share, times 1e12. See below.
    uint256[] public accTokenPerShare;
    // Info of each user that stakes LP tokens.
    mapping(address => UserInfo) internal userInfo;
    // Token per block with decimals
    uint256[] public decimalTokenPerBlock;

    event ChangeAllocationPoint(uint256 point);
    event Deposit(address indexed user, uint256[] amount);
    event Withdraw(address indexed user, uint256[] amount);
    event AdminRecoverFund(address token, address to, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256[] amount);

    modifier isMod() {
        require(
            IAccessControlUpgradeable(factory).hasRole(MOD, msg.sender),
            "AllocationPool: forbidden"
        );
        _;
    }

    modifier isAdmin() {
        require(
            IAccessControlUpgradeable(factory).hasRole(ADMIN, msg.sender),
            "AllocationPool: forbidden"
        );
        _;
    }

    /**
     * @notice Initialize the contract, get called in the first time deploy
     */
    function initialize() external initializer {
        __Pausable_init();

        (
            address[] memory _lpToken,
            address[] memory _rewardToken,
            uint256[] memory _stakedTokenRate,
            uint256 _bonusMultiplier,
            uint256 _startBlock,
            uint256 _allocPoint,
            uint256 _bonusEndBlock,
            uint256 _lockDuration
        ) = IPoolFactory(msg.sender).getAllocationParameters();

        uint256 _rewardLength = _lpToken.length;
        require(
            _rewardLength == _rewardToken.length && _rewardLength == _stakedTokenRate.length,
            "AllocationPool: invalid token length"
        );

        for (uint256 i = 0; i < _rewardLength; i++) {
            require(
                _lpToken[i] != address(0) && _rewardToken[i] != address(0),
                "AllocationPool: invalid token address"
            );
            lpToken.push(IERC20(_lpToken[i]));
            rewardToken.push(IERC20(_rewardToken[i]));
            accTokenPerShare.push(0);

            uint8 _decimals = _getDecimals(_rewardToken[i]);
            uint256 _formated = TOKEN_PER_BLOCK * (10**(_decimals));
            decimalTokenPerBlock.push(_formated);
        }
        stakedTokenRate = _stakedTokenRate;
        factory = msg.sender;
        bonusMultiplier = _bonusMultiplier;
        startBlock = _startBlock;
        allocPoint = _allocPoint;
        bonusEndBlock = _bonusEndBlock;
        lockDuration = _lockDuration;

        lastRewardBlock = block.number > startBlock ? block.number : startBlock;

        uint256 totalAllocPoint = IPoolFactory(factory).totalAllocPoint();
        totalAllocPoint = totalAllocPoint + _allocPoint;
        IPoolFactory(factory).setTotalAllocPoint(totalAllocPoint);
    }

    /**
     * @notice Update the given pool's token allocation point. Can only be called by the owner.
     */
    function set(uint256 _allocPoint) public isMod {
        uint256 totalAllocPoint = IPoolFactory(factory).totalAllocPoint();
        totalAllocPoint = totalAllocPoint - allocPoint + _allocPoint;
        allocPoint = _allocPoint;
        IPoolFactory(factory).setTotalAllocPoint(totalAllocPoint);

        emit ChangeAllocationPoint(_allocPoint);
    }

    /**
     * @notice Pause contract
     */
    function pauseContract() external isMod {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpauseContract() external isMod {
        _unpause();
    }

    /**
     * @notice Admin withdraw tokens from a contract
     * @param _token token to withdraw
     * @param _to to user address
     * @param _amount amount to withdraw
     */
    function adminRecoverFund(
        address _token,
        address _to,
        uint256 _amount
    ) external isAdmin {
        IERC20(_token).safeTransfer(_to, _amount);
        emit AdminRecoverFund(_token, _to, _amount);
    }

    /**
     * @notice Return reward multiplier over the given _from to _to block.
     * @param _from start caculated block
     * @param _to end caculated block
     */
    function getMultiplier(uint256 _from, uint256 _to)
        public
        view
        returns (uint256)
    {
        if (_to <= bonusEndBlock) {
            return (_to - _from) * bonusMultiplier;
        } else if (_from >= bonusEndBlock) {
            return _to - _from;
        } else {
            return
                (bonusEndBlock - _from) * bonusMultiplier + _to - bonusEndBlock;
        }
    }

    function getUserInfo(address _account)
        external
        view
        returns (UserInfo memory)
    {
        return userInfo[_account];
    }

    /**
     * @notice View function to see pending TOKENs on frontend.
     * @param _user user need to see pending token
     */
    function pendingToken(address _user)
        external
        view
        returns (uint256[] memory rewards)
    {
        uint256 totalAllocPoint = IPoolFactory(factory).totalAllocPoint();
        UserInfo memory user = userInfo[_user];
        uint256[] memory amount = user.amount;
        uint256[] memory rewardDebt = user.rewardDebt;
        rewards = new uint256[](lpToken.length);
        if (amount.length == 0) {
            amount = new uint256[](lpToken.length);
            rewardDebt = new uint256[](lpToken.length);
        }
        uint256[] memory _accTokenPerShare = accTokenPerShare;
        uint256[] memory lpSupply = new uint256[](lpToken.length);

        uint256 multiplier = getMultiplier(lastRewardBlock, block.number);
        for (uint256 i = 0; i < lpSupply.length; i++) {
            lpSupply[i] = lpToken[i].balanceOf(address(this));

            if (block.number > lastRewardBlock && lpSupply[i] != 0) {
                uint256 tokenReward = (multiplier *
                    decimalTokenPerBlock[i] *
                    allocPoint) / totalAllocPoint;

                _accTokenPerShare[i] =
                    _accTokenPerShare[i] +
                    ((tokenReward * 1e12) / lpSupply[i]);
                rewards[i] =
                    (_accTokenPerShare[i] / 1e12) *
                    amount[i] -
                    rewardDebt[i];
            }
        }
    }

    /**
     * @notice Update reward variables of the given pool to be up-to-date.
     */
    function updatePool() public whenNotPaused {
        if (block.number <= lastRewardBlock) {
            return;
        }
        uint256 totalAllocPoint = IPoolFactory(factory).totalAllocPoint();
        uint256[] memory  _stakedTokenRate = stakedTokenRate; 
        uint256 sum;
        for(uint256 i = 0; i < _stakedTokenRate.length; ++i) {
            sum += _stakedTokenRate[i];
        }
        for (uint256 i = 0; i < lpToken.length; i++) {
            uint256 lpSupply = lpToken[i].balanceOf(address(this));
            if (lpSupply == 0) {
                continue;
            }
            uint256 multiplier = getMultiplier(lastRewardBlock, block.number);
            uint256 tokenReward = (((multiplier *
                decimalTokenPerBlock[i] *
                allocPoint) / totalAllocPoint) / sum) * _stakedTokenRate[i];
            accTokenPerShare[i] =
                accTokenPerShare[i] +
                ((tokenReward * 1e12) / lpSupply);
        }
        lastRewardBlock = block.number;
    }

    /**
     * @notice Deposit LP tokens to contract for token allocation.
     * @param _amounts amounts of token user stake into pool
     */
    function deposit(uint256[] memory _amounts) external whenNotPaused {
        UserInfo storage user = userInfo[msg.sender];
        updatePool();
        if (user.amount.length == 0) {
            user.amount = new uint256[](lpToken.length);
            user.rewardDebt = new uint256[](lpToken.length);
        }
        uint256 shared_times = _amounts[0] / stakedTokenRate[0];
        for (uint256 i = 0; i < lpToken.length; i++) {
            require(
                stakedTokenRate[i] * shared_times == _amounts[i],
                "AllocationPool: staked tokens not meet staked token rate"
            );
            if (user.amount[i] > 0) {
                uint256 pending = (user.amount[i] * accTokenPerShare[i]) /
                    1e12 -
                    user.rewardDebt[i];
                safeTokenTransfer(rewardToken[i], msg.sender, pending);
            }
            lpToken[i].safeTransferFrom(
                address(msg.sender),
                address(this),
                _amounts[i]
            );
            user.amount[i] = user.amount[i] + _amounts[i];
            user.rewardDebt[i] = (user.amount[i] * accTokenPerShare[i]) / 1e12;
        }
        user.joinTime = block.timestamp;
        emit Deposit(msg.sender, _amounts);
    }

    /**
     * @notice Withdraw LP tokens from contract.
     * @param _amounts amounts of token user stake into pool
     */
    function withdraw(uint256[] memory _amounts) external whenNotPaused {
        UserInfo storage user = userInfo[msg.sender];
        if(lockDuration > 0) {
            require(
                block.timestamp >= user.joinTime + lockDuration,
                "AllocationStakingPool: still locked"
            );
        }
        updatePool();
        if (user.amount.length == 0) {
            user.amount = new uint256[](lpToken.length);
            user.rewardDebt = new uint256[](lpToken.length);
        }
        for (uint256 i = 0; i < lpToken.length; i++) {
            require(
                user.amount[i] >= _amounts[i],
                "AllocationPool: withdraw not good"
            );
            uint256 pending = (user.amount[i] * accTokenPerShare[i]) /
                1e12 -
                user.rewardDebt[i];
            safeTokenTransfer(rewardToken[i], msg.sender, pending);
            user.amount[i] = user.amount[i] - _amounts[i];
            user.rewardDebt[i] = (user.amount[i] * accTokenPerShare[i]) / 1e12;
            lpToken[i].safeTransfer(address(msg.sender), _amounts[i]);
        }
        emit Withdraw(msg.sender, _amounts);
    }

    /**
     * @notice Withdraw without caring about rewards. EMERGENCY ONLY.
     */
    function emergencyWithdraw() external whenNotPaused {
        UserInfo storage user = userInfo[msg.sender];
        if (user.amount.length == 0) return;
        for (uint256 i = 0; i < lpToken.length; i++) {
            lpToken[i].safeTransfer(address(msg.sender), user.amount[i]);
            user.amount[i] = 0;
            user.rewardDebt[i] = 0;
        }

        emit EmergencyWithdraw(msg.sender, user.amount);
    }

    /**
     * @notice Safe token transfer function, just in case if rounding error causes pool to not have enough TOKENs.
     */
    function safeTokenTransfer(
        IERC20 token,
        address _to,
        uint256 _amount
    ) internal {
        uint256 tokenBal = token.balanceOf(address(this));
        if (_amount > tokenBal) {
            token.transfer(_to, tokenBal);
        } else {
            token.transfer(_to, _amount);
        }
    }

    function _getDecimals(address _token) internal view returns (uint8) {
        uint8 _decimals = _callOptionalReturn(
            IERC20Metadata(_token),
            abi.encodeWithSelector(IERC20Metadata(_token).decimals.selector)
        );
        require(_decimals > 0, "AllocationPool: invalid decimals");
        return _decimals;
    }

    function _callOptionalReturn(IERC20 token, bytes memory data)
        private
        view
        returns (uint8)
    {
        uint8 decimals = 0;
        bytes memory returndata = address(token).functionStaticCall(
            data,
            "AllocationPool: not ERC20"
        );
        if (returndata.length > 0) {
            decimals = abi.decode(returndata, (uint8));
        }

        return decimals;
    }
}
