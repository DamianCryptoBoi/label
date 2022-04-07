const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

const { getPredicateId } = require("./common/util");

describe("Collection", function () {
    let owner, Label1155, label1155;
    beforeEach(async () => {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();

        Registry = await ethers.getContractFactory("WyvernRegistry");
        registry = await Registry.deploy();
        await registry.deployed();

        Label1155 = await ethers.getContractFactory("LabelCollection");
        label1155 = await upgrades.deployProxy(
            Label1155,
            ["/test", registry.address],
            {
                kind: "uups",
            }
        );
        await label1155.deployed();
    });

    it("Should return the owner", async function () {
        expect(await label1155.owner()).to.equal(owner.address);
    });

    it("Mint", async function () {
        const predicatedId = getPredicateId(owner.address, 0, 100);

        await label1155.mint(
            [addr1.address, addr2.address, owner.address], // acount 
            [10, 20, 30], // amount
            100,
            predicatedId,
            "/abc",
            [owner.address, addr2.address, addr3.address],
            [6000, 2000, 2000],
            500,
            "0x"
        );
        await expect(label1155.mint(
            [addr1.address, addr2.address, owner.address], // acount 
            [10, 20, 30], // amount
            100,
            predicatedId,
            "/abc",
            [owner.address, addr2.address, addr3.address],
            [6000, 2000, 2000],
            500,
            "0x"
        )).to.be.revertedWith( "Token existed");
        expect(
            parseInt(await label1155.balanceOf(owner.address, predicatedId))
        ).to.be.equal(70);
        expect(
            parseInt(await label1155.balanceOf(addr1.address, predicatedId))
        ).to.be.equal(10);
        expect(
            parseInt(await label1155.balanceOf(addr2.address, predicatedId))
        ).to.be.equal(20);

        [creators, royalties, totalroyalties] = await label1155.getCreditsInfo(predicatedId);

        expect(creators[0]).to.be.equal(owner.address);
        expect(royalties[0].toNumber()).to.be.equal(6000);
        expect(royalties[1].toNumber()).to.be.equal(2000);
        expect(royalties[2].toNumber()).to.be.equal(2000);
        expect(totalroyalties.toNumber()).to.be.equal(500);
        expect(await label1155.tokenUri(predicatedId)).to.be.equal("/test/abc");

        expect(await label1155.getTokenIndexById(predicatedId)).to.be.equal(
            "0"
        );

        expect(await label1155.getTokenMaxSupplyById(predicatedId)).to.be.equal(
            "100"
        );
    });
    it("Mint 2", async function () {
        const predicatedId = getPredicateId(owner.address, 0, 100);
        await expect(label1155.mint(
            [addr1.address, addr2.address, owner.address], // acount 
            [10, 20], // amount
            100,
            predicatedId,
            "/abc",
            [owner.address, addr2.address, addr3.address],
            [6000, 2000, 2000],
            500,
            "0x"
        )).to.be.revertedWith("Invalid accounts");
        await expect(label1155.mint(
            [addr1.address, addr2.address, owner.address], // acount 
            [10, 20, 30], // amount
            100,
            1,
            "/abc",
            [addr1.address, addr2.address, addr3.address],
            [6000, 2000, 2000],
            500,
            "0x"
        )).to.be.revertedWith( "Invalid ID and creator");
        await expect(label1155.mint(
            [addr1.address, addr2.address, owner.address], // acount 
            [10, 20,30], // amount
            100,
            predicatedId,
            "/abc",
            [owner.address],
            [6000, 2000, 2000],
            500,
            "0x"
        )).to.be.revertedWith("Invalid creators");
        await expect(label1155.connect(addr2).mint(
            [addr1.address, addr2.address, owner.address], // acount 
            [10, 20,30], // amount
            100,
            predicatedId,
            "/abc",
            [owner.address],
            [6000, 2000, 2000],
            500,
            "0x"
        )).to.be.revertedWith( "Not minter");
    });
});
