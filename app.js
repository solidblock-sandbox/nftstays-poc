const express = require('express')
const opensea = require('opensea-js')
const path = require('path')
const app = express()
const port = 3000
const api = new opensea.OpenSeaAPI({ networkName: opensea.Network.Rinkeby })
const rinkebyContractAddress = '0x88b48f654c30e99bc2e4a1559b4dcf1ad93fa656'

const preparedCoupons = {}
const redeemedCoupons = {}

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.get('/items', async (req, res) => {
  const account = req.query.account
  if (account && account !== 'null') {
    const assetsRes = await api.getAssets({
      owner: account,
      order_direction: 'desc',
      offset: '0',
      limit: '20',
      collection: 'hotel-x'
    })

    res.send(assetsRes.assets)
  } else {
    res.send([])
  }
})

app.get('/prepare-coupon', async (req, res) => {
  const tokenId = req.query.tokenId
  if (tokenId && tokenId !== 'null') {
    const assetRes = await api.getAsset({
      tokenAddress: rinkebyContractAddress,
      tokenId
    })

    preparedCoupons[tokenId] = assetRes
    console.log('Prepared:', tokenId, '=>', assetRes.name)
    res.send({ success: true })
  } else {
    res.send({ success: false })
  }
})

app.get('/redeem-coupon', async (req, res) => {
  const tokenId = req.query.tokenId
  const account = req.query.account
  const txHash = req.query.txHash

  if (!tokenId || tokenId === 'null') {
    return res.send({
      success: false,
      error: '`tokenId` field is empty'
    })
  }
  if (!account || account === 'null') {
    return res.send({
      success: false,
      error: '`account` field is empty'
    })
  }
  if (!txHash || txHash === 'null') {
    return res.send({
      success: false,
      error: '`txHash` field is empty'
    })
  }

  const prepared = preparedCoupons[tokenId]
  if (!prepared) {
    // try to request data from the OpenSea API, probably they are cached for some time
    console.warn('storing redemption data without coupon information')
  }

  // WARNIGN: There should be a transaction hash check for authenticity.
  // Implementation temporarily delayed to meet project deadline

  const coupon = Math.floor(Math.random() * 1000000000).toString()
  redeemedCoupons[account] = redeemedCoupons[account] || []
  redeemedCoupons[account].push({
    tokenId,
    type: prepared ? prepared.name : null,
    txHash,
    coupon
  })

  console.log('All redeemed coupons:', redeemedCoupons)

  res.send({ coupon })
})

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})
