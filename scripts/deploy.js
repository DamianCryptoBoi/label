const { ethers, upgrades, network } = require("hardhat");

const CHAIN_ID = network.config.chainId;

const FEE_RECEIVER = "0x05DEd0baaE58E2D242679463bCfeCdfc7a937644";

async function main() {
    console.log("-----------DEPLOYMENT STARTED-----------");

    [owner] = await ethers.getSigners();

    Registry = await ethers.getContractFactory("WyvernRegistry");
    registry = await Registry.deploy();
    await registry.deployed();
    console.log("WyvernRegistry: " + registry.address);

    Exchange = await ethers.getContractFactory("WyvernExchange");
    exchange = await Exchange.deploy(CHAIN_ID, [registry.address], "0x");
    await exchange.deployed();
    console.log("WyvernExchange: " + exchange.address);

    ERC1155 = await ethers.getContractFactory("LabelCollection");
    erc1155 = await upgrades.deployProxy(ERC1155, ["", registry.address], {
        kind: "uups",
    });
    await erc1155.deployed();

    console.log("LabelCollection: " + erc1155.address);

    ERC721 = await ethers.getContractFactory("LabelCollection721");
    erc721 = await upgrades.deployProxy(ERC721, ["", registry.address], {
        kind: "uups",
    });
    await erc721.deployed();

    console.log("LabelCollection 721: " + erc721.address);

    PFP = await ethers.getContractFactory("LabelPFP");
    pfp = await upgrades.deployProxy(
        PFP,
        ["", 9999, [owner.address], [10000], 200],
        {
            kind: "uups",
        }
    );
    await pfp.deployed();

    console.log("PFP Collection: " + pfp.address);

    Headset = await ethers.getContractFactory("LabelHeadset");
    hs = await upgrades.deployProxy(
        Headset,
        ["", 9999, [owner.address], [10000], 200],
        {
            kind: "uups",
        }
    );
    await hs.deployed();

    console.log("Headset Collection: " + hs.address);

    platformFeeRecipient = FEE_RECEIVER;
    platformFee = 250; // 2.5%

    PaymentManager = await ethers.getContractFactory("PaymentManager");
    payment = await upgrades.deployProxy(
        PaymentManager,
        [
            [erc1155.address, erc721.address, pfp.address, hs.address],
            // [
            //     "0xc03Fe6e09053D1426c45250A2f3Fd3b6E3A50905",
            //     "0xC7B62044875E4b211F4F2D5D1A6d41751A7C046B",
            //     "0x5EBBFc265d14078D4ae6051B531FEDF48a972C7e",
            //     "0x3aE076721701d9d0a592767c39F5c08a74eE4E35",
            // ],
            platformFeeRecipient,
            platformFee,
        ],
        {
            kind: "uups",
        }
    );
    await payment.deployed();

    console.log("PaymentManager: " + payment.address);

    StaticMarket = await ethers.getContractFactory("LabelStaticMarket");
    let statici = await StaticMarket.deploy();
    await statici.deployed();

    console.log("StaticMarket: " + statici.address);

    MM = await ethers.getContractFactory("MatchingMachine");
    mm = await MM.deploy(exchange.address);
    await mm.deployed();

    console.log("Matching machine: " + mm.address);

    console.log("-----------SETTINGS AFTER DEPLOY-----------");

    await registry.grantInitialAuthentication(exchange.address);

    console.log("-----------DONE-----------");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

// WyvernRegistry: 0x6215519f4296cADfaF3DD7f5177C59e892395c37
// WyvernExchange: 0xfB3a9a63e2ca92aBDCdb57f88f61f528bAA640dC
// LabelCollection: 0xc03Fe6e09053D1426c45250A2f3Fd3b6E3A50905
// LabelCollection 721: 0xC7B62044875E4b211F4F2D5D1A6d41751A7C046B
// PFP Collection: 0x5EBBFc265d14078D4ae6051B531FEDF48a972C7e
// Headset Collection: 0x3aE076721701d9d0a592767c39F5c08a74eE4E35
// PaymentManager: 0x8A3871213d2138e8d4bE552e98579A1beEf4152E
// StaticMarket: 0xcFbc0E3c76C93aEF02f4DBd7535d6780D3a7F213
// Matching machine: 0x29133B81F21f1E35eD8A76AAf6d8ACa943beFb21

// PFP Collection: 0x29F3BE5eeC6Cbf38c7adf05e4d92b74d92c64a46
// Headset Collection: 0xe9D869e9BAc05aF214020e9AF67D0b013BbB64A3
