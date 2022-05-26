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

const getNetworkCode = (id) => {
  const networks = {
    1: 'ethereum',
    3: 'ropsten',
    4: 'rinkeby',
    5: 'goerli',
    42: 'kovan',
    137: 'polygon',
    80001: 'mumbai',
    31337: 'hardhat'
  }
  return networks[Number(id)] || 'unknown'
}

const connectMetaMask = async (installed) => {
  if (installed) {
    const provider = window.ethereum.providers.find((provider) => provider.isMetaMask) // provider.isCoinbaseWallet
    const accounts = await provider.request({ method: 'eth_requestAccounts' })
    console.log('Account Address:', accounts[0])
    return {
      provider,
      account: accounts[0]
    }
  }
  return null
}

const getChainID = async () => {
  return provider.request({ method: 'eth_chainId' })
}

const switchNetwork = async () => {
  try {
    const MaticNetworkId = '0x89'
    let chainId = await getChainID()

    if (chainId !== MaticNetworkId) {
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: MaticNetworkId }]
        })
        chainId = await getChainID()
      } catch (error) {
        console.warn(error)
        if (error.code !== 4902) {
          return 0
        }

        await provider.request({
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
    return provider.request({
      method: 'personal_sign',
      params: [msg, from]
    })
  } catch (err) {
    console.error(err)
  }
  return null
}

let provider = null
let account = null
const isInstalled = isMetaMaskInstalled()
const openseaContractABI = ABI
const openseaContracts = {
  ethereum: () => new (new Web3(provider)).eth.Contract(openseaContractABI, '0x495f947276749ce646f68ac8c248420045cb7b5e'),
  polygon: () => new (new Web3(provider)).eth.Contract(openseaContractABI, '0x2953399124f0cbb46d2cbacd8a89cf0599974963'),
  rinkeby: () => new (new Web3(provider)).eth.Contract(openseaContractABI, '0x88b48f654c30e99bc2e4a1559b4dcf1ad93fa656')
}

const openseaBurnFunctions = {
  ethereum: (from, tokenId) => openseaContracts.ethereum().methods.safeTransferFrom(from, '0x0000000000000000000000000000000000000001', tokenId, 1, []),
  polygon: (from, tokenId) => openseaContracts.polygon().methods.burn(from, tokenId, 1),
  rinkeby: (from, tokenId) => openseaContracts.rinkeby().methods.burn(from, tokenId, 1)
}

const getTokenId = () => {
  const decTokenId = document.getElementById('token-id').value
  const hexTokenId = '0x' + BigInt(decTokenId).toString(16)
  return { decTokenId, hexTokenId }
}

document.getElementById('connect').addEventListener('click', async () => {
  const connection = await connectMetaMask(isInstalled)
  provider = connection.provider
  account = connection.account
})

document.getElementById('switch').addEventListener('click', async () => {
  const chainId = await switchNetwork()
  console.log('Connected to', getNetworkName(chainId))
})

document.getElementById('get-items').addEventListener('click', async () => {
  const network = getNetworkCode(await getChainID())
  const res = await fetch('items?' + new URLSearchParams({ account, network }))
  const data = await res.json()
  console.log(data)
})

document.getElementById('get-redeemed-items').addEventListener('click', async () => {
  const network = getNetworkCode(await getChainID())
  const res = await fetch('redeemed-items?' + new URLSearchParams({ account, network }))
  const data = await res.json()
  console.log(data)
})

document.getElementById('uri').addEventListener('click', async () => {
  const { hexTokenId } = getTokenId()
  const network = getNetworkCode(await getChainID())
  // If a centralized storage is used for metadata, the results will always be the same:
  // https://testnets-api.opensea.io/api/v1/metadata/0x88B48F654c30e99bc2e4A1559b4Dcf1aD93FA656/0x{id}
  console.log('URI:', await openseaContracts[network]().methods.uri(hexTokenId).call())
})

document.getElementById('balance').addEventListener('click', async () => {
  const { hexTokenId } = getTokenId()
  const network = getNetworkCode(await getChainID())
  console.log('Balance:', await openseaContracts[network]().methods.balanceOf(account, hexTokenId).call())
})

document.getElementById('burn').addEventListener('click', async () => {
  const { decTokenId, hexTokenId } = getTokenId()
  const network = getNetworkCode(await getChainID())

  // it is better to use POST, GET method here to simplify the code
  const preapreRes = await fetch('prepare-coupon?' + new URLSearchParams({ tokenId: decTokenId, network }))
  const prepareData = await preapreRes.json()
  console.log(prepareData)

  const burn = (from, tokenId) => new Promise((resolve, reject) => {
    openseaBurnFunctions[network](from, tokenId).send({ from })
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
  const redeemRes = await fetch('redeem-coupon?' + new URLSearchParams({ tokenId: decTokenId, account, txHash, network }))
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
