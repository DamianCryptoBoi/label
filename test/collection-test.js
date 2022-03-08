const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Collection", function () {
  let owner, Label721, Label1155, label721, label1155;
  beforeEach(async () => {
    [owner] = await ethers.getSigners();

    Label721 = await ethers.getContractFactory("Label721");
    label721 = await upgrades.deployProxy(Label721, [], { kind: "uups" });
    await label721.deployed();

    Label1155 = await ethers.getContractFactory("Label1155");
    label1155 = await upgrades.deployProxy(Label1155, [], { kind: "uups" });
    await label1155.deployed();
  });

  it("Should return the owner", async function () {
    expect(await label721.owner()).to.equal(owner.address);
    expect(await label1155.owner()).to.equal(owner.address);
  });
});
