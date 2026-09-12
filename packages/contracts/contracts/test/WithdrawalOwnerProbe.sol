// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {PigverseGenesis} from "../PigverseGenesis.sol";

contract WithdrawalOwnerProbe {
    PigverseGenesis public immutable genesis;
    bool public rejectPayment;
    bool public reentryBlocked;
    uint256 public received;

    constructor() {
        genesis = new PigverseGenesis(address(this), 100);
        genesis.publish(1, "ipfs://fixture/1");
        genesis.publish(2, "ipfs://fixture/2");
    }

    function configure(bool reject) external {
        rejectPayment = reject;
    }

    function withdraw() external {
        genesis.withdraw();
    }

    receive() external payable {
        if (rejectPayment) revert("recipient rejected payment");
        received += msg.value;
        try genesis.withdraw() {
            revert("reentry unexpectedly succeeded");
        } catch (bytes memory reason) {
            require(bytes4(reason) == bytes4(keccak256("ReentrancyGuardReentrantCall()")));
            reentryBlocked = true;
        }
    }
}
