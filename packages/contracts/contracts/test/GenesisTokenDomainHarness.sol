// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {GenesisTokenDomain} from "../GenesisTokenDomain.sol";

/// @dev Test-only exposure of the production token-domain guard.
contract GenesisTokenDomainHarness is GenesisTokenDomain {
    function validate(uint256 tokenId) external pure {
        _requireGenesisTokenId(tokenId);
    }
}
