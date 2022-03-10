/* eslint-disable no-unused-vars */
const { expect, assert } = require("chai");
const { ethers, upgrades } = require("hardhat");
const {
  MAX_UINT256,
  ZERO_BYTES32,
  NULL_SIG,
  CHAIN_ID,
  signOrder,
} = require("./utils/common.js");

const chainId = CHAIN_ID;
let owner,
  addr1,
  addr2,
  Label721,
  Label1155,
  label721,
  label1155,
  Registry,
  registry,
  Exchange,
  exchange,
  LabelToken,
  labelToken,
  Atomicizer,
  atomicizer,
  Static,
  static;

describe("Exchange", function () {
  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();

    Label721 = await ethers.getContractFactory("Label721");
    label721 = await upgrades.deployProxy(Label721, [], { kind: "uups" });
    await label721.deployed();

    Label1155 = await ethers.getContractFactory("Label1155");
    label1155 = await upgrades.deployProxy(Label1155, [], { kind: "uups" });
    await label1155.deployed();

    LabelToken = await ethers.getContractFactory("MockLabel");
    labelToken = await LabelToken.deploy();
    await labelToken.deployed();

    Registry = await ethers.getContractFactory("LabelRegistry");
    registry = await Registry.deploy();
    await registry.deployed();

    Exchange = await ethers.getContractFactory("LabelExchange");
    exchange = await Exchange.deploy(chainId, [registry.address], []);
    await exchange.deployed();

    Atomicizer = await ethers.getContractFactory("LabelAtomicizer");
    atomicizer = await Atomicizer.deploy();
    await atomicizer.deployed();

    Static = await ethers.getContractFactory("LabelStatic");
    static = await Static.deploy(atomicizer.address);
    await static.deployed();

    // settings
    await registry.grantInitialAuthentication(exchange.address);
  });

  it("allows proxy transfer approval", async function () {
    await registry.registerProxy();
    const proxy = await registry.proxies(owner.address);
    assert.isTrue(proxy.length > 0, "No proxy address");
    assert.isOk(await label721.setApprovalForAll(proxy, true));
    assert.isOk(await label1155.setApprovalForAll(proxy, true));
  });

  // it("pre-mint erc721 <=> erc20", async function () {
  //   // SALE CONFIG
  //   const price = ethers.utils.parseUnits("1000");
  //   const tokenId = 1;

  //   // registry & approval
  //   await registry.connect(addr1).registerProxy();
  //   const proxy1 = await registry.proxies(addr1.address);
  //   await label721.setApprovalForAll(proxy1, true);
  //   await labelToken.connect(addr1).approve(proxy1, MAX_UINT256);

  //   await registry.connect(addr2).registerProxy();
  //   const proxy2 = await registry.proxies(addr2.address);
  //   await label721.setApprovalForAll(proxy2, true);
  //   await labelToken.connect(addr2).approve(proxy2, MAX_UINT256);

  //   // userA have the nft
  //   await label721.mint(addr1.address, tokenId, "", [owner.address], [250]);
  //   expect(await label721.ownerOf(1)).to.equal(addr1.address);

  //   // userB have the payment token
  //   await labelToken.mint(addr2.address, price);
  //   expect(await labelToken.balanceOf(addr2.address)).to.equal(
  //     ethers.utils.parseUnits("1000")
  //   );

  //   // userA create sale order

  //   const selector1 = ethers.utils.FunctionFragment.from(
  //     "splitAddOne(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
  //   );

  //   const selector1A = ethers.utils.FunctionFragment.from(
  //     "sequenceExact(bytes,address[7],uint8,uint256[6],bytes)"
  //   );

  //   const selector1B = selector1A;

  //   const edSelector1 = ethers.utils.FunctionFragment.from(
  //     "transfer721Exact(bytes,address[7],uint8,uint256[6],bytes)"
  //   );

  //   const edParams1 = ethers.utils.defaultAbiCoder.encode(
  //     ["address", "uint256"],
  //     [label721.address, tokenId]
  //   );

  //   const extradata1A = ethers.utils.defaultAbiCoder.encode(
  //     ["address[]", "uint256[]", "bytes4[]", "bytes"],
  //     [[static.address], [(edParams1.length - 2) / 2], [edSelector1], edParams1]
  //   );

  //   const edSelector2 = ethers.utils.FunctionFragment.from(
  //     "transferERC20Exact(bytes,address[7],uint8,uint256[6],bytes)"
  //   );

  //   const edParams2 = ethers.utils.defaultAbiCoder.encode(
  //     ["address", "uint256"],
  //     [labelToken.address, price]
  //   );

  //   const extradata1B = ethers.utils.defaultAbiCoder.encode(
  //     ["address[]", "uint256[]", "bytes4[]", "bytes"],
  //     [[static.address], [(edParams2.length - 2) / 2], [edSelector2], edParams2]
  //   );

  //   const params1A = ethers.utils.defaultAbiCoder.encode(
  //     ["address[2]", "bytes4[2]", "bytes", "bytes"],
  //     [
  //       [static.address, static.address],
  //       [selector1A, selector1B],
  //       extradata1A,
  //       extradata1B,
  //     ]
  //   );

  //   const extradata1 = params1A;

  //   const order1 = {
  //     registry: registry.address,
  //     maker: addr1.address,
  //     staticTarget: static.address,
  //     staticSelector: selector1,
  //     staticExtradata: extradata1,
  //     maximumFill: "1",
  //     listingTime: "0",
  //     expirationTime: "10000000000",
  //     salt: "1",
  //   };

  //   const sig1 = await signOrder(addr1, exchange.address, order1);

  //   const firstERC721Call = label721.interface.functions.encode.transferFrom(
  //     addr1,
  //     addr2,
  //     tokenId
  //   );

  //   const firstData = atomicizer.interface.functions.encode.atomicize(
  //     [label721.address],
  //     [0],
  //     [(firstERC721Call.length - 2) / 2],
  //     firstERC721Call
  //   );

  //   const call1 = {
  //     target: atomicizer.address,
  //     howToCall: 1,
  //     data: firstData,
  //   };

  //   // userB create buy orders

  //   const selector2 = ethers.utils.FunctionFragment.from(
  //     "anyAddOne(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
  //   );
  //   const extradata2 = "0x";

  //   const order2 = {
  //     registry: registry.address,
  //     maker: addr2.address,
  //     staticTarget: static.address,
  //     staticSelector: selector2,
  //     staticExtradata: extradata2,
  //     maximumFill: "1",
  //     listingTime: "0",
  //     expirationTime: "10000000000",
  //     salt: "2",
  //   };

  //   const sig2 = NULL_SIG;

  //   const secondERC20Call = labelToken.interface.functions.encode.transferFrom(
  //     addr2.address,
  //     addr1.address,
  //     price
  //   );

  //   const secondData = atomicizer.interface.functions.encode.atomicize(
  //     [labelToken.address],
  //     [0],
  //     [(secondERC20Call.length - 2) / 2],
  //     secondERC20Call
  //   );

  //   const call2 = {
  //     target: atomicizer.address,
  //     howToCall: 1,
  //     data: secondData,
  //   };

  //   // match order

  //   await exchange
  //     .connect(addr2)
  //     .atomicMatch_(
  //       [
  //         order1.registry,
  //         order1.maker,
  //         order1.staticTarget,
  //         order1.maximumFill,
  //         order1.listingTime,
  //         order1.expirationTime,
  //         order1.salt,
  //         call1.target,
  //         order2.registry,
  //         order2.maker,
  //         order2.staticTarget,
  //         order2.maximumFill,
  //         order2.listingTime,
  //         order2.expirationTime,
  //         order2.salt,
  //         call2.target,
  //       ],
  //       [order1.staticSelector, order2.staticSelector],
  //       order1.staticExtradata,
  //       call1.data,
  //       order2.staticExtradata,
  //       call2.data,
  //       [call1.howToCall, call2.howToCall],
  //       ZERO_BYTES32,
  //       ethers.utils.defaultAbiCoder.encode(
  //         ["bytes", "bytes"],
  //         [
  //           ethers.utils.defaultAbiCoder.encode(
  //             ["uint8", "bytes32", "bytes32"],
  //             [sig1.v, sig1.r, sig1.s]
  //           ) + (sig1.suffix || ""),
  //           ethers.utils.defaultAbiCoder.encode(
  //             ["uint8", "bytes32", "bytes32"],
  //             [sig2.v, sig2.r, sig2.s]
  //           ) + (sig2.suffix || ""),
  //         ]
  //       ),
  //       "0x"
  //     );
  // });
});
