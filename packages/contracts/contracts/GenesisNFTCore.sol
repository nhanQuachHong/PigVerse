// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {GenesisTokenDomain} from "./GenesisTokenDomain.sol";

/// @notice Immutable Genesis ownership/metadata core; mint authorization belongs
/// to the concrete application contract, not to this abstract component.
abstract contract GenesisNFTCore is ERC721, GenesisTokenDomain {
    mapping(uint256 tokenId => string uri) private _mintedURIs;
    uint256 public totalSupply;

    error GenesisAlreadyMinted(uint256 tokenId);
    error EmptyGenesisMetadata();
    error GenesisBurnForbidden();

    constructor() ERC721("Pigverse Genesis", "PIGVERSE") {}

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _mintedURIs[tokenId];
    }

    function _mintGenesis(address recipient, uint256 tokenId, string memory uri) internal {
        _requireGenesisTokenId(tokenId);
        if (bytes(_mintedURIs[tokenId]).length != 0) revert GenesisAlreadyMinted(tokenId);
        if (bytes(uri).length == 0) revert EmptyGenesisMetadata();

        // Publish all token state before ERC721Receiver executes. A failed
        // receiver rolls back ownership, URI and supply together.
        _mintedURIs[tokenId] = uri;
        totalSupply++;
        _safeMint(recipient, tokenId);
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        _requireGenesisTokenId(tokenId);
        if (to == address(0)) revert GenesisBurnForbidden();
        return super._update(to, tokenId, auth);
    }
}
