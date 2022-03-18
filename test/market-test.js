// /* global artifacts:false, it:false, contract:false, assert:false */

// const WyvernAtomicizer = artifacts.require("WyvernAtomicizer");
// const WyvernExchange = artifacts.require("WyvernExchange");
// const StaticMarket = artifacts.require("StaticMarket");
// const WyvernRegistry = artifacts.require("WyvernRegistry");
// const TestERC20 = artifacts.require("MockLabel");
// const TestERC1155 = artifacts.require("LabelCollection");
// const PaymentManager = artifacts.require("PaymentManager");

// const {
//   wrap,
//   ZERO_BYTES32,
//   CHAIN_ID,
//   assertIsRejected,
// } = require("./common/util");

// contract("WyvernExchange", (accounts) => {
//   let deployCoreContracts = async () => {
//     let [registry, atomicizer] = await Promise.all([
//       WyvernRegistry.new(),
//       WyvernAtomicizer.new(),
//     ]);
//     let [exchange] = await Promise.all([
//       WyvernExchange.new(CHAIN_ID, [registry.address], "0x"),
//       ,
//     ]);
//     let [erc20, erc1155] = await Promise.all([
//       TestERC20.new(),
//       TestERC1155.new(),
//     ]);

//     await registry.grantInitialAuthentication(exchange.address);
//     return {
//       registry,
//       exchange: wrap(exchange),
//       atomicizer,
//       erc20,
//       erc1155,
//     };
//   };

//   const test = async (options) => {
//     const {
//       tokenId,
//       buyTokenId,
//       sellAmount,
//       sellingPrice,
//       sellingNumerator,
//       buyingPrice,
//       buyAmount,
//       buyingDenominator,
//       erc1155MintAmount,
//       erc20MintAmount,
//       account_a,
//       account_b,
//       sender,
//       transactions,
//       creators,
//       royalties,
//       platformFeeRecipient,
//       platformFee,
//     } = options;

//     const txCount = transactions || 1;

//     let { exchange, registry, erc20, erc1155 } = await deployCoreContracts();

//     let payment = await PaymentManager.new(
//       erc1155.address,
//       platformFeeRecipient,
//       platformFee //5%
//     );

//     let statici = await StaticMarket.new(payment.address);

//     await registry.registerProxy({ from: account_a });
//     let proxy1 = await registry.proxies(account_a);
//     assert.equal(true, proxy1.length > 0, "no proxy address for account a");

//     await registry.registerProxy({ from: account_b });
//     let proxy2 = await registry.proxies(account_b);
//     assert.equal(true, proxy2.length > 0, "no proxy address for account b");

//     await Promise.all([
//       erc1155.setApprovalForAll(proxy1, true, { from: account_a }),
//       // erc20.approve(proxy2, erc20MintAmount, { from: account_b }),
//       erc20.approve(payment.address, erc20MintAmount, { from: account_b }),
//     ]);
//     await Promise.all([
//       erc1155.mint(
//         [account_a],
//         [erc1155MintAmount],
//         tokenId,
//         "/test",
//         creators,
//         royalties,
//         "0x"
//       ),
//       erc20.mint(account_b, erc20MintAmount),
//     ]);

//     if (buyTokenId)
//       await erc1155.mint(
//         [account_a],
//         [erc1155MintAmount],
//         buyTokenId,
//         "/test",
//         creators,
//         royalties,
//         "0x"
//       );

//     const erc1155c = new web3.eth.Contract(erc1155.abi, erc1155.address);
//     const erc20c = new web3.eth.Contract(erc20.abi, erc20.address);
//     const paymentc = new web3.eth.Contract(payment.abi, payment.address);

//     const selectorOne = web3.eth.abi.encodeFunctionSignature(
//       "anyERC1155ForERC20SplitFee(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
//     );
//     const selectorTwo = web3.eth.abi.encodeFunctionSignature(
//       "anyERC20ForERC1155SplitFee(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
//     );

//     const paramsOne = web3.eth.abi.encodeParameters(
//       ["address[3]", "uint256[3]"],
//       [
//         [erc1155.address, erc20.address, payment.address],
//         [tokenId, sellingNumerator || 1, sellingPrice],
//       ]
//     );

//     const paramsTwo = web3.eth.abi.encodeParameters(
//       ["address[3]", "uint256[3]"],
//       [
//         [erc20.address, erc1155.address, payment.address],
//         [buyTokenId || tokenId, buyingPrice, buyingDenominator || 1],
//       ]
//     );

//     const one = {
//       registry: registry.address,
//       maker: account_a,
//       staticTarget: statici.address,
//       staticSelector: selectorOne,
//       staticExtradata: paramsOne,
//       maximumFill: (sellingNumerator || 1) * sellAmount,
//       listingTime: "0",
//       expirationTime: "10000000000",
//       salt: "11",
//     };

//     const two = {
//       registry: registry.address,
//       maker: account_b,
//       staticTarget: statici.address,
//       staticSelector: selectorTwo,
//       staticExtradata: paramsTwo,
//       maximumFill: buyingPrice * buyAmount,
//       listingTime: "0",
//       expirationTime: "10000000000",
//       salt: "12",
//     };

//     const firstData =
//       erc1155c.methods
//         .safeTransferFrom(
//           account_a,
//           account_b,
//           tokenId,
//           sellingNumerator || buyAmount,
//           "0x"
//         )
//         .encodeABI() + ZERO_BYTES32.substr(2);

//     const secondData = paymentc.methods
//       .payForNFT(
//         account_b,
//         account_a,
//         buyAmount * buyingPrice,
//         erc20.address,
//         tokenId
//       )
//       .encodeABI();

//     const firstCall = {
//       target: erc1155.address,
//       howToCall: 0,
//       data: firstData,
//     };
//     const secondCall = {
//       target: payment.address,
//       howToCall: 0,
//       data: secondData,
//     };

//     let sigOne = await exchange.sign(one, account_a);

//     for (var i = 0; i < txCount; ++i) {
//       let sigTwo = await exchange.sign(two, account_b);
//       await exchange.atomicMatchWith(
//         one,
//         sigOne,
//         firstCall,
//         two,
//         sigTwo,
//         secondCall,
//         ZERO_BYTES32,
//         { from: sender || account_a }
//       );
//       two.salt++;
//     }

//     let [
//       account_a_erc20_balance,
//       account_b_erc1155_balance,
//       platformFeeRecipientBalance,
//     ] = await Promise.all([
//       erc20.balanceOf(account_a),
//       erc1155.balanceOf(account_b, tokenId),
//       erc20.balanceOf(platformFeeRecipient),
//     ]);

//     const totalPay = sellingPrice * buyAmount * txCount;
//     const totalFee =
//       (totalPay * (royalties.reduce((a, b) => a + b) + platformFee)) / 10000;

//     for (let i = 0; i < creators.length; i++) {
//       feeAmount = await erc20.balanceOf(creators[i]);
//       assert.equal(
//         feeAmount.toNumber(),
//         (totalPay * royalties[i]) / 10000,
//         "Incorrect ERC20 balance"
//       );
//     }

//     assert.equal(
//       account_a_erc20_balance.toNumber(),
//       totalPay - totalFee,
//       "Incorrect ERC20 balance"
//     );

//     assert.equal(
//       platformFeeRecipientBalance.toNumber(),
//       (totalPay * platformFee) / 10000,
//       "Incorrect ERC20 balance"
//     );

//     assert.equal(
//       account_b_erc1155_balance.toNumber(),
//       sellingNumerator || buyAmount * txCount,
//       "Incorrect ERC1155 balance"
//     );
//   };

//   it("StaticMarket: matches erc1155 <> erc20 order, 1 fill", async () => {
//     const price = 10000;

//     return test({
//       tokenId: 5,
//       sellAmount: 1,
//       sellingPrice: price,
//       buyingPrice: price,
//       buyAmount: 1,
//       erc1155MintAmount: 1,
//       erc20MintAmount: price,
//       account_a: accounts[1],
//       account_b: accounts[6],
//       sender: accounts[6],
//       creators: [accounts[2], accounts[3], accounts[4]],
//       royalties: [300, 200, 150],
//       platformFeeRecipient: accounts[5],
//       platformFee: 150,
//     });
//   });

//   it("StaticMarket: matches erc1155 <> erc20 order, multiple fills in 1 transaction", async () => {
//     const amount = 3;
//     const price = 10000;

//     return test({
//       tokenId: 5,
//       sellAmount: amount,
//       sellingPrice: price,
//       buyingPrice: price,
//       buyAmount: amount,
//       erc1155MintAmount: amount,
//       erc20MintAmount: amount * price,
//       account_a: accounts[1],
//       account_b: accounts[6],
//       sender: accounts[6],
//       creators: [accounts[2], accounts[3], accounts[4]],
//       royalties: [300, 200, 150],
//       platformFeeRecipient: accounts[5],
//       platformFee: 150,
//     });
//   });

//   it("StaticMarket: matches erc1155 <> erc20 order, multiple fills in multiple transactions", async () => {
//     const nftAmount = 3;
//     const buyAmount = 1;
//     const price = 10000;
//     const transactions = 3;

//     return test({
//       tokenId: 5,
//       sellAmount: nftAmount,
//       sellingPrice: price,
//       buyingPrice: price,
//       buyAmount,
//       erc1155MintAmount: nftAmount,
//       erc20MintAmount: buyAmount * price * transactions,
//       account_a: accounts[1],
//       account_b: accounts[6],
//       sender: accounts[6],
//       creators: [accounts[2], accounts[3], accounts[4]],
//       royalties: [300, 200, 150],
//       platformFeeRecipient: accounts[5],
//       platformFee: 150,
//     });
//   });

//   it("StaticMarket: matches erc1155 <> erc20 order, allows any partial fill", async () => {
//     const nftAmount = 30;
//     const buyAmount = 4;
//     const price = 10000;

//     return test({
//       tokenId: 5,
//       sellAmount: nftAmount,
//       sellingPrice: price,
//       buyingPrice: price,
//       buyAmount,
//       erc1155MintAmount: nftAmount,
//       erc20MintAmount: buyAmount * price,
//       account_a: accounts[1],
//       account_b: accounts[6],
//       sender: accounts[6],
//       creators: [accounts[2], accounts[3], accounts[4]],
//       royalties: [300, 200, 150],
//       platformFeeRecipient: accounts[5],
//       platformFee: 150,
//     });
//   });

//   it("StaticMarket: matches erc1155 <> erc20 order with any matching ratio", async () => {
//     const lot = 83974;
//     const price = 9720000;

//     return test({
//       tokenId: 5,
//       sellAmount: 6,
//       sellingNumerator: lot,
//       sellingPrice: price,
//       buyingPrice: price,
//       buyingDenominator: lot,
//       buyAmount: 1,
//       erc1155MintAmount: lot,
//       erc20MintAmount: price,
//       account_a: accounts[1],
//       account_b: accounts[6],
//       sender: accounts[6],
//       creators: [accounts[2], accounts[3], accounts[4]],
//       royalties: [300, 200, 250],
//       platformFeeRecipient: accounts[5],
//       platformFee: 250,
//     });
//   });

//   it("StaticMarket: does not match erc1155 <> erc20 order beyond maximum fill", async () => {
//     const price = 10000;

//     return assertIsRejected(
//       test({
//         tokenId: 5,
//         sellAmount: 1,
//         sellingPrice: price,
//         buyingPrice: price,
//         buyAmount: 1,
//         erc1155MintAmount: 2,
//         erc20MintAmount: price * 2,
//         transactions: 2,
//         account_a: accounts[1],
//         account_b: accounts[6],
//         sender: accounts[6],
//         creators: [accounts[2], accounts[3], accounts[4]],
//         royalties: [300, 200, 150],
//         platformFeeRecipient: accounts[5],
//         platformFee: 150,
//       }),
//       /First order has invalid parameters/,
//       "Order should not match the second time."
//     );
//   });

//   it("StaticMarket: does not fill erc1155 <> erc20 order with different prices", async () => {
//     const price = 10000;

//     return assertIsRejected(
//       test({
//         tokenId: 5,
//         sellAmount: 1,
//         sellingPrice: price,
//         buyingPrice: price - 10,
//         buyAmount: 1,
//         erc1155MintAmount: 1,
//         erc20MintAmount: price,
//         account_a: accounts[1],
//         account_b: accounts[6],
//         sender: accounts[6],
//         creators: [accounts[2], accounts[3], accounts[4]],
//         royalties: [300, 200, 150],
//         platformFeeRecipient: accounts[5],
//         platformFee: 150,
//       }),
//       /Static call failed/,
//       "Order should not match."
//     );
//   });

//   it("StaticMarket: does not fill erc1155 <> erc20 order with different ratios", async () => {
//     const price = 10000;

//     return assertIsRejected(
//       test({
//         tokenId: 5,
//         sellAmount: 1,
//         sellingPrice: price,
//         buyingPrice: price,
//         buyingDenominator: 2,
//         buyAmount: 1,
//         erc1155MintAmount: 1,
//         erc20MintAmount: price,
//         account_a: accounts[1],
//         account_b: accounts[6],
//         sender: accounts[6],
//         creators: [accounts[2], accounts[3], accounts[4]],
//         royalties: [300, 200, 150],
//         platformFeeRecipient: accounts[5],
//         platformFee: 150,
//       }),
//       /Static call failed/,
//       "Order should not match."
//     );
//   });

//   it("StaticMarket: does not fill erc1155 <> erc20 order beyond maximum sell amount", async () => {
//     const nftAmount = 2;
//     const buyAmount = 3;
//     const price = 10000;

//     return assertIsRejected(
//       test({
//         tokenId: 5,
//         sellAmount: nftAmount,
//         sellingPrice: price,
//         buyingPrice: price,
//         buyAmount,
//         erc1155MintAmount: nftAmount,
//         erc20MintAmount: buyAmount * price,
//         account_a: accounts[1],
//         account_b: accounts[6],
//         sender: accounts[6],
//         creators: [accounts[2], accounts[3], accounts[4]],
//         royalties: [300, 200, 150],
//         platformFeeRecipient: accounts[5],
//         platformFee: 150,
//       }),
//       /First call failed/,
//       "Order should not fill"
//     );
//   });

//   it("StaticMarket: does not fill erc1155 <> erc20 order if balance is insufficient", async () => {
//     const nftAmount = 1;
//     const buyAmount = 1;
//     const price = 10000;

//     return assertIsRejected(
//       test({
//         tokenId: 5,
//         sellAmount: nftAmount,
//         sellingPrice: price,
//         buyingPrice: price,
//         buyAmount,
//         erc1155MintAmount: nftAmount,
//         erc20MintAmount: buyAmount * price - 1,
//         account_a: accounts[1],
//         account_b: accounts[6],
//         sender: accounts[6],
//         creators: [accounts[2], accounts[3], accounts[4]],
//         royalties: [300, 200, 150],
//         platformFeeRecipient: accounts[5],
//         platformFee: 150,
//       }),
//       /Second call failed/,
//       "Order should not fill"
//     );
//   });

//   it("StaticMarket: does not fill erc1155 <> erc20 order if the token IDs are different", async () => {
//     const price = 10000;

//     return assertIsRejected(
//       test({
//         tokenId: 5,
//         buyTokenId: 6,
//         sellAmount: 1,
//         sellingPrice: price,
//         buyingPrice: price,
//         buyAmount: 1,
//         erc1155MintAmount: 1,
//         erc20MintAmount: price,
//         account_a: accounts[1],
//         account_b: accounts[6],
//         sender: accounts[6],
//         creators: [accounts[2], accounts[3], accounts[4]],
//         royalties: [300, 200, 150],
//         platformFeeRecipient: accounts[5],
//         platformFee: 150,
//       }),
//       /Static call failed/,
//       "Order should not match the second time."
//     );
//   });
// });
