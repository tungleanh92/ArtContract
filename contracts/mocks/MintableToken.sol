// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract MintableToken is ERC20Upgradeable {
    mapping(address => uint256) public blacklist;
    address public owner;
    address public minter;

    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY OWNER");
        _;
    }

    modifier onlyMinter() {
        require(msg.sender == minter, "ONLY MINTER");
        _;
    }

    event OwnerChanged(address oldOwner, address newOwner);

    event MinterChanged(address oldMinter, address newMinter);

    constructor() ERC20Upgradeable() {}

    function initialize(
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply
    ) public initializer {
        __ERC20_init(_name, _symbol);
        _mint(msg.sender, _totalSupply);
        owner = msg.sender;
        minter = msg.sender;
    }

    function mint(address user, uint256 amount) public onlyMinter {
        _mint(user, amount);
    }

    function burn(address account, uint256 amount) public {
        require(
            msg.sender == account,
            "SENDER ADDRESS IS NOT MATCH ACCOUNT ADDRESS"
        );
        _burn(account, amount);
    }

    function changeMinter(address newMinter) public onlyMinter {
        emit MinterChanged(minter, newMinter);
        minter = newMinter;
    }

    function changeOwner(address newOwner) public onlyOwner {
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    function addBlackList(address[] memory listAddress) public onlyOwner {
        _changeStatus(listAddress, 1);
    }

    function removeBlackList(address[] memory listAddress) public onlyOwner {
        _changeStatus(listAddress, 0);
    }

    function _changeStatus(address[] memory _listAddress, uint256 _status)
        private
    {
        for (uint256 i = 0; i < _listAddress.length; i++) {
            blacklist[_listAddress[i]] = _status;
        }
    }

    function _beforeTokenTransfer(
        address from
    ) internal view {
        require(blacklist[from] == 0, "BLACKLIST CANNOT TRANSFER");
    }

    function getOwner() public view returns (address) {
        return owner;
    }

    function getMinter() public view returns (address) {
        return minter;
    }

    function isBlacklisted(address user) public view returns (bool) {
        return blacklist[user] == 1;
    }
}