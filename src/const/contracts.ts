export const COOKIE_CLICKER_CONTRACT_ADDRESS =
  "0x45953d5B31ab11DDBBF8a0E6c8651ae6C4B80b99";
// "0x68694b8Cfe1F60317965d274faaf33fed0fDc61c"; // mega

export const COOKIE_CLICKER_CONTRACT_ABI = [
  {
    type: "function",
    name: "click",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getClicks",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getClicksForUser",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalClicks",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "userClicks",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Click",
    inputs: [
      {
        name: "user",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newClickCount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
];
