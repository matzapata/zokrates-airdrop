// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "./Interfaces/IVerifier.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ZkAirdrop is ERC20 {
    uint256 immutable TOKEN_AMOUNT_PER_AIRDROP;

    bytes32 immutable root;
    IVerifier immutable verifier;
    mapping(bytes32 => bool) public nullifierHashes;
    mapping(bytes32 => bool) public commitments;

    event Claimed(bytes32 nullifierHash);

    constructor(
        IVerifier _verifier,
        bytes32 _root,
        uint256 _claimAmount,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) {
        verifier = _verifier;
        root = _root;

        TOKEN_AMOUNT_PER_AIRDROP =
            _claimAmount *
            10 ** uint256(decimals());
    }

    function claim(Proof memory _proof, bytes32 _nullifierHash) external {
        require(nullifierHashes[_nullifierHash] == false, "Already claimed");
        require(
            verifier.verifyTx(_proof, [uint256(root), uint256(_nullifierHash)]),
            "Invalid withdraw proof"
        );

        nullifierHashes[_nullifierHash] = true;

        _mint(msg.sender, TOKEN_AMOUNT_PER_AIRDROP);

        emit Claimed(_nullifierHash);
    }

    function hasClaimed(bytes32 _nullifierHash) public view returns (bool) {
        return nullifierHashes[_nullifierHash];
    }
}
