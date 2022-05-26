const Network = {
  PolygonMainnet: 'https://polygon-rpc.com',
  PolygonMumbaiTestnet: 'https://rpc-mumbai.matic.today',
  InfuraEthereumMainnet: (apiKey = '') => `https://mainnet.infura.io/v3/${apiKey}`,
  InfuraRinkebyTestnet: (apiKey = '') => `https://rinkeby.infura.io/v3/${apiKey}`
}

const NullAddresses = [
  '0x0000000000000000000000000000000000000000',
  '0x0000000000000000000000000000000000000001',
  '0x0000000000000000000000000000000000000002',
  '0x0000000000000000000000000000000000000003'
]

module.exports = { Network, NullAddresses }
