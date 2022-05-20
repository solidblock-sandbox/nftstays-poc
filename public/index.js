const isMetaMaskInstalled = () => {
  const installed = typeof window.ethereum !== 'undefined'
  console.log(installed ? 'MetaMask is installed!' : 'MetaMask is NOT installed!')
  return installed
}

const getNetworkName = (id) => {
  const networks = {
    1: 'Ethereum Mainnet',
    3: 'Ropsten Test Network',
    4: 'Rinkeby Test Network',
    5: 'Goerli Test Network',
    42: 'Kovan Test Network',
    137: 'Polygon Mainnet',
    80001: 'Mumbai Test Network',
    31337: 'Hardhat Local Node'
  }
  return networks[Number(id)] || 'Unknown Network'
}

const connectMetaMask = async (installed) => {
  if (installed) {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
    console.log('Account Address:', accounts[0])
    return accounts[0]
  }
  return null
}

const getChainID = async () => {
  return window.ethereum.request({ method: 'eth_chainId' })
}

const switchNetwork = async () => {
  try {
    const MaticNetworkId = '0x89'
    let chainId = await getChainID()

    if (chainId !== MaticNetworkId) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: MaticNetworkId }]
        })
        chainId = await getChainID()
      } catch (error) {
        console.warn(error)
        if (error.code !== 4902) {
          return 0
        }

        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: MaticNetworkId,
              chainName: 'Polygon Mainnet',
              rpcUrls: ['https://polygon-rpc.com'],
              blockExplorerUrls: ['https://polygonscan.com'],
              nativeCurrency: {
                symbol: 'MATIC',
                decimals: 18
              }
            }
          ]
        })
        chainId = await getChainID()
      }
    }
    return chainId
  } catch (error) {
    console.error(error)
  }
  return 0
}

const signMessage = async (from, msg) => {
  try {
    return window.ethereum.request({
      method: 'personal_sign',
      params: [msg, from]
    })
  } catch (err) {
    console.error(err)
  }
  return null
}

let account = null
const isInstalled = isMetaMaskInstalled()
const web3 = isInstalled && new Web3(window.ethereum)
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

document.getElementById('switch').addEventListener('click', async () => {
  const chainId = await switchNetwork(isInstalled)
  console.log('Connected to', getNetworkName(chainId))
})

document.getElementById('get-items').addEventListener('click', async () => {
  const res = await fetch('items?' + new URLSearchParams({ account }))
  const data = await res.json()
  console.log(data)
})

document.getElementById('get-redeemed-items').addEventListener('click', async () => {
  const res = await fetch('redeemed-items?' + new URLSearchParams({ account }))
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

document.getElementById('recover').addEventListener('click', async () => {
  const txHash = document.getElementById('tx-hash').value

  const authRes = await fetch('auth-recover-coupon?' + new URLSearchParams({ account, txHash }))
  const authData = await authRes.json()
  console.log(authData)

  if (authData.error) {
    return
  }

  const token = authData.token
  const signature = await signMessage(account, authData.msg)

  const recoverRes = await fetch('recover-coupon?' + new URLSearchParams({ token, signature }))
  const recoverData = await recoverRes.json()
  console.log(recoverData)
})
