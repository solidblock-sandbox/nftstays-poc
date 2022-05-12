const ethers = require('ethers')
const axios = require('axios')
const { ABI } = require('./abi.js')

const Network = {
  Matic: 'https://polygon-rpc.com'
}

class OpenSeaCollection {
  constructor(collectionAddress, network) {
    this.provider = new ethers.providers.JsonRpcProvider(network)
    this.contract = new ethers.Contract(collectionAddress, ABI, this.provider)
    this.metadataMap = {}
  }

  static toHexTokenId(decTokenId) {
    return '0x' + BigInt(decTokenId).toString(16)
  }

  async init() {
    this.templateURI = await this.contract.templateURI()
    this.templateURI = this.templateURI.replace('0x{id}', '')
  }

  async updateTokenMetadata(decTokenId) {
    const hexTokenId = OpenSeaCollection.toHexTokenId(decTokenId)
    const response = await axios.get(this.templateURI + hexTokenId)
    this.metadataMap[decTokenId] = response.data
  }

  async registerTokenId(decTokenId, update = true) {
    this.metadataMap[decTokenId] = {}
    update && await this.updateTokenMetadata(decTokenId)
  }

  async getTokenMetadata(decTokenId, update = false) {
    update && await this.updateTokenMetadata(decTokenId)
    return this.metadataMap[decTokenId]
  }

  async enumerateTokens(ownerAccount, update = false) {
    const tokens = []
    for (const decTokenId in this.metadataMap) {
      const balance = (await this.contract.balanceOf(ownerAccount, decTokenId)).toNumber()
      if (balance > 0) {
        tokens.push({
          tokenId: decTokenId,
          balance,
          metadata: await this.getTokenMetadata(decTokenId, update)
        })
      }
    }
    return tokens
  }
}

module.exports = { OpenSeaCollection, Network }
