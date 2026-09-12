// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {PigverseGenesis} from "../PigverseGenesis.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract MintReceiverProbe is IERC721Receiver {
    PigverseGenesis public immutable genesis;
    bool public reject;
    bool public reentryBlocked;

    constructor(PigverseGenesis target) { genesis = target; }

    function attempt(bool shouldReject) external payable {
        reject = shouldReject;
        genesis.mint{value: msg.value}(1, 1);
    }

    function onERC721Received(address, address, uint256, bytes calldata)
        external returns (bytes4)
    {
        require(msg.sender == address(genesis));
        if (reject) revert("receiver rejection");
        try genesis.mint(2, 1) {
            revert("nested mint unexpectedly succeeded");
        } catch (bytes memory reason) {
            require(bytes4(reason) == bytes4(keccak256("ReentrancyGuardReentrantCall()")));
            reentryBlocked = true;
        }
        return IERC721Receiver.onERC721Received.selector;
    }
}
