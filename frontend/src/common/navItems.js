export default [
  {
    name: "user",
    text: "User management",
    roles: ["admin"]
  },
  {
    name: "networks",
    text: "Networks",
    roles: ["admin", "user"],
    children: [
      {
        name: "networksMainnet",
        text: "Mainnet",
        roles: ["admin", "user"]
      },
      {
        name: "networksTestnet",
        text: "Testnet",
        roles: ["admin", "user"]
      },
      {
        name: "network-alerting-thresholds",
        text: "Alerting Thresholds",
        roles: ["admin", "user"]
      },
      {
        name: "network-validator-mapping",
        text: "Validator Mapping",
        roles: ["admin", "user"]
      }
    ]
  }
];
