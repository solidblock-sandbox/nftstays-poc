const Network = {
  PolygonMainnet: 'https://polygon-rpc.com',
  PolygonMumbaiTestnet: 'https://rpc-mumbai.matic.today',
  InfuraEthereumMainnet: (apiKey = '') => `https://mainnet.infura.io/v3/${apiKey}`,
  InfuraRinkebyTestnet: (apiKey = '') => `https://rinkeby.infura.io/v3/${apiKey}`
}

module.exports = { Network }
