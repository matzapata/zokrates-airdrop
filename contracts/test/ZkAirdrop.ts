import hre, { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { buildMimcSponge } from "circomlibjs";
import { abi as ERC20_ABI, bytecode as ERC20_BYTECODE } from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { expect } from "chai"
import { FixedMerkleTree } from "../utils/fixed-merkle-tree";
import { generateCommitment } from "../utils/commitment";
import { buildVerifier } from "../utils/verifier";

const SEED = "mimcsponge";
const TREE_LEVELS = 6;
const CLAIM_AMOUNT = 100;
const ERC20_SUPPLY = 100000;

describe("ZkAirdrop", function () {

    async function deployFixture() {
        const signers = await hre.ethers.getSigners()
        const owner = signers[0]
        const claimer = signers[1]

        // compile circuits and deploy verifier
        const cVerifier = await buildVerifier()
        const Verifier = new hre.ethers.ContractFactory(cVerifier.abi, cVerifier.bytecode, signers[0])
        const verifier = await Verifier.deploy()

        // deploy erc20
        const Token = await hre.ethers.getContractFactory("AirdropToken");
        const token = await Token.deploy(ERC20_SUPPLY)

        // crete claim trees 
        const mimcsponge = await buildMimcSponge();
        const commitments = [await generateCommitment(), await generateCommitment()];
        const tree = new FixedMerkleTree(TREE_LEVELS, [], buildHashFunction(mimcsponge));
        commitments.forEach((c) => tree.insert(c.commitment))

        // deploy ZkAirdrop
        const ZkAirdrop = await hre.ethers.getContractFactory("ZkAirdrop");
        const zkAirdrop = await ZkAirdrop.deploy(await verifier.getAddress(), toHex(tree.root), await token.getAddress(), CLAIM_AMOUNT);

        // transfer total supply to contract
        await token.connect(owner).transfer(await zkAirdrop.getAddress(), ERC20_SUPPLY)

        // generate proof
        const path = tree.path(commitments[0].commitment)
        const { witness } = cVerifier.provider.computeWitness(cVerifier.circuit, [
            tree.root.toString(),
            commitments[0].nullifierHash.toString(),
            commitments[0].secret.toString(),
            commitments[0].nullifier.toString(),
            path.pathElements,
            path.pathDirection
        ]);
        const proof = cVerifier.provider.generateProof(
            cVerifier.circuit.program,
            witness,
            cVerifier.keypair.pk
        );

        return { zkAirdrop, mimcsponge, cVerifier, verifier, owner, tree, token, commitments, claimer, proof };
    }

    describe("#circuit", () => {
        it("Should verify transaction", async () => {
            const { cVerifier, proof } = await loadFixture(deployFixture);

            // verify off-chain
            const isVerified = cVerifier.provider.verify(cVerifier.keypair.vk, proof);
            expect(isVerified).to.be.true;
        })
    })

    describe("#claim", () => {
        it("should work", async () => {
            const { zkAirdrop, commitments, token, claimer, proof } = await loadFixture(deployFixture);

            const balanceBefore = await token.balanceOf(claimer)

            await expect(zkAirdrop.connect(claimer).claim(proof.proof, toHex(commitments[0].nullifierHash)))
                .not.to.be.reverted

            const balanceAfter = await token.balanceOf(claimer)

            expect(balanceAfter - balanceBefore == BigInt(CLAIM_AMOUNT)).to.be.true
        })

        it('should prevent double claim', async () => {
            const { zkAirdrop, proof, commitments } = await loadFixture(deployFixture);

            const [{ nullifierHash }] = commitments

            await expect(zkAirdrop.claim(proof.proof, toHex(nullifierHash)))
                .not.to.be.reverted

            await expect(zkAirdrop.claim(proof.proof, toHex(nullifierHash)))
                .to.be.revertedWith("Already claimed")
        })

        it('should reject with tampered public inputs', async () => {
            const { zkAirdrop, proof } = await loadFixture(deployFixture);

            // make the root differ from what proof holds
            const corruptedNullifierHash = toHex(1)

            await expect(zkAirdrop.claim(proof.proof, corruptedNullifierHash))
                .to.be.revertedWith("Invalid withdraw proof")
        })
    })

    describe('#hasClaimed', () => {
        it('should work', async () => {
            const { zkAirdrop, commitments, proof } = await loadFixture(deployFixture);

            // generate commitment
            const [{ nullifierHash }] = commitments

            expect(await zkAirdrop.hasClaimed(toHex(nullifierHash))).to.be.false


            await expect(zkAirdrop.claim(proof.proof, toHex(nullifierHash)))
                .not.to.be.reverted

            expect(await zkAirdrop.hasClaimed(toHex(nullifierHash))).to.be.true
        })
    })
});

function buildHashFunction(mimcsponge: any) {
    return (l: bigint, r: bigint) => BigInt(mimcsponge.F.toString(mimcsponge.multiHash([l, r])))
}

const toHex = (number: string | number | bigint, length = 32) =>
    '0x' +
    BigInt(number)
        .toString(16)
        .padStart(length * 2, '0')

function expectAny() {
    return true
}