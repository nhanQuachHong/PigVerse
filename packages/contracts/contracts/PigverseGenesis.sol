// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {GenesisNFTCore} from "./GenesisNFTCore.sol";
import {GenesisMintControls} from "./GenesisMintControls.sol";

contract PigverseGenesis is GenesisNFTCore, GenesisMintControls, ReentrancyGuard {
    mapping(uint256 tokenId => string uri) public publishedURI;
    mapping(uint256 tokenId => uint256 revision) public publicationRevision;

    error TokenNotPublished(uint256 tokenId);
    error PublicationChanged(uint256 expected, uint256 actual);
    error InvalidMetadataURI();
    error WithdrawalFailed();

    event PublicationUpdated(uint256 indexed tokenId, uint256 revision, string uri);
    event Withdrawn(address indexed recipient, uint256 amount);

    constructor(address initialOwner, uint256 initialPrice)
        GenesisMintControls(initialOwner, initialPrice) {}

    /// @dev The owner attests the backend verified the complete asset package.
    /// IPFS pinning, backup and nested metadata validation remain backend gates.
    function publish(uint256 tokenId, string calldata uri) external onlyOwner {
        _requireUnminted(tokenId);
        bytes memory value = bytes(uri);
        if (value.length <= 7 || bytes7(value) != bytes7("ipfs://")) revert InvalidMetadataURI();
        publishedURI[tokenId] = uri;
        uint256 revision = ++publicationRevision[tokenId];
        emit PublicationUpdated(tokenId, revision, uri);
    }

    function unpublish(uint256 tokenId) external onlyOwner {
        _requireUnminted(tokenId);
        delete publishedURI[tokenId];
        uint256 revision = ++publicationRevision[tokenId];
        emit PublicationUpdated(tokenId, revision, "");
    }

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
