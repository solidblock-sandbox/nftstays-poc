const ethers = require('ethers')
const axios = require('axios')
const { AssetContractSharedAbi } = require('./AssetContractShared.abi.js')
const { Network } = require('./common.js')

class OpenSeaCollection {
  constructor(collectionAddress, network) {
    this.provider = new ethers.providers.JsonRpcProvider(network)
    this.iface = new ethers.utils.Interface(AssetContractSharedAbi)
    this.contract = new ethers.Contract(collectionAddress, this.iface, this.provider)
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

  async verifyTxHash(account, tokenId, txHash) {
    const receipt = await this.provider.getTransactionReceipt(txHash)
    if (Number(receipt.status) !== 1) {
      throw new Error('transaction has failed')
    }
    if (receipt.to.toLowerCase() !== this.contract.address.toLowerCase()) {
      throw new Error('wrong `to` address')
    }
    if (receipt.from.toLowerCase() !== account.toLowerCase()) {
      throw new Error('wrong `from` address')
    }

    const topics = ['0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62']
    const logs = receipt.logs.filter(log => topics.some(t => t === log.topics[0]))
    if (logs.length === 0) {
      throw new Error('no required logs')
    }

    const events = logs
      .map(log => this.iface.parseLog(log))
      .filter(event => event.args.from.toLowerCase() === account.toLowerCase())

    if (events.length === 0) {
      throw new Error('wrong burner address')
    }
    if (events.length !== 1) {
      throw new Error('unexpected transaction format')
    }
    const event = events[0]
    if (event.args.to.toLowerCase() !== '0x0000000000000000000000000000000000000000') {
      throw new Error('the transaction does not burn the asset')
    }
    if (event.args.id.toString() !== tokenId) {
      throw new Error('wrong token id')
    }
    if (event.args.value.toNumber() === 0) {
      throw new Error('wrong amount to burn')
    }
    if (event.args.value.toNumber() > 1) {
      console.warn('more than 1 asset burned unexpectedly, data loss possible')
    }

    return true
  }
}

module.exports = { OpenSeaCollection, Network }
