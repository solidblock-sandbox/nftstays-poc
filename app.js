const express = require('express')
const path = require('path')
const { OpenSeaCollection, Network } = require('./lib/collection.js')
const { Authentication } = require('./lib/authentication.js')

const app = express()
const port = 3000
const collections = {
  polygon: new OpenSeaCollection('0x2953399124f0cbb46d2cbacd8a89cf0599974963', Network.PolygonMainnet),
  ethereum: new OpenSeaCollection('0x495f947276749ce646f68ac8c248420045cb7b5e', Network.InfuraEthereumMainnet('cdbd01e3d...........26cc3728e')),
  rinkeby: new OpenSeaCollection('0x88b48f654c30e99bc2e4a1559b4dcf1ad93fa656', Network.InfuraRinkebyTestnet('cdbd01e3d...........26cc3728e'))
}

const authentication = new Authentication('Authenticate your account by signing the one-time generated token.')

const redeemedCoupons = {}
function getRedeemedCoupon (account, txHash) {
  return (redeemedCoupons[account.toLowerCase()] || [])
    .find(entry => entry.txHash.toLowerCase() === txHash.toLowerCase())
}

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.get('/items', async (req, res) => {
  const network = req.query.network || 'polygon'
  let account = req.query.account
  if (account && account !== 'null') {
    account = account.toLowerCase()
    const items = await collections[network].enumerateTokens(account)
    res.send(items)
  } else {
    res.send([])
  }
})

app.get('/redeemed-items', async (req, res) => {
  const network = req.query.network || 'polygon'
  let account = req.query.account
  if (account && account !== 'null') {
    account = account.toLowerCase()
    const items = []
    const redeemed = redeemedCoupons[account] || []

    for (const coupon of redeemed) {
      items.push({
        tokenId: coupon.tokenId,
        txHash: coupon.txHash,
        metadata: await collections[network].getTokenMetadata(coupon.tokenId)
      })
    }
    res.send(items)
  } else {
    res.send([])
  }
})

app.get('/prepare-coupon', async (req, res) => {
  const network = req.query.network || 'polygon'
  const tokenId = req.query.tokenId
  if (tokenId && tokenId !== 'null') {
    await collections[network].getTokenMetadata(tokenId)
    console.log('Prepared:', tokenId)
    res.send({ success: true })
  } else {
    res.send({ success: false })
  }
})

app.get('/redeem-coupon', async (req, res) => {
  const network = req.query.network || 'polygon'
  const tokenId = req.query.tokenId
  const txHash = req.query.txHash
  let account = req.query.account

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

  account = account.toLowerCase()

  try {
    // we need to make sure that this transaction has not been submitted before
    const found = getRedeemedCoupon(account, txHash)
    if (found) {
      throw new Error('tx hash already submitted')
    }

    await collections[network].verifyTxHash(account, tokenId, txHash)
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
    network,
    tokenId,
    txHash,
    coupon
  })

  console.log('All redeemed coupons:', redeemedCoupons)

  res.send({ coupon })
})

app.get('/auth-recover-coupon', async (req, res) => {
  const txHash = req.query.txHash
  let account = req.query.account

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

  account = account.toLowerCase()

  const found = getRedeemedCoupon(account, txHash)

  if (!found) {
    return res.send({
      success: false,
      error: `transaction hash ${txHash} is not registered for ${account} account`
    })
  }

  const auth = authentication.generate(account, { txHash })
  res.send(auth)
})

app.get('/recover-coupon', async (req, res) => {
  const token = req.query.token
  const signature = req.query.signature

  if (!token || token === 'null') {
    return res.send({
      success: false,
      error: '`token` field is empty'
    })
  }
  if (!signature || signature === 'null') {
    return res.send({
      success: false,
      error: '`signature` field is empty'
    })
  }

  const stored = authentication.authenticate(token, signature)

  if (!stored) {
    return res.send({
      success: false,
      error: 'authentication failed'
    })
  }

  const found = getRedeemedCoupon(stored.account, stored.data.txHash)

  if (!found) {
    return res.send({
      success: false,
      error: 'authentication server error, contact support'
    })
  }

  res.send({ coupon: found.coupon })
})

app.listen(port, async () => {
  console.log('Initialization...')
  await collections.polygon.init()
  await collections.polygon.registerTokenId('84466660791578197043326924592760112328543781438107443754154382889795478094224')
  await collections.polygon.registerTokenId('84466660791578197043326924592760112328543781438107443754154382890894989721700')

  await collections.ethereum.init()
  await collections.ethereum.registerTokenId('74066301794831466583883104733052380198809370620353126000416070128809445163108')

  await collections.rinkeby.init()
  await collections.rinkeby.registerTokenId('84466660791578197043326924592760112328543781438107443754154382895293036232705')
  await sleep(500) // to prevent error response 'Request was throttled. Expected available in 1 second.'
  await collections.rinkeby.registerTokenId('84466660791578197043326924592760112328543781438107443754154382894193524604929')
  await sleep(500)
  await collections.rinkeby.registerTokenId('84466660791578197043326924592760112328543781438107443754154382896392547861480')
  console.log(`Listening on port ${port}`)
})

async function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
