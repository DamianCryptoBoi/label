const { eip712Domain, structHash, signHash } = require("./eip712.js");
const { network } = require("hardhat");

const CHAIN_ID = network.config.chainId;

const MAX_UINT256 =
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

const NULL_SIG = { v: 27, r: ZERO_BYTES32, s: ZERO_BYTES32 };

const eip712Order = {
  name: "Order",
  fields: [
    { name: "registry", type: "address" },
    { name: "maker", type: "address" },
    { name: "staticTarget", type: "address" },
    { name: "staticSelector", type: "bytes4" },
    { name: "staticExtradata", type: "bytes" },
    { name: "maximumFill", type: "uint256" },
    { name: "listingTime", type: "uint256" },
    { name: "expirationTime", type: "uint256" },
    { name: "salt", type: "uint256" },
  ],
};

const hashOrder = (order) => {
  return (
    "0x" +
    structHash(eip712Order.name, eip712Order.fields, order).toString("hex")
  );
};

const structToSign = (order, exchange) => {
  return {
    name: eip712Order.name,
    fields: eip712Order.fields,
    domain: {
      name: "Wyvern Exchange - Label Implementation",
      version: "3.1",
      chainId: CHAIN_ID,
      verifyingContract: exchange,
    },
    data: order,
  };
};

const hashToSign = (order, exchange) => {
  return "0x" + signHash(structToSign(order, exchange)).toString("hex");
};

// const parseSig = (bytes) => {
//   bytes = bytes.substr(2);
//   const r = "0x" + bytes.slice(0, 64);
//   const s = "0x" + bytes.slice(64, 128);
//   const v = parseInt("0x" + bytes.slice(128, 130), 16);
//   return { v, r, s };
// };

const signOrder = async (signer, exchange, order) => {
  const str = structToSign(order, exchange);
  const sig = await signer._signTypedData(
    str.domain,
    {
      EIP712Domain: eip712Domain.fields,
      Order: eip712Order.fields,
    },
    order
  );

  return sig;
};

module.exports = {
  hashOrder,
  hashToSign,
  signOrder,
  MAX_UINT256,
  ZERO_BYTES32,
  NULL_SIG,
  CHAIN_ID,
};
