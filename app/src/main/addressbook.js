const fs = require("fs-extra")
const { join } = require("path")
const axios = require("axios")
const url = require("url")

const LOGGING = JSON.parse(process.env.LOGGING || "true") !== false
const FIXED_NODE = process.env.COSMOS_NODE

module.exports = class Addressbook {
  constructor(
    config,
    configPath,
    { peers = [], onConnectionMessage = () => {} } = {}
  ) {
    this.peers = []
    this.config = config
    this.onConnectionMessage = onConnectionMessage

    // if we define a fixed node, we skip persistence
    if (FIXED_NODE) {
      this.addPeer(FIXED_NODE)
      return
    }

    this.addressbookPath = join(configPath, "addressbook.json")

    // add persistent peers to already stored peers
    peers.forEach(peer => this.addPeer(peer))

    this.persistToDisc()
  }

  async ping(peerURL) {
    let pingURL = `http://${peerURL}:${this.config.default_tendermint_port}`
    this.onConnectionMessage(`pinging node: ${pingURL}`)
    let nodeAlive = await axios
      .get(pingURL, { timeout: 3000 })
      .then(() => true, () => false)
    this.onConnectionMessage(
      `Node ${peerURL} is ${nodeAlive ? "alive" : "down"}`
    )
    return nodeAlive
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

  persistToDisc() {
    let peers = this.peers
      // only remember available nodes
      .filter(p => p.state === "available")
      .map(p => p.host)
    fs.ensureFileSync(this.addressbookPath)
    fs.writeFileSync(this.addressbookPath, JSON.stringify(peers), "utf8")
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
    if (!FIXED_NODE) {
      // remember the peers of the node and store them in the addressbook
      this.discoverPeers(curNode.host)
    }

    return curNode.host + ":" + this.config.default_tendermint_port
  }

  flagNodeOffline(nodeIP) {
    const host = nodeIP.split(":")[0]
    this.peers.find(p => p.host === host).state = "down"
  }

  flagNodeIncompatible(nodeIP) {
    const host = nodeIP.split(":")[0]
    this.peers.find(p => p.host === host).state = "incompatible"
  }

  resetNodes() {
    this.peers = this.peers.map(peer =>
      Object.assign({}, peer, {
        state: "available"
      })
    )
  }

  async discoverPeers(peerIP) {
    let subPeers = (await axios.get(
      `http://${peerIP}:${this.config.default_tendermint_port}/net_info`
    )).data.result.peers
    let subPeersHostnames = subPeers.map(peer => peer.node_info.listen_addr)

    subPeersHostnames
      // add new peers to state
      .forEach(subPeerHostname => {
        this.addPeer(subPeerHostname)
      })

    if (subPeersHostnames.length > 0) {
      this.persistToDisc()
    }
  }
}

function getHostname(peerURL) {
  // some urls like from peers do not have a protocol specified and are therefor not correctly parsed
  peerURL = peerURL.startsWith("http") ? peerURL : "http://" + peerURL
  peerURL = url.parse(peerURL)
  return peerURL.hostname
}
