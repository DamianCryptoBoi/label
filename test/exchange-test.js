const WyvernAtomicizer = artifacts.require("WyvernAtomicizer");
const WyvernExchange = artifacts.require("WyvernExchange");
const WyvernStatic = artifacts.require("WyvernStatic");
const WyvernRegistry = artifacts.require("WyvernRegistry");
const Label1155 = artifacts.require("Label1155");
const Label721 = artifacts.require("Label721");
const MockLabel = artifacts.require("MockLabel");

const {
  wrap,
  ZERO_BYTES32,
  CHAIN_ID,
  NULL_SIG,
  assertIsRejected,
  FEE_DENOMINATOR,
} = require("./common/util");

contract("WyvernExchange", (accounts) => {
  let deployCoreContracts = async () => {
    let [registry, atomicizer] = await Promise.all([
      WyvernRegistry.new(),
      WyvernAtomicizer.new(),
    ]);
    let [exchange, statici] = await Promise.all([
      WyvernExchange.new(CHAIN_ID, [registry.address], "0x"),
      WyvernStatic.new(atomicizer.address),
    ]);
    await registry.grantInitialAuthentication(exchange.address);
    return { registry, exchange: wrap(exchange), atomicizer, statici };
  };

  let deploy = async (contracts) =>
    Promise.all(contracts.map((contract) => contract.new()));

  const erc1155_erc20_match_right_static_call = async (
    maximumFill,
    fillCount
  ) => {
    let account_a = accounts[0];
    let account_b = accounts[6];

    let creator = accounts[1];
    let coCreator = accounts[2];

    let price = 10000;
    let tokenId = 4;

    if (!maximumFill) maximumFill = 1;

    if (!fillCount) fillCount = 1;

    let { atomicizer, exchange, registry, statici } =
      await deployCoreContracts();
    let [erc20, erc1155] = await deploy([MockLabel, Label1155]);

    await registry.registerProxy({ from: account_a });
    let proxy1 = await registry.proxies(account_a);
    assert.equal(true, proxy1.length > 0, "no proxy address for account a");

    await registry.registerProxy({ from: account_b });
    let proxy2 = await registry.proxies(account_b);
    assert.equal(true, proxy2.length > 0, "no proxy address for account b");

    await Promise.all([
      erc20.approve(proxy1, price * maximumFill, { from: account_a }),
      erc1155.setApprovalForAll(proxy2, true, { from: account_b }),
    ]);
    await Promise.all([
      erc20.mint(account_a, price * maximumFill),
      erc1155.mint(
        [account_b],
        [maximumFill],
        tokenId,
        "/test",
        [creator, coCreator],
        [400, 100],
        "0x"
      ),
    ]);

    const abi = [
      {
        constant: false,
        inputs: [
          { name: "addrs", type: "address[]" },
          { name: "values", type: "uint256[]" },
          { name: "calldataLengths", type: "uint256[]" },
          { name: "calldatas", type: "bytes" },
        ],
        name: "atomicize",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
      },
    ];
    const atomicizerc = new web3.eth.Contract(abi, atomicizer.address);
    const erc20c = new web3.eth.Contract(erc20.abi, erc20.address);
    const erc1155c = new web3.eth.Contract(erc1155.abi, erc1155.address);
    const selectorOne = web3.eth.abi.encodeFunctionSignature(
      "splitAddOne(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
    );
    const selectorOneA = web3.eth.abi.encodeFunctionSignature(
      "sequenceExact(bytes,address[7],uint8,uint256[6],bytes)"
    );
    const selectorOneB = web3.eth.abi.encodeFunctionSignature(
      "sequenceExact(bytes,address[7],uint8,uint256[6],bytes)"
    );
    const aEDParams = web3.eth.abi.encodeParameters(
      ["address", "uint256"],
      [erc20.address, price]
    );
    const aEDSelector = web3.eth.abi.encodeFunctionSignature(
      "transferERC20Exact(bytes,address[7],uint8,uint256[6],bytes)"
    );

    // selectorOneA sequenceExact
    const extradataOneA = web3.eth.abi.encodeParameters(
      ["address[]", "uint256[]", "bytes4[]", "bytes"],
      [
        [statici.address],
        [(aEDParams.length - 2) / 2],
        [aEDSelector],
        aEDParams,
      ]
    );

    const bEDParams = web3.eth.abi.encodeParameters(
      ["address", "uint256", "uint256"],
      [erc1155.address, tokenId, 1]
    );
    const bEDSelector = web3.eth.abi.encodeFunctionSignature(
      "transferERC1155Exact(bytes,address[7],uint8,uint256[6],bytes)"
    );

    // selectorOneB sequenceExact
    const extradataOneB = web3.eth.abi.encodeParameters(
      ["address[]", "uint256[]", "bytes4[]", "bytes"],
      [
        [statici.address],
        [(bEDParams.length - 2) / 2],
        [bEDSelector],
        bEDParams,
      ]
    );

    // SelectorOne split
    const paramsOneA = web3.eth.abi.encodeParameters(
      ["address[2]", "bytes4[2]", "bytes", "bytes"],
      [
        [statici.address, statici.address],
        [selectorOneA, selectorOneB],
        extradataOneA,
        extradataOneB,
      ]
    );

    const extradataOne = paramsOneA;
    const selectorTwo = web3.eth.abi.encodeFunctionSignature(
      "anyAddOne(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
    );
    const extradataTwo = "0x";
    const one = {
      registry: registry.address,
      maker: account_a,
      staticTarget: statici.address,
      staticSelector: selectorOne,
      staticExtradata: extradataOne,
      maximumFill: "2",
      listingTime: "0",
      expirationTime: "10000000000",
      salt: "3358",
    };
    const two = {
      registry: registry.address,
      maker: account_b,
      staticTarget: statici.address,
      staticSelector: selectorTwo,
      staticExtradata: extradataTwo,
      maximumFill: "1",
      listingTime: "0",
      expirationTime: "10000000000",
      salt: "3339",
    };
    const sig = await exchange.sign(one, account_a);
    const firstERC20Call = erc20c.methods
      .transferFrom(account_a, account_b, price)
      .encodeABI();
    const firstData = atomicizerc.methods
      .atomicize(
        [erc20.address],
        [0],
        [(firstERC20Call.length - 2) / 2],
        firstERC20Call
      )
      .encodeABI();

    const secondERC1155Call =
      erc1155c.methods
        .safeTransferFrom(account_b, account_a, tokenId, 1, "0x")
        .encodeABI() + ZERO_BYTES32.substr(2);
    const secondData = atomicizerc.methods
      .atomicize(
        [erc1155.address],
        [0],
        [(secondERC1155Call.length - 2) / 2],
        secondERC1155Call
      )
      .encodeABI();

    const firstCall = {
      target: atomicizer.address,
      howToCall: 1,
      data: firstData,
    };
    const secondCall = {
      target: atomicizer.address,
      howToCall: 1,
      data: secondData,
    };

    let twoSig = await exchange.sign(two, account_b);

    for (let i = 0; i < fillCount; ++i)
      await exchange.atomicMatchWith(
        one,
        sig,
        firstCall,
        two,
        twoSig,
        secondCall,
        ZERO_BYTES32,
        { from: account_b }
      );

    let new_balance = await erc1155.balanceOf(account_a, tokenId);
    assert.isTrue(new_balance.toNumber() > 0, "Incorrect balance");
    assert.equal(
      await erc20.balanceOf(account_b),
      price * fillCount,
      "Incorrect balance"
    );
  };

  it("AUCTION: erc1155 <> erc20 ", async () => {
    return erc1155_erc20_match_right_static_call(1, 1);
  });

  it("AUCTION: erc1155 <> erc20, multiple fills", async () => {
    return erc1155_erc20_match_right_static_call(2, 2);
  });

  it("FIXED PRICE: erc721 <> erc20", async () => {
    const seller = accounts[1];
    const buyer = accounts[2];
    const creator = accounts[3];
    const coCreator = accounts[4];

    const { atomicizer, exchange, registry, statici } =
      await deployCoreContracts();
    const [erc20, erc721] = await deploy([MockLabel, Label721]);

    const abi = [
      {
        constant: false,
        inputs: [
          { name: "addrs", type: "address[]" },
          { name: "values", type: "uint256[]" },
          { name: "calldataLengths", type: "uint256[]" },
          { name: "calldatas", type: "bytes" },
        ],
        name: "atomicize",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
      },
    ];
    const atomicizerc = new web3.eth.Contract(abi, atomicizer.address);

    await registry.registerProxy({ from: seller });
    const sellerProxy = await registry.proxies(seller);
    assert.equal(true, sellerProxy.length > 0, "No proxy address for seller");

    await registry.registerProxy({ from: buyer });
    const buyerProxy = await registry.proxies(buyer);
    assert.equal(true, buyerProxy.length > 0, "No proxy address for buyer");

    const totalAmount = 1000000;
    const fee1Rate = 100; //1%
    const fee2Rate = 200; //2%
    const fee1 = (totalAmount * fee1Rate) / FEE_DENOMINATOR;
    const fee2 = (totalAmount * fee2Rate) / FEE_DENOMINATOR;
    const amount = totalAmount - fee1 - fee2;
    const tokenId = 10;

    await Promise.all([
      erc20.mint(buyer, amount + fee1 + fee2),
      erc721.mint(
        seller,
        tokenId,
        "/test",
        [creator, coCreator],
        [fee1Rate, fee2Rate]
      ),
    ]);

    await Promise.all([
      erc20.approve(buyerProxy, amount + fee1 + fee2, { from: buyer }),
      erc721.setApprovalForAll(sellerProxy, true, { from: seller }),
    ]);

    const erc20c = new web3.eth.Contract(erc20.abi, erc20.address);
    const erc721c = new web3.eth.Contract(erc721.abi, erc721.address);

    let selectorOne, extradataOne;
    {
      const selector = web3.eth.abi.encodeFunctionSignature(
        "split(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
      );
      // Call should be an ERC721 transfer
      const selectorCall = web3.eth.abi.encodeFunctionSignature(
        "transferERC721Exact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const extradataCall = web3.eth.abi.encodeParameters(
        ["address", "uint256"],
        [erc721.address, tokenId]
      );

      // Countercall should include an ERC20 transfer
      const selectorCountercall = web3.eth.abi.encodeFunctionSignature(
        "sequenceAnyAfter(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const countercallSelector1 = web3.eth.abi.encodeFunctionSignature(
        "transferERC20Exact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const countercallExtradata1 = web3.eth.abi.encodeParameters(
        ["address", "uint256"],
        [erc20.address, amount]
      );
      const extradataCountercall = web3.eth.abi.encodeParameters(
        ["address[]", "uint256[]", "bytes4[]", "bytes"],
        [
          [statici.address],
          [(countercallExtradata1.length - 2) / 2],
          [countercallSelector1],
          countercallExtradata1,
        ]
      );

      const params = web3.eth.abi.encodeParameters(
        ["address[2]", "bytes4[2]", "bytes", "bytes"],
        [
          [statici.address, statici.address],
          [selectorCall, selectorCountercall],
          extradataCall,
          extradataCountercall,
        ]
      );

      selectorOne = selector;
      extradataOne = params;
    }

    const one = {
      registry: registry.address,
      maker: seller,
      staticTarget: statici.address,
      staticSelector: selectorOne,
      staticExtradata: extradataOne,
      maximumFill: 1,
      listingTime: "0",
      expirationTime: "10000000000",
      salt: "11",
    };
    const sigOne = await exchange.sign(one, seller);

    let selectorTwo, extradataTwo;
    {
      const selector = web3.eth.abi.encodeFunctionSignature(
        "split(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
      );
      // Call should be an ERC20 transfer to recipient + fees
      const selectorCall = web3.eth.abi.encodeFunctionSignature(
        "sequenceExact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const callSelector1 = web3.eth.abi.encodeFunctionSignature(
        "transferERC20Exact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const callExtradata1 = web3.eth.abi.encodeParameters(
        ["address", "uint256"],
        [erc20.address, amount]
      );
      const callSelector2 = web3.eth.abi.encodeFunctionSignature(
        "transferERC20ExactTo(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const callExtradata2 = web3.eth.abi.encodeParameters(
        ["address", "uint256", "address"],
        [erc20.address, fee1, creator]
      );
      const callSelector3 = web3.eth.abi.encodeFunctionSignature(
        "transferERC20ExactTo(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const callExtradata3 = web3.eth.abi.encodeParameters(
        ["address", "uint256", "address"],
        [erc20.address, fee2, coCreator]
      );
      const extradataCall = web3.eth.abi.encodeParameters(
        ["address[]", "uint256[]", "bytes4[]", "bytes"],
        [
          [statici.address, statici.address, statici.address],
          [
            (callExtradata1.length - 2) / 2,
            (callExtradata2.length - 2) / 2,
            (callExtradata3.length - 2) / 2,
          ],
          [callSelector1, callSelector2, callSelector3],
          callExtradata1 +
            callExtradata2.slice("2") +
            callExtradata3.slice("2"),
        ]
      );
      // Countercall should be an ERC721 transfer
      const selectorCountercall = web3.eth.abi.encodeFunctionSignature(
        "transferERC721Exact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const extradataCountercall = web3.eth.abi.encodeParameters(
        ["address", "uint256"],
        [erc721.address, tokenId]
      );

      const params = web3.eth.abi.encodeParameters(
        ["address[2]", "bytes4[2]", "bytes", "bytes"],
        [
          [statici.address, statici.address],
          [selectorCall, selectorCountercall],
          extradataCall,
          extradataCountercall,
        ]
      );

      selectorTwo = selector;
      extradataTwo = params;
    }

    const two = {
      registry: registry.address,
      maker: buyer,
      staticTarget: statici.address,
      staticSelector: selectorTwo,
      staticExtradata: extradataTwo,
      maximumFill: amount,
      listingTime: "0",
      expirationTime: "10000000000",
      salt: "12",
    };
    const sigTwo = await exchange.sign(two, buyer);

    const firstData = erc721c.methods
      .transferFrom(seller, buyer, tokenId)
      .encodeABI();

    const c1 = erc20c.methods.transferFrom(buyer, seller, amount).encodeABI();
    const c2 = erc20c.methods.transferFrom(buyer, creator, fee1).encodeABI();
    const c3 = erc20c.methods.transferFrom(buyer, coCreator, fee2).encodeABI();
    const secondData = atomicizerc.methods
      .atomicize(
        [erc20.address, erc20.address, erc20.address],
        [0, 0, 0],
        [(c1.length - 2) / 2, (c2.length - 2) / 2, (c3.length - 2) / 2],
        c1 + c2.slice("2") + c3.slice("2")
      )
      .encodeABI();

    const firstCall = { target: erc721.address, howToCall: 0, data: firstData };
    const secondCall = {
      target: atomicizer.address,
      howToCall: 1,
      data: secondData,
    };

    await exchange.atomicMatchWith(
      one,
      sigOne,
      firstCall,
      two,
      sigTwo,
      secondCall,
      ZERO_BYTES32,
      { from: creator }
    );

    const [
      sellerErc20Balance,
      creatorErc20Balance,
      coCreatorErc20Balance,
      tokenIdOwner,
    ] = await Promise.all([
      erc20.balanceOf(seller),
      erc20.balanceOf(creator),
      erc20.balanceOf(coCreator),
      erc721.ownerOf(tokenId),
    ]);
    assert.equal(
      sellerErc20Balance.toNumber(),
      amount,
      "Incorrect ERC20 balance"
    );
    assert.equal(
      creatorErc20Balance.toNumber(),
      fee1,
      "Incorrect ERC20 balance"
    );
    assert.equal(
      coCreatorErc20Balance.toNumber(),
      fee2,
      "Incorrect ERC20 balance"
    );
    assert.equal(tokenIdOwner, buyer, "Incorrect token owner");
  });

  it("FIXED PRICE: erc721 <> erc20 LAZY-MINTING", async () => {
    const seller = accounts[1];
    const buyer = accounts[2];
    const creator = accounts[3];
    const coCreator = accounts[4];

    const { atomicizer, exchange, registry, statici } =
      await deployCoreContracts();
    const [erc20, erc721] = await deploy([MockLabel, Label721]);

    const abi = [
      {
        constant: false,
        inputs: [
          { name: "addrs", type: "address[]" },
          { name: "values", type: "uint256[]" },
          { name: "calldataLengths", type: "uint256[]" },
          { name: "calldatas", type: "bytes" },
        ],
        name: "atomicize",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
      },
    ];
    const atomicizerc = new web3.eth.Contract(abi, atomicizer.address);

    await registry.registerProxy({ from: seller });
    const sellerProxy = await registry.proxies(seller);
    assert.equal(true, sellerProxy.length > 0, "No proxy address for seller");

    await registry.registerProxy({ from: buyer });
    const buyerProxy = await registry.proxies(buyer);
    assert.equal(true, buyerProxy.length > 0, "No proxy address for buyer");

    const totalAmount = 1000000;
    const fee1Rate = 100; //1%
    const fee2Rate = 200; //2%
    const fee1 = (totalAmount * fee1Rate) / FEE_DENOMINATOR;
    const fee2 = (totalAmount * fee2Rate) / FEE_DENOMINATOR;
    const amount = totalAmount - fee1 - fee2;
    const tokenId = 10;

    await Promise.all([erc20.mint(buyer, amount + fee1 + fee2)]);

    await Promise.all([
      erc20.approve(buyerProxy, amount + fee1 + fee2, { from: buyer }),
      erc721.setApprovalForAll(sellerProxy, true, { from: seller }),
    ]);

    const erc20c = new web3.eth.Contract(erc20.abi, erc20.address);
    const erc721c = new web3.eth.Contract(erc721.abi, erc721.address);

    let selectorOne, extradataOne;
    {
      const selector = web3.eth.abi.encodeFunctionSignature(
        "split(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
      );
      // Call should be an ERC721 transfer
      const selectorCall = web3.eth.abi.encodeFunctionSignature(
        "mintERC721Exact(bytes,address[7],uint8,uint256[6],bytes)"
      );

      const extradataCall = web3.eth.abi.encodeParameters(
        ["address", "uint256", "string", "address[]", "uint256[]"],
        [
          erc721.address,
          tokenId,
          "/test",
          [creator, coCreator],
          [fee1Rate, fee2Rate],
        ]
      );

      // Countercall should include an ERC20 transfer
      const selectorCountercall = web3.eth.abi.encodeFunctionSignature(
        "sequenceAnyAfter(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const countercallSelector1 = web3.eth.abi.encodeFunctionSignature(
        "transferERC20Exact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const countercallExtradata1 = web3.eth.abi.encodeParameters(
        ["address", "uint256"],
        [erc20.address, amount]
      );
      const extradataCountercall = web3.eth.abi.encodeParameters(
        ["address[]", "uint256[]", "bytes4[]", "bytes"],
        [
          [statici.address],
          [(countercallExtradata1.length - 2) / 2],
          [countercallSelector1],
          countercallExtradata1,
        ]
      );

      const params = web3.eth.abi.encodeParameters(
        ["address[2]", "bytes4[2]", "bytes", "bytes"],
        [
          [statici.address, statici.address],
          [selectorCall, selectorCountercall],
          extradataCall,
          extradataCountercall,
        ]
      );

      selectorOne = selector;
      extradataOne = params;
    }

    const one = {
      registry: registry.address,
      maker: seller,
      staticTarget: statici.address,
      staticSelector: selectorOne,
      staticExtradata: extradataOne,
      maximumFill: 1,
      listingTime: "0",
      expirationTime: "10000000000",
      salt: "11",
    };
    const sigOne = await exchange.sign(one, seller);

    let selectorTwo, extradataTwo;
    {
      const selector = web3.eth.abi.encodeFunctionSignature(
        "split(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
      );
      // Call should be an ERC20 transfer to recipient + fees
      const selectorCall = web3.eth.abi.encodeFunctionSignature(
        "sequenceExact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const callSelector1 = web3.eth.abi.encodeFunctionSignature(
        "transferERC20Exact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const callExtradata1 = web3.eth.abi.encodeParameters(
        ["address", "uint256"],
        [erc20.address, amount]
      );
      const callSelector2 = web3.eth.abi.encodeFunctionSignature(
        "transferERC20ExactTo(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const callExtradata2 = web3.eth.abi.encodeParameters(
        ["address", "uint256", "address"],
        [erc20.address, fee1, creator]
      );
      const callSelector3 = web3.eth.abi.encodeFunctionSignature(
        "transferERC20ExactTo(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const callExtradata3 = web3.eth.abi.encodeParameters(
        ["address", "uint256", "address"],
        [erc20.address, fee2, coCreator]
      );
      const extradataCall = web3.eth.abi.encodeParameters(
        ["address[]", "uint256[]", "bytes4[]", "bytes"],
        [
          [statici.address, statici.address, statici.address],
          [
            (callExtradata1.length - 2) / 2,
            (callExtradata2.length - 2) / 2,
            (callExtradata3.length - 2) / 2,
          ],
          [callSelector1, callSelector2, callSelector3],
          callExtradata1 +
            callExtradata2.slice("2") +
            callExtradata3.slice("2"),
        ]
      );
      // Countercall should be an ERC721 transfer
      const selectorCountercall = web3.eth.abi.encodeFunctionSignature(
        "mintERC721Exact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const extradataCountercall = web3.eth.abi.encodeParameters(
        ["address", "uint256", "string", "address[]", "uint256[]"],
        [
          erc721.address,
          tokenId,
          "/test",
          [creator, coCreator],
          [fee1Rate, fee2Rate],
        ]
      );

      const params = web3.eth.abi.encodeParameters(
        ["address[2]", "bytes4[2]", "bytes", "bytes"],
        [
          [statici.address, statici.address],
          [selectorCall, selectorCountercall],
          extradataCall,
          extradataCountercall,
        ]
      );

      selectorTwo = selector;
      extradataTwo = params;
    }

    const two = {
      registry: registry.address,
      maker: buyer,
      staticTarget: statici.address,
      staticSelector: selectorTwo,
      staticExtradata: extradataTwo,
      maximumFill: amount,
      listingTime: "0",
      expirationTime: "10000000000",
      salt: "12",
    };
    const sigTwo = await exchange.sign(two, buyer);

    const firstData = erc721c.methods
      .mint(buyer, tokenId, "/test", [creator, coCreator], [fee1Rate, fee2Rate])
      .encodeABI();

    const c1 = erc20c.methods.transferFrom(buyer, seller, amount).encodeABI();
    const c2 = erc20c.methods.transferFrom(buyer, creator, fee1).encodeABI();
    const c3 = erc20c.methods.transferFrom(buyer, coCreator, fee2).encodeABI();
    const secondData = atomicizerc.methods
      .atomicize(
        [erc20.address, erc20.address, erc20.address],
        [0, 0, 0],
        [(c1.length - 2) / 2, (c2.length - 2) / 2, (c3.length - 2) / 2],
        c1 + c2.slice("2") + c3.slice("2")
      )
      .encodeABI();

    const firstCall = { target: erc721.address, howToCall: 0, data: firstData };
    const secondCall = {
      target: atomicizer.address,
      howToCall: 1,
      data: secondData,
    };

    await exchange.atomicMatchWith(
      one,
      sigOne,
      firstCall,
      two,
      sigTwo,
      secondCall,
      ZERO_BYTES32,
      { from: creator }
    );

    const [
      sellerErc20Balance,
      creatorErc20Balance,
      coCreatorErc20Balance,
      tokenIdOwner,
    ] = await Promise.all([
      erc20.balanceOf(seller),
      erc20.balanceOf(creator),
      erc20.balanceOf(coCreator),
      erc721.ownerOf(tokenId),
    ]);
    assert.equal(
      sellerErc20Balance.toNumber(),
      amount,
      "Incorrect ERC20 balance"
    );
    assert.equal(
      creatorErc20Balance.toNumber(),
      fee1,
      "Incorrect ERC20 balance"
    );
    assert.equal(
      coCreatorErc20Balance.toNumber(),
      fee2,
      "Incorrect ERC20 balance"
    );
    assert.equal(tokenIdOwner, buyer, "Incorrect token owner");
  });
});
