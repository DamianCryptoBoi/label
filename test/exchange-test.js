const { expect, assert } = require("chai");
const { ethers, upgrades, network } = require("hardhat");
const chainId = network.config.chainId;

describe("Exchange", function () {
  let owner,
    Label721,
    Label1155,
    label721,
    label1155,
    Registry,
    registry,
    Exchange,
    exchange;
  beforeEach(async () => {
    [owner] = await ethers.getSigners();

    Label721 = await ethers.getContractFactory("Label721");
    label721 = await upgrades.deployProxy(Label721, [], { kind: "uups" });
    await label721.deployed();

    Label1155 = await ethers.getContractFactory("Label1155");
    label1155 = await upgrades.deployProxy(Label1155, [], { kind: "uups" });
    await label1155.deployed();

    Registry = await ethers.getContractFactory("LabelRegistry");
    registry = await Registry.deploy();
    await registry.deployed();

    Exchange = await ethers.getContractFactory("LabelExchange");
    exchange = await Exchange.deploy(chainId, [registry.address], []);
    await exchange.deployed();
  });

  it("allows proxy transfer approval", async function () {
    await registry.registerProxy();
    const proxy = await registry.proxies(owner.address);
    assert.isTrue(proxy.length > 0, "No proxy address");
    assert.isOk(await label721.setApprovalForAll(proxy, true));
    assert.isOk(await label1155.setApprovalForAll(proxy, true));
  });
});
