// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {GenesisMintControls} from "../GenesisMintControls.sol";
import {GenesisNFTCore} from "../GenesisNFTCore.sol";

/// @dev Test-only: public URI input deliberately bypasses publication policy.
contract GenesisMintControlsHarness is GenesisMintControls, GenesisNFTCore {
    constructor(address initialOwner, uint256 initialPrice)
        GenesisMintControls(initialOwner, initialPrice) {}

    function mint(uint256 tokenId, string calldata uri) external payable {
        _requireMintPayment();
        _mintGenesis(msg.sender, tokenId, uri);
    }
}
