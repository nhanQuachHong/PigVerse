// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

/// @title Pigverse Genesis token domain
/// @author Pigverse
/// @notice Fixed Genesis identity shared by contract operations (BR-001).
abstract contract GenesisTokenDomain {
    /// @notice Maximum and permanent number of Genesis token identities.
    uint256 public constant MAX_SUPPLY = 10;

    error InvalidGenesisTokenId(uint256 tokenId);

    function _requireGenesisTokenId(uint256 tokenId) internal pure {
        if (tokenId == 0 || tokenId > MAX_SUPPLY) {
            revert InvalidGenesisTokenId(tokenId);
        }
    }
}
