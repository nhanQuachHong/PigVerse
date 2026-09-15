// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {GenesisTokenDomain} from "./GenesisTokenDomain.sol";

/// @title Pigverse Genesis NFT core
/// @author Pigverse
/// @notice Immutable Genesis ownership/metadata core; mint authorization belongs
/// to the concrete application contract, not to this abstract component.
abstract contract GenesisNFTCore is ERC721, GenesisTokenDomain {
    mapping(uint256 tokenId => string uri) private _mintedURIs;
    /// @notice Number of Genesis identities minted successfully.
    uint256 public totalSupply;

    error GenesisAlreadyMinted(uint256 tokenId);
    error EmptyGenesisMetadata();
    error GenesisBurnForbidden();
    error GenesisMetadataNotPrepared(uint256 tokenId);

    constructor() ERC721("Pigverse Genesis", "PIGVERSE") {}

    /// @notice Returns the immutable metadata URI captured when a token minted.
    /// @param tokenId Genesis token identity in the range 1 through 10.
    /// @return Metadata URI permanently associated with the minted token.
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
        ++totalSupply;
        _safeMint(recipient, tokenId);
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        _requireGenesisTokenId(tokenId);
        if (to == address(0)) revert GenesisBurnForbidden();
        // Every inherited mint path must carry the metadata established by
        // _mintGenesis; raw ERC721 _mint/_safeMint must not bypass preparation.
        if (_ownerOf(tokenId) == address(0) && bytes(_mintedURIs[tokenId]).length == 0) {
            revert GenesisMetadataNotPrepared(tokenId);
        }
        return super._update(to, tokenId, auth);
    }
}
