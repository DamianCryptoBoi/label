const { ethers, upgrades } = require("hardhat");

const PROXY = "0x3aE076721701d9d0a592767c39F5c08a74eE4E35";

async function main() {
    const LabelCollection = await ethers.getContractFactory("LabelHeadset");
    await upgrades.forceImport(PROXY, LabelCollection, { kind: "uups" });

    console.log("Upgrading...");
    await upgrades.upgradeProxy(PROXY, LabelCollection);
    console.log("Upgraded successfully");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
