// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract AirdropToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("AirdropToken", "AT") {
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }
}
