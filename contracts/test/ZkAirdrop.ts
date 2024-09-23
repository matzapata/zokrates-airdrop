import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { buildMimcSponge } from "circomlibjs";
import { expect } from "chai"
import fs from "fs"
import path from "path"

const CLAIM_AMOUNT = 100;

describe("ZkAirdrop", function () {

    async function deployFixture() {
        const signers = await hre.ethers.getSigners()
        const owner = signers[0]
        const claimer = signers[1]

        // compile circuits and deploy verifier
        const Verifier = await hre.ethers.getContractFactory("Verifier");
        const verifier = await Verifier.deploy()

        // crete claim trees 
        const mimcsponge = await buildMimcSponge();

        // deploy ZkAirdrop
        const { root } = loadProofFixture()
        const ZkAirdrop = await hre.ethers.getContractFactory("ZkAirdrop");
        const zkAirdrop = await ZkAirdrop.deploy(await verifier.getAddress(), toHex(root), CLAIM_AMOUNT, "ZK Airdrop", "ZKA");

        return { zkAirdrop, mimcsponge, verifier, owner, claimer };
    }

    describe("#claim", () => {
        it("should work", async () => {
            const { zkAirdrop, claimer } = await loadFixture(deployFixture);
            const { proof, nullifierHash } = loadProofFixture()

            const balanceBefore = await zkAirdrop.balanceOf(claimer)

            await expect(zkAirdrop.connect(claimer).claim(proof.proof as any, toHex(nullifierHash)))
                .not.to.be.reverted

            const balanceAfter = await zkAirdrop.balanceOf(claimer)

            expect(balanceAfter - balanceBefore == BigInt(CLAIM_AMOUNT * 10 ** 18)).to.be.true
        })

        it('should prevent double claim', async () => {
            const { zkAirdrop } = await loadFixture(deployFixture);
            const { proof, nullifierHash } = loadProofFixture()

            await expect(zkAirdrop.claim(proof.proof as any, toHex(nullifierHash)))
                .not.to.be.reverted

            await expect(zkAirdrop.claim(proof.proof as any, toHex(nullifierHash)))
                .to.be.revertedWith("Already claimed")
        })

        it('should reject with tampered public inputs', async () => {
            const { zkAirdrop } = await loadFixture(deployFixture);
            const { proof } = loadProofFixture()

            // make the root differ from what proof holds
            const corruptedNullifierHash = toHex(1)

            await expect(zkAirdrop.claim(proof.proof as any, corruptedNullifierHash))
                .to.be.revertedWith("Invalid withdraw proof")
        })
    })

    describe('#hasClaimed', () => {
        it('should work', async () => {
            const { zkAirdrop } = await loadFixture(deployFixture);
            const { proof, nullifierHash } = loadProofFixture()

            expect(await zkAirdrop.hasClaimed(toHex(nullifierHash))).to.be.false


            await expect(zkAirdrop.claim(proof.proof as any, toHex(nullifierHash)))
                .not.to.be.reverted

            expect(await zkAirdrop.hasClaimed(toHex(nullifierHash))).to.be.true
        })
    })
});

const toHex = (number: string | number | bigint, length = 32) =>
    '0x' +
    BigInt(number)
        .toString(16)
        .padStart(length * 2, '0')

function loadProofFixture() {
    const fixture = fs.readFileSync(path.join(__dirname, "./fixtures/proof.json"))
    return JSON.parse(fixture.toString()) as {
        "root": string;
        "commitment": string;
        "nullifierHash": string;
        "secret": string;
        "nullifier": string;
        "pathElements": string[];
        "pathDirection": boolean[],
        "proof": {
            "scheme": string;
            "curve": string;
            "proof": {
                "a": string[];
                "b": string[][];
                "c": string[];
            },
            "inputs": string[];
        }
    }
}