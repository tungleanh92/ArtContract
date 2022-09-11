// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract FixedToken is ERC20Upgradeable {
    mapping(address => uint256) public blacklist;
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY OWNER");
        _;
    }

    event OwnerChanged(address oldOwner, address newOwner);

    function initialize(
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply
    ) public initializer {
        owner = msg.sender;
        _mint(msg.sender, _totalSupply);
        __ERC20_init(_name, _symbol);
    }

    function burn(address account, uint256 amount) public {
        require(
            msg.sender == account,
            "SENDER ADDRESS IS NOT MATCH ACCOUNT ADDRESS"
        );
        _burn(account, amount);
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
        address from,
        address to,
        uint256 amount
    ) internal override {
        require(blacklist[from] == 0, "BLACKLIST CANNOT TRANSFER");
    }

    function getOwner() public view returns (address) {
        return owner;
    }

    function isBlacklisted(address user) public view returns (bool) {
        return blacklist[user] == 1;
    }
}