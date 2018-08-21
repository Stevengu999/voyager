let semver = require("semver")
const url = require("url")

const LOGGING = JSON.parse(process.env.LOGGING || "true") !== false

module.exports = class Addressbook {
  constructor(peers = [], options) {
    Object.assign(
      this,
      {
        expectedNodeVersion: undefined,

        // whether we should use only the single provided peer
        fixedNode: false,

        onConnectionMessage: () => {},

        // used for initialization; don't pass this as an option
        peers: [],

        // a callback that persists a list of peers to disc
        persistToDisc: () => {}
      },
      options
    )

    peers.forEach(peer => this.addPeer(peer))
  }

  async ping(peerURL) {
    let pingURL = `http://${peerURL}:${
      this.config.default_tendermint_port
    }/status`

    this.onConnectionMessage(`pinging node: ${pingURL}`)

    let nodeVersion

    try {
      nodeVersion = (await this.fetch(pingURL, {
        timeout: 3000
      })).data.result.node_info.version
    } catch (exception) {
      return false
    }

    let semverDiff = semver.diff(nodeVersion, this.expectedNodeVersion)
    const compatible = semverDiff === "patch" || semverDiff === null

    this.onConnectionMessage(
      `Node ${peerURL} is ${compatible ? "compatible" : "incompatible"}.`
    )

    return compatible
  }

  peerIsKnown(peerURL) {
    // we only store the hostname as we want to set protocol and port ourselfs
    let peerHost = getHostname(peerURL)
    return this.peers.find(peer => peer.host.indexOf(peerHost) !== -1)
  }

  // adds the new peer to the list of peers
  addPeer(peerURL) {
    if (!this.peerIsKnown(peerURL)) {
      let peerHost = getHostname(peerURL)
      LOGGING && console.log("Adding new peer:", peerHost)
      this.peers.push({
        host: peerHost,
        // assume that new peers are available
        state: "available"
      })
    }
  }

  // returns an available node or throws if it can't find any
  async pickNode() {
    let availableNodes = this.peers.filter(node => node.state === "available")
    if (availableNodes.length === 0) {
      throw Error("No nodes available to connect to")
    }
    // pick a random node
    let curNode =
      availableNodes[Math.floor(Math.random() * availableNodes.length)]

    let nodeAlive = await this.ping(curNode.host)
    if (!nodeAlive) {
      this.flagNodeOffline(curNode.host)

      return this.pickNode()
    }

    this.onConnectionMessage("Picked node: " + curNode.host)

    // we skip discovery for fixed nodes as we want to always return the same node
    if (!this.fixedNode) {
      // remember the peers of the node and store them in the addressbook
      this.discoverPeers(curNode.host)
    }

    return curNode.host + ":" + this.config.default_tendermint_port
  }

  flagNodeOffline(nodeIP) {
    const host = nodeIP.split(":")[0]
    this.peers.find(p => p.host === host).state = "down"
  }

  resetNodes() {
    this.peers = this.peers.map(peer =>
      Object.assign({}, peer, {
        state: "available"
      })
    )
  }

  async discoverPeers(peerIP) {
    let subPeers = (await this.fetch(
      `http://${peerIP}:${this.config.default_tendermint_port}/net_info`
    )).data.result.peers
    let subPeersHostnames = subPeers.map(peer => peer.node_info.listen_addr)

    subPeersHostnames
      // add new peers to state
      .forEach(subPeerHostname => {
        this.addPeer(subPeerHostname)
      })

    if (subPeersHostnames.length > 0) {
      let peers = this.peers
        // only remember available nodes
        .filter(p => p.state === "available")
        .map(p => p.host)

      this.persistToDisc(peers)
    }
  }
}

function getHostname(peerURL) {
  // some urls like from peers do not have a protocol specified and are therefor not correctly parsed
  peerURL = peerURL.startsWith("http") ? peerURL : "http://" + peerURL
  peerURL = url.parse(peerURL)
  return peerURL.hostname
}
