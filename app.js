const express = require('express')
const path = require('path')
const { OpenSeaCollection, Network } = require('./lib/collection.js')

const app = express()
const port = 3000
const collection = new OpenSeaCollection('0x2953399124f0cbb46d2cbacd8a89cf0599974963', Network.Matic)

const redeemedCoupons = {}

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.get('/items', async (req, res) => {
  const account = req.query.account
  if (account && account !== 'null') {
    const items = await collection.enumerateTokens(account)
    res.send(items)
  } else {
    res.send([])
  }
})

app.get('/prepare-coupon', async (req, res) => {
  const tokenId = req.query.tokenId
  if (tokenId && tokenId !== 'null') {
    await collection.getTokenMetadata(tokenId)
    console.log('Prepared:', tokenId)
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

  try {
    // we need to make sure that this transaction has not been submitted before
    const found = (redeemedCoupons[account] || [])
      .find(entry => entry.txHash.toLowerCase() === txHash.toLowerCase())
    if (found) {
      throw new Error('tx hash already submitted')
    }

    await collection.verifyTxHash(account, tokenId, txHash)
  } catch (error) {
    // log the error, but do not return it in response,
    // so as not to help the attacker predict the transaction verification algorithm
    console.warn(error.message, account, tokenId, txHash)
    return res.send({
      success: false,
      error: 'tx hash verification failed'
    })
  }

  const coupon = Math.floor(Math.random() * 1000000000).toString()
  redeemedCoupons[account] = redeemedCoupons[account] || []
  redeemedCoupons[account].push({
    tokenId,
    txHash,
    coupon
  })

  console.log('All redeemed coupons:', redeemedCoupons)

  res.send({ coupon })
})

app.listen(port, async () => {
  console.log('Initialization...')
  await collection.init()
  await collection.registerTokenId('84466660791578197043326924592760112328543781438107443754154382889795478094224')
  await collection.registerTokenId('84466660791578197043326924592760112328543781438107443754154382890894989721700')
  console.log(`Listening on port ${port}`)
})
