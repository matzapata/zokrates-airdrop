// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "./Interfaces/IVerifier.sol";
import "./Interfaces/IERC20.sol";

contract ZkAirdrop {
    IERC20 immutable token;
    uint256 immutable claimAmount;

    bytes32 immutable root;
    IVerifier immutable verifier;
    mapping(bytes32 => bool) public nullifierHashes;
    mapping(bytes32 => bool) public commitments;

    event Claimed(bytes32 nullifierHash);

    constructor(
        IVerifier _verifier,
        bytes32 _root,
        IERC20 _token,
        uint256 _claimAmount
    ) {
        verifier = _verifier;
        token = IERC20(_token);
        root = _root;
        claimAmount = _claimAmount;
    }

    function claim(
        Proof memory _proof,
        bytes32 _nullifierHash
    ) external {
        require(nullifierHashes[_nullifierHash] == false, "Already claimed");
        require(
            verifier.verifyTx(_proof, [uint256(root), uint256(_nullifierHash)]),
            "Invalid withdraw proof"
        );

        nullifierHashes[_nullifierHash] = true;

        token.transfer(msg.sender, claimAmount);

        emit Claimed(_nullifierHash);
    }

    function hasClaimed(bytes32 _nullifierHash) public view returns (bool) {
        return nullifierHashes[_nullifierHash];
    }
}
