// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {GenesisNFTCore} from "./GenesisNFTCore.sol";
import {GenesisMintControls} from "./GenesisMintControls.sol";

/// @title Pigverse Genesis
/// @author Pigverse
/// @notice Ten fixed 1/1 ERC-721 identities with revision-bound publication.
contract PigverseGenesis is GenesisNFTCore, GenesisMintControls, ReentrancyGuard {
    /// @notice Current mintable IPFS URI for an unminted Genesis identity.
    mapping(uint256 tokenId => string uri) public publishedURI;
    /// @notice Monotonic publication revision used for stale-write protection.
    mapping(uint256 tokenId => uint256 revision) public publicationRevision;

    error TokenNotPublished(uint256 tokenId);
    error PublicationChanged(uint256 expected, uint256 actual);
    error InvalidMetadataURI();
    error WithdrawalFailed();

    /// @notice Emitted after the Owner publishes or unpublishes an identity.
    /// @param tokenId Genesis identity whose publication changed.
    /// @param revision New publication revision.
    /// @param uri New IPFS URI, or an empty string after unpublishing.
    event PublicationUpdated(uint256 indexed tokenId, uint256 revision, string uri);
    /// @notice Emitted after the current Owner receives accumulated proceeds.
    /// @param recipient Current Owner that received the withdrawal.
    /// @param amount Native currency transferred in wei.
    event Withdrawn(address indexed recipient, uint256 amount);

    constructor(address initialOwner, uint256 initialPrice)
        GenesisMintControls(initialOwner, initialPrice) {}

    /// @notice Publishes a verified IPFS package for an unminted identity.
    /// @dev The owner attests the backend verified the complete asset package.
    /// IPFS pinning, backup and nested metadata validation remain backend gates.
    /// @param tokenId Genesis token identity in the range 1 through 10.
    /// @param expectedRevision Current revision selected by the Owner.
    /// @param uri Non-empty IPFS URI for the verified metadata package.
    function publish(uint256 tokenId, uint256 expectedRevision, string calldata uri) external onlyOwner {
        _requireUnminted(tokenId);
        uint256 revision = publicationRevision[tokenId];
        if (expectedRevision != revision) revert PublicationChanged(expectedRevision, revision);
        bytes memory value = bytes(uri);
        if (value.length < 8 || bytes7(value) != bytes7("ipfs://")) revert InvalidMetadataURI();
        publishedURI[tokenId] = uri;
        revision = ++publicationRevision[tokenId];
        emit PublicationUpdated(tokenId, revision, uri);
    }

    /// @notice Removes mint availability from an unminted identity.
    /// @param tokenId Genesis token identity in the range 1 through 10.
    /// @param expectedRevision Current revision selected by the Owner.
    function unpublish(uint256 tokenId, uint256 expectedRevision) external onlyOwner {
        _requireUnminted(tokenId);
        uint256 revision = publicationRevision[tokenId];
        if (expectedRevision != revision) revert PublicationChanged(expectedRevision, revision);
        delete publishedURI[tokenId];
        revision = ++publicationRevision[tokenId];
        emit PublicationUpdated(tokenId, revision, "");
    }

    /// @notice Mints the selected published identity to the caller exactly once.
    /// @param tokenId Genesis token identity in the range 1 through 10.
    /// @param expectedRevision Published revision selected by the collector.
    function mint(uint256 tokenId, uint256 expectedRevision) external payable nonReentrant {
        _requireUnminted(tokenId);
        _requireMintPayment();
        uint256 revision = publicationRevision[tokenId];
        if (expectedRevision != revision) revert PublicationChanged(expectedRevision, revision);
        string memory uri = publishedURI[tokenId];
        if (bytes(uri).length == 0) revert TokenNotPublished(tokenId);
        _mintGenesis(msg.sender, tokenId, uri);
    }

    /// @notice Withdraw to the current owner; no arbitrary recipient parameter.
    function withdraw() external onlyOwner nonReentrant {
        address recipient = owner();
        uint256 amount = address(this).balance;
        (bool success,) = payable(recipient).call{value: amount}("");
        if (!success) revert WithdrawalFailed();
        emit Withdrawn(recipient, amount);
    }

    function _requireUnminted(uint256 tokenId) private view {
        _requireGenesisTokenId(tokenId);
        if (_ownerOf(tokenId) != address(0)) revert GenesisAlreadyMinted(tokenId);
    }
}
