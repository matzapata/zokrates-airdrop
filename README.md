
# Zokrates Airdrop

Anonymous airdrop using zero knowledge proof with zokrates.

## Commands

- `make compile` -> Compiles circuits and contracts
- `make compile-circuits` -> Compile circuits and generate fixture for tests
- `make compile-contracts` -> Compile contracts
- `make tests` -> runs tests

## Details

Circuits in `contracts/circuits`.
Script in `scripts/compile-circuits.ts` uses `zokrates-js` to compile on the circuits, generate the verifier contract and a fixture proof for the tests.

## How it works

1. Users provide commitment without revealing their onchain addresses. 
2. Admin collects all commitments and assembles a merkle tree.
3. Admin computes the merkle root and deploys the contract with it.
4. Users take public merkle tree and use it to create proofs.
5. Users claim airdrop without revealing commitment associated. 
