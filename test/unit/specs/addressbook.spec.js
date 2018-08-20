let Addressbook

const mockConfig = {
  default_tendermint_port: 26657
}

describe("Addressbook", () => {
  beforeEach(() => {
    jest.resetModules()
    Addressbook = require("src/main/addressbook.js")

    jest.mock("axios", () => ({
      get: async () => {
        return { data: { result: { peers: [] } } }
      }
    }))
  })

  it("should add given peers", () => {
    let addressbook = new Addressbook(mockConfig, () => {}, {
      peers: ["123.456.123.456"]
    })

    expect(addressbook.peers.map(p => p.host)).toContain("123.456.123.456")
  })

  it("should return node", async () => {
    jest.doMock("axios", () => ({
      get: async () => {
        return { data: { result: { peers: [] } } }
      }
    }))
    jest.resetModules()
    Addressbook = require("src/main/addressbook.js")

    let addressbook = new Addressbook(mockConfig, () => {}, {
      onConnectionMessage: console.log,
      peers: ["123.456.123.456"]
    })
    let node = await addressbook.pickNode()
    expect(node).toMatchSnapshot()
  })

  it("should always return a specified node", async () => {
    jest.resetModules()
    let addressbook = new Addressbook(mockConfig, () => {}, {
      fixedNode: true,
      peers: ["123.456.123.456"]
    })

    expect(await addressbook.pickNode()).toMatchSnapshot()
  })

  it("should cycle though nodes until it finds one that is available", async () => {
    jest.doMock("axios", () => ({
      get: async url => {
        if (url.indexOf("123.456.123.456") !== -1) return Promise.reject()
        return Promise.resolve({
          data: { result: { peers: [] } }
        })
      }
    }))
    jest.resetModules()
    Addressbook = require("src/main/addressbook.js")

    let addressbook = new Addressbook(mockConfig, () => {}, {
      peers: ["123.456.123.456", "223.456.123.456"]
    })
    let node = await addressbook.pickNode()
    expect(node).toMatchSnapshot()
  })

  it("should throw an error if there are no nodes available", async done => {
    jest.doMock("axios", () => ({
      get: async () => {
        return Promise.reject()
      }
    }))
    jest.resetModules()
    Addressbook = require("src/main/addressbook.js")

    let addressbook = new Addressbook(mockConfig, () => {}, {
      peers: ["123.456.123.456", "223.456.123.456"]
    })
    await addressbook.pickNode().then(done.fail, err => {
      expect(err.message).toMatch("No nodes available to connect to")
      done()
    })
  })

  it("should query peers on connecting to a node", async () => {
    jest.doMock("axios", () => ({
      get: async () => {
        return { data: { result: { peers: [] } } }
      }
    }))
    jest.resetModules()
    Addressbook = require("src/main/addressbook.js")

    let addressbook = new Addressbook(mockConfig, () => {}, {
      peers: ["123.456.123.456", "223.456.123.456"]
    })
    addressbook.discoverPeers = jest.fn()
    await addressbook.pickNode()
    expect(addressbook.discoverPeers).toHaveBeenCalled()
  })

  it("should query and store peers of connected node", async () => {
    jest.doMock("axios", () => ({
      get: async () => {
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
    }))
    jest.resetModules()
    Addressbook = require("src/main/addressbook.js")

    let persisted = []

    const persistToDisc = peers => {
      persisted = peers
    }

    let addressbook = new Addressbook(mockConfig, persistToDisc, {
      peers: ["123.456.123.456", "223.456.123.456"]
    })
    await addressbook.discoverPeers("123.456.123.456")
    expect(addressbook.peers.map(p => p.host)).toContain("323.456.123.456")
    expect(addressbook.peers.map(p => p.host)).toContain("423.456.123.456")

    expect(persisted).toContain("323.456.123.456")
    expect(persisted).toContain("423.456.123.456")
  })

  it("should provide the ability to reset the state of the nodes to try to reconnect to all, i.e. after an internet outage", async done => {
    let addressbook = new Addressbook(mockConfig, () => {}, {
      peers: ["123.456.123.456", "223.456.123.456"]
    })

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
    let addressbook = new Addressbook(mockConfig, () => {}, {
      peers: ["http://123.456.123.456"]
    })
    let node = await addressbook.pickNode()
    expect(node).toMatchSnapshot()
  })

  it("should call back on connection", async () => {
    let spy = jest.fn()
    let addressbook = new Addressbook(mockConfig, () => {}, {
      peers: ["http://123.456.123.456"],
      onConnectionMessage: spy
    })
    await addressbook.pickNode()
    expect(spy).toHaveBeenCalled()
  })

  it("should flag nodes incompatible", async done => {
    let addressbook = new Addressbook(mockConfig, () => {}, {
      peers: ["http://123.456.123.456"]
    })
    addressbook.flagNodeIncompatible("123.456.123.456")
    await addressbook
      .pickNode()
      .then(done.fail)
      .catch(() => done())
  })
})
