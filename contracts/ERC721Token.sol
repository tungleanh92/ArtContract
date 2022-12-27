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

    mapping(uint256 => string[]) public _dynamicUri;

    constructor(string memory _name, string memory _symbol)
        ERC721(_name, _symbol)
    {}

    function mint(address _owner, uint256 _mintAmount, string[] calldata _uri)
        external
        onlyOwner
    {
        uint256 supply = totalSupply();

        for (uint256 i = 1; i <= _mintAmount; ++i) {
            _owners[supply + i] = _owner;
            _safeMint(_owner, supply + i);
            _dynamicUri[supply + i].push(_uri[i]);
        }
    }

    function updateURI(uint256 _tokenId, string calldata _uri) onlyOwner external {
        _dynamicUri[_tokenId].push(_uri);
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
        onlyOwner
    {
        for (uint256 i = 0; i < _tokenIds.length; ++i) {
            uint256 _tokenId = _tokenIds[i];
            address owner = _owners[_tokenId];
            require(_owner == owner, "ERC721Burnable: caller is not owner");
            _burn(_tokenId);
            delete _dynamicUri[_tokenId];
        }
    }

    function tokenURI(uint256 _tokenId) public view virtual override returns (string memory) {
        _requireMinted(_tokenId);
        string[] memory uris = _dynamicUri[_tokenId];
        return uris[uris.length-1];
    }
}

// access control
// dynamic split or combine?
