// const { expect } = require("chai");
// const { ethers, upgrades } = require("hardhat");

// describe("Collection", function () {
//   let owner, Label721, Label1155, label721, label1155;
//   beforeEach(async () => {
//     [owner, addr1, addr2] = await ethers.getSigners();

//     Label1155 = await ethers.getContractFactory("Label1155");
//     label1155 = await upgrades.deployProxy(Label1155, [], { kind: "uups" });
//     await label1155.deployed();
//   });

//   it("Should return the owner", async function () {
//     expect(await label1155.owner()).to.equal(owner.address);
//   });

//   it("Mint", async function () {
//     await label1155.mint(
//       [owner.address],
//       [1],
//       1,
//       "/test",
//       [addr1.address, addr2.address],
//       [300, 200],
//       "0x"
//     );

//     [creators, royalties] = await label1155.getCreditsInfo(1);
//     expect(creators[0]).to.be.equal(addr1.address);
//     expect(creators[1]).to.be.equal(addr2.address);
//     expect(royalties[0].toNumber()).to.be.equal(300);
//     expect(royalties[1].toNumber()).to.be.equal(200);
//   });
// });
