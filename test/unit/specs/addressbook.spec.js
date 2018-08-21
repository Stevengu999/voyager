const Addressbook = require("src/main/addressbook.js")

const options = {
  config: {
    default_tendermint_port: 26657
  },

  expectedNodeVersion: `0.13.0`,

  fetch: async url => {
    const results = {
      net_info: { peers: [] },
      status: { node_info: { version: `0.13.0` } }
    }

    const pathname = new URL(url).pathname.slice(1)
    return { data: { result: results[pathname] } }
  }
}

describe("Addressbook", () => {
  it("should add given peers", () => {
    let addressbook = new Addressbook(["1.2.3.4"], options)

    expect(addressbook.peers.map(p => p.host)).toContain("1.2.3.4")
  })

  it("should return node", async () => {
    let addressbook = new Addressbook(["1.2.3.4"], options)
    let node = await addressbook.pickNode()
    expect(node).toEqual(`1.2.3.4:26657`)
  })

  it("should always return a specified node", async () => {
    let addressbook = new Addressbook(
      ["1.2.3.4"],
      Object.assign({}, options, {
        fixedNode: true
      })
    )

    expect(await addressbook.pickNode()).toEqual(`1.2.3.4:26657`)
  })

  it("should cycle though nodes until it finds one that is available", async () => {
    const fetch = async url => {
      const { hostname, pathname } = new URL(url)

      const results = {
        status: { node_info: { version: `0.13.0` } },
        net_info: { peers: [] }
      }

      return hostname === `1.2.3.4`
        ? Promise.reject()
        : { data: { result: results[pathname.slice(1)] } }
    }

    let addressbook = new Addressbook(
      ["1.2.3.4", "5.6.7.8"],
      Object.assign({}, options, {
        fetch
      })
    )

    let node = await addressbook.pickNode()
    expect(node).toEqual(`5.6.7.8:26657`)
  })

  it("should cycle though nodes until it finds one that is compatible", async () => {
    const fetch = async url => {
      const { hostname, pathname } = new URL(url)

      // 0.1.0 should fail as expected version is 0.13.0
      // 0.13.2 should succeed as in semver range
      const results = {
        status: {
          node_info: {
            version: hostname === `1.2.3.4` ? `0.1.0` : `0.13.2`
          }
        },
        net_info: { peers: [] }
      }

      return { data: { result: results[pathname.slice(1)] } }
    }

    let addressbook = new Addressbook(
      ["1.2.3.4", "5.6.7.8"],
      Object.assign({}, options, {
        fetch
      })
    )

    let node = await addressbook.pickNode()
    expect(node).toEqual(`5.6.7.8:26657`)
  })

  it("should throw an error if there are no nodes available", async done => {
    let addressbook = new Addressbook(
      ["1.2.3.4", "5.6.7.8"],
      Object.assign({}, options, {
        fetch: () => Promise.reject()
      })
    )

    await addressbook.pickNode().then(done.fail, err => {
      expect(err.message).toMatch("No nodes available to connect to")
      done()
    })
  })

  it("should query peers on connecting to a node", async () => {
    let addressbook = new Addressbook(["1.2.3.4", "5.6.7.8"], options)
    addressbook.discoverPeers = jest.fn()
    await addressbook.pickNode()
    expect(addressbook.discoverPeers).toHaveBeenCalled()
  })

  it("should query and store peers of connected node", async () => {
    const fetch = async () => {
      return {
        data: {
          result: {
            peers: [
              {
                node_info: {
                  listen_addr: "323.456.123.456"
                }
              },
              {
                node_info: {
                  listen_addr: "423.456.123.456"
                }
              }
            ]
          }
        }
      }
    }

    let persisted = []

    const persistToDisc = peers => {
      persisted = peers
    }

    let addressbook = new Addressbook(
      ["1.2.3.4", "5.6.7.8"],
      Object.assign({}, options, {
        fetch,
        persistToDisc
      })
    )

    await addressbook.discoverPeers("1.2.3.4")
    expect(addressbook.peers.map(p => p.host)).toContain("323.456.123.456")
    expect(addressbook.peers.map(p => p.host)).toContain("423.456.123.456")

    expect(persisted).toContain("323.456.123.456")
    expect(persisted).toContain("423.456.123.456")
  })

  it("should provide the ability to reset the state of the nodes to try to reconnect to all, i.e. after an internet outage", async done => {
    let addressbook = new Addressbook(["1.2.3.4", "5.6.7.8"], options)

    addressbook.peers = addressbook.peers.map(p => {
      p.state = "down"
      return p
    })

    await addressbook.pickNode().then(done.fail, err => {
      expect(err.message).toMatch("No nodes available to connect to")
    })

    addressbook.resetNodes()

    await addressbook.pickNode().then(() => done(), done.fail)
  })

  it("should allow http addresses as peer addresses", async () => {
    let addressbook = new Addressbook(["http://1.2.3.4"], options)
    let node = await addressbook.pickNode()
    expect(node).toEqual(`1.2.3.4:26657`)
  })

  it("should call back on connection", async () => {
    let spy = jest.fn()
    let addressbook = new Addressbook(
      ["http://1.2.3.4"],
      Object.assign({}, options, {
        onConnectionMessage: spy
      })
    )

    await addressbook.pickNode()
    expect(spy).toHaveBeenCalled()
  })
})
