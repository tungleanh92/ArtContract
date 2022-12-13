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

    constructor(string memory _name, string memory _symbol)
        ERC721(_name, _symbol)
    {
        setAdmin(msg.sender);
    }

    function setAdmin(address _admin) public onlyOwner {
        admin = _admin;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "No permission");
        _;
    }

    function mint(address _owner, uint256 _mintAmount)
        external
        onlyAdmin
        returns (uint256)
    {
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
    function burn(uint256[] memory _tokenIds, address _owner)
        external
        virtual
        onlyAdmin
    {
        for (uint256 i = 0; i < _tokenIds.length; ++i) {
            uint256 _tokenId = _tokenIds[i];
            address owner = _owners[_tokenId];
            require(_owner == owner, "ERC721Burnable: caller is not owner");
            _burn(_tokenId);
        }
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return "";
    }
}