const isMetaMaskInstalled = () => {
  const installed = typeof window.ethereum !== 'undefined'
  console.log(installed ? 'MetaMask is installed!' : 'MetaMask is NOT installed!')
  return installed
}

const connectMetaMask = async (installed) => {
  if (installed) {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
    console.log('Account Address:', accounts[0])
    return accounts[0]
  }
  return null
}

let account = null
const isInstalled = isMetaMaskInstalled()
let web3 = isInstalled && new Web3(window.ethereum)
const openseaContractABI = ABI
const openseaContractAddress = '0x2953399124f0cbb46d2cbacd8a89cf0599974963'
const openseaContract = new web3.eth.Contract(openseaContractABI, openseaContractAddress)

const getTokenId = () => {
  const decTokenId = document.getElementById('token-id').value
  const hexTokenId = '0x' + BigInt(decTokenId).toString(16)
  return { decTokenId, hexTokenId }
}

document.getElementById('connect').addEventListener('click', async () => {
  account = await connectMetaMask(isInstalled)
})

document.getElementById('get-items').addEventListener('click', async () => {
  const res = await fetch('items?' + new URLSearchParams({ account }))
  const data = await res.json()
  console.log(data)
})

document.getElementById('uri').addEventListener('click', async () => {
  const { hexTokenId } = getTokenId()
  // If a centralized storage is used for metadata, the results will always be the same:
  // https://testnets-api.opensea.io/api/v1/metadata/0x88B48F654c30e99bc2e4A1559b4Dcf1aD93FA656/0x{id}
  console.log('URI:', await openseaContract.methods.uri(hexTokenId).call())
})

document.getElementById('balance').addEventListener('click', async () => {
  const { hexTokenId } = getTokenId()
  console.log('Balance:', await openseaContract.methods.balanceOf(account, hexTokenId).call())
})

document.getElementById('burn').addEventListener('click', async () => {
  const { decTokenId, hexTokenId } = getTokenId()

  // it is better to use POST, GET method here to simplify the code
  const preapreRes = await fetch('prepare-coupon?' + new URLSearchParams({ tokenId: decTokenId }))
  const prepareData = await preapreRes.json()
  console.log(prepareData)

  const burn = (from, tokenId) => new Promise((resolve, reject) => {
    openseaContract.methods.burn(from, tokenId, 1).send({ from })
      .on('transactionHash', hash => {
        console.log('Tx Hash:', hash)
      })
      .on('receipt', receipt => {
        console.log('Success:', receipt)
        resolve(receipt.transactionHash)
      })
      .on('error', (error, receipt) => {
        console.warn('Rejected:', receipt)
        console.warn('Error:', error)
        reject(error)
      })
  })

  const txHash = await burn(account, hexTokenId)

  // it is better to use POST, GET method here to simplify the code
  const redeemRes = await fetch('redeem-coupon?' + new URLSearchParams({ tokenId: decTokenId, account, txHash }))
  const redeemData = await redeemRes.json()
  console.log(redeemData)
})
