const { ethers, upgrades } = require("hardhat");

const PROXY = "0xa85763E451fE2573C9174582BDb0ECEf36702B3D";

async function main() {
    const LabelCollection = await ethers.getContractFactory("LabelArtWork721");
    // await upgrades.forceImport(PROXY, LabelCollection, { kind: "uups" });

    console.log("Upgrading...");
    await upgrades.upgradeProxy(PROXY, LabelCollection);
    console.log("Upgraded successfully");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
