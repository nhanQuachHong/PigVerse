// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @notice Owner-only controls; application Admin membership grants no rights.
abstract contract GenesisMintControls is Ownable2Step, Pausable {
    /// @notice Required native currency payment, in wei.
    uint256 public mintPrice;

    error IncorrectMintPayment(uint256 expected, uint256 received);
    error OwnershipRenunciationDisabled();
    event MintPriceChanged(uint256 previousPrice, uint256 newPrice);

    constructor(address initialOwner, uint256 initialPrice) Ownable(initialOwner) {
        mintPrice = initialPrice;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setMintPrice(uint256 newPrice) external onlyOwner {
        uint256 previousPrice = mintPrice;
        mintPrice = newPrice;
        emit MintPriceChanged(previousPrice, newPrice);
    }

    // Preserve an owner capable of unpausing; transfer requires acceptance.
    function renounceOwnership() public view override onlyOwner {
        revert OwnershipRenunciationDisabled();
    }

    function _requireMintPayment() internal view {
        _requireNotPaused();
        if (msg.value != mintPrice) {
            revert IncorrectMintPayment(mintPrice, msg.value);
        }
    }
}
