'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = {
  thresholdLimits: {
    lastBlockTime: { // more than
      warning: 30,
      critical: 60
    },
    peerCounts: { // less than
      warning: 10,
      critical: 5
    },
    missedBlocks: { // less than percentage
      warning: 50,
      critical: 30
    }
  },
  numberOfLastCommits: 50,
  numberOfLastVotingPeriod: 50,
  requestTimeoutMs: 2000,
  maxKVStoreTransactions: 64,
  mutedNodesKey: 'apm/settings/muted-nodes',
  thresholdDefaultSettingsKey: 'apm/settings/threshold/default',
  thresholdCustomSettingsKey: 'apm/settings/threshold/custom',
  validatorAddressesPrefix: 'apm/settings/validator-addresses',
  validatorName: 'StakeWithUs',
  projectSettings: {
    'bcl-kava': {
      'kava-testnet-2000': [{
        name: 'StakeWithUs',
        address: 'EA741AD0F8A3B579781243D15A79E99B51F3B60E'
      }]
    },
    'bcl-commit-hub': { // config for fixtures testing pls don't change
      unknown: [{
        name: 'StakeWithUs',
        address: 'EA741AD0F8A3B579781243D15A79E99B51F3B60E'
      }]
    }
  }
};
//# sourceMappingURL=dev.js.map
