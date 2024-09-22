
# Zokrates Airdrop

Anonymous airdrop using zero knowledge proof with zokrates.


## Commands

- `make compile` -> Compiles circuits and contracts
- `make compile-circuits` -> Compile circuits
- `make compile-contracts` -> Compile contracts
- `make tests` -> runs tests
- `make proof` -> Takes `contracts/input.json` to create a proof for the circuit

## Details

Circuits in `contracts/circuits`.
Tests use `zokrates-js` to compile on the fly the circuits and create dynamic proofs leveraging fixtures.

## How it works

1. Users provide commitment without revealing their onchain addresses. 
2. Admin collects all commitments and assembles a merkle tree.
3. Admin computes the merkle root and deploys the contract with it.
4. Users take public merkle tree and use it to create proofs.
5. Users claim airdrop without revealing commitment associated. 
