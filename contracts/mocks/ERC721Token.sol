// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract ERC721Token is ERC721Enumerable, Ownable {
    using Strings for uint256;

    // Mapping from token ID to owner address
    mapping(uint256 => address) private _owners;
    mapping(address => bool) public whitelisted;
    address public admin;
    uint256 public startTime;
    uint256 public endTime;
    mapping(uint256 => uint256) public classes;

    constructor(
        string memory _name,
        string memory _symbol
    ) ERC721(_name, _symbol) {
        setAdmin(0xE06b2e5dE69cbB8dbC9b8e22BFd9E8f8A19D64c1);
    }

    function setAdmin(address _admin) public onlyOwner {
        admin = _admin;
    }

    function mint(
        address _owner,
        uint256 _mintAmount
    ) external returns (uint256) {
        // require(startTime <= block.timestamp, "start_time <= timestamp");
        // require(
        //     (endTime >= block.timestamp && whitelisted[_owner]) || (endTime < block.timestamp),
        //     "user not whitelisted or not public sale"
        // );
        uint256 supply = totalSupply();

        for (uint256 i = 1; i <= _mintAmount; i++) {
            _owners[supply + i] = _owner;
            _safeMint(_owner, supply + i);
        }
        return supply + 1;
    }

    /**
     * @dev Burns `tokenId`. See {ERC721-_burn}.
     *
     * Requirements:
     *
     * - The caller must own `tokenId` or be an approved operator.
     */
    function burn(uint256[] memory _tokenIds, address _owner) external virtual {
        for (uint256 i = 0; i < _tokenIds.length; ++i) {
            uint256 _tokenId = _tokenIds[i];
            address owner = _owners[_tokenId];
            require(_owner == owner, "ERC721Burnable: caller is not owner");
            _burn(_tokenId);
        }
    }

    function whitelistUser(address[] memory _users) public onlyOwner {
        for (uint256 i = 0; i < _users.length; ++i) {
            address user = _users[i];
            whitelisted[user] = true;
        }
    }

    function removeWhitelistUser(address[] memory _users) public onlyOwner {
        for (uint256 i = 0; i < _users.length; ++i) {
            address user = _users[i];
            whitelisted[user] = false;
        }
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return "https://efun-public.s3.ap-southeast-1.amazonaws.com/nft-info/";
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, classes[tokenId].toString())) : "";
    }
}
