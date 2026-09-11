// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {GenesisNFTCore} from "../GenesisNFTCore.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

// Test-only: this deliberately exposes internal mint/burn to exercise guards.
contract GenesisNFTCoreHarness is GenesisNFTCore {
    function mint(address recipient, uint256 tokenId, string calldata uri) external {
        _mintGenesis(recipient, tokenId, uri);
    }

    function burn(uint256 tokenId) external {
        _burn(tokenId);
    }
}

contract GenesisReceiverProbe is IERC721Receiver {
    bool public duplicateRejected;
    string public observedURI;
    uint256 public observedSupply;

    function onERC721Received(address, address, uint256 tokenId, bytes calldata)
        external returns (bytes4)
    {
        GenesisNFTCoreHarness core = GenesisNFTCoreHarness(msg.sender);
        observedURI = core.tokenURI(tokenId);
        observedSupply = core.totalSupply();
        try core.mint(address(this), tokenId, "replacement") {
            revert("duplicate unexpectedly succeeded");
        } catch {
            duplicateRejected = true;
        }
        return IERC721Receiver.onERC721Received.selector;
    }
}
