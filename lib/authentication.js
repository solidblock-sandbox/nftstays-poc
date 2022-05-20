const { recoverPersonalSignature } = require('eth-sig-util')

function makeToken(length) {
  let result = ''
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < length; i++) {
    result += alphabet.charAt(Math.floor(Math.random() * alphabet.length))
  }
  return result
}

function makeMessage(info, token) {
  return `${info}\n\n${token}`
}

class Authentication {
  constructor(info) {
    this.info = info
    this.storage = {}
  }

  generate(account, data) {
    const token = makeToken(32)
    this.storage[token] = {
      account: account.toLocaleLowerCase(),
      data
    }
    return { token, msg: makeMessage(this.info, token) }
  }

  authenticate(token, signature) {
    const stored = this.storage[token]

    if (!stored) {
      throw new Error(`No message was generated for the ${token} token`)
    }

    const recoveredAddress = recoverPersonalSignature({
      data: makeMessage(this.info, token),
      sig: signature
    }).toLocaleLowerCase()

    const authenticated = stored.account === recoveredAddress

    if (authenticated) {
      delete this.storage[token]
      return stored
    }

    return null
  }
}

module.exports = { Authentication }
