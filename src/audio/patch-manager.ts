import { EurorackAudioNode } from './audio-node'

export interface PatchConnection {
  id: string
  sourceNodeId: string
  sourceOutput: string
  targetNodeId: string
  targetInput: string
  connected: boolean
}

export interface PatchManagerConfig {
  maxConnections?: number
}

export class PatchManager {
  private nodes: Map<string, EurorackAudioNode> = new Map()
  private connections: Map<string, PatchConnection> = new Map()
  private maxConnections: number

  constructor(config: PatchManagerConfig = {}) {
    this.maxConnections = config.maxConnections || 1000
  }

  registerNode(node: EurorackAudioNode): void {
    if (this.nodes.has(node.id)) {
      throw new Error(`Node with ID '${node.id}' is already registered`)
    }
    this.nodes.set(node.id, node)
  }

  unregisterNode(nodeId: string): void {
    const node = this.nodes.get(nodeId)
    if (!node) {
      return
    }

    // Disconnect all connections involving this node
    this.disconnectAllForNode(nodeId)
    
    // Remove node from registry
    this.nodes.delete(nodeId)
  }

  getNode(nodeId: string): EurorackAudioNode | undefined {
    return this.nodes.get(nodeId)
  }

  getAllNodes(): EurorackAudioNode[] {
    return Array.from(this.nodes.values())
  }

  connect(
    sourceNodeId: string,
    sourceOutput: string,
    targetNodeId: string,
    targetInput: string
  ): string {
    const sourceNode = this.nodes.get(sourceNodeId)
    const targetNode = this.nodes.get(targetNodeId)

    if (!sourceNode) {
      throw new Error(`Source node '${sourceNodeId}' not found`)
    }
    if (!targetNode) {
      throw new Error(`Target node '${targetNodeId}' not found`)
    }

    // Check if target input is already connected
    const existingConnection = this.findConnectionToInput(targetNodeId, targetInput)
    if (existingConnection) {
      throw new Error(`Input '${targetInput}' on node '${targetNodeId}' is already connected`)
    }

    // Check connection limits
    if (this.connections.size >= this.maxConnections) {
      throw new Error(`Maximum number of connections (${this.maxConnections}) reached`)
    }

    // Create connection
    const connectionId = this.generateConnectionId()
    const connection: PatchConnection = {
      id: connectionId,
      sourceNodeId,
      sourceOutput,
      targetNodeId,
      targetInput,
      connected: false,
    }

    try {
      // Make the actual audio connection
      sourceNode.connect(sourceOutput, targetNode, targetInput)
      connection.connected = true
      
      // Store the connection
      this.connections.set(connectionId, connection)
      
      return connectionId
    } catch (error) {
      throw new Error(`Failed to create connection: ${(error as Error).message}`)
    }
  }

  disconnect(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      throw new Error(`Connection '${connectionId}' not found`)
    }

    const sourceNode = this.nodes.get(connection.sourceNodeId)
    const targetNode = this.nodes.get(connection.targetNodeId)

    if (sourceNode && targetNode && connection.connected) {
      try {
        sourceNode.disconnect(connection.sourceOutput, targetNode, connection.targetInput)
      } catch (error) {
        console.warn(`Failed to disconnect audio nodes: ${(error as Error).message}`)
      }
    }

    this.connections.delete(connectionId)
  }

  disconnectAllForNode(nodeId: string): void {
    const connectionsToRemove: string[] = []

    for (const [connectionId, connection] of this.connections) {
      if (connection.sourceNodeId === nodeId || connection.targetNodeId === nodeId) {
        connectionsToRemove.push(connectionId)
      }
    }

    connectionsToRemove.forEach(connectionId => {
      try {
        this.disconnect(connectionId)
      } catch (error) {
        console.warn(`Failed to disconnect connection '${connectionId}': ${(error as Error).message}`)
      }
    })
  }

  getConnection(connectionId: string): PatchConnection | undefined {
    return this.connections.get(connectionId)
  }

  getAllConnections(): PatchConnection[] {
    return Array.from(this.connections.values())
  }

  getConnectionsForNode(nodeId: string): PatchConnection[] {
    return this.getAllConnections().filter(
      connection => connection.sourceNodeId === nodeId || connection.targetNodeId === nodeId
    )
  }

  getOutputConnections(nodeId: string, outputName?: string): PatchConnection[] {
    return this.getAllConnections().filter(connection => {
      return connection.sourceNodeId === nodeId && 
             (outputName === undefined || connection.sourceOutput === outputName)
    })
  }

  getInputConnections(nodeId: string, inputName?: string): PatchConnection[] {
    return this.getAllConnections().filter(connection => {
      return connection.targetNodeId === nodeId && 
             (inputName === undefined || connection.targetInput === inputName)
    })
  }

  findConnectionToInput(nodeId: string, inputName: string): PatchConnection | undefined {
    return this.getAllConnections().find(connection => 
      connection.targetNodeId === nodeId && connection.targetInput === inputName
    )
  }

  findConnectionFromOutput(nodeId: string, outputName: string): PatchConnection[] {
    return this.getAllConnections().filter(connection => 
      connection.sourceNodeId === nodeId && connection.sourceOutput === outputName
    )
  }

  // Validation methods
  canConnect(
    sourceNodeId: string,
    sourceOutput: string,
    targetNodeId: string,
    targetInput: string
  ): { canConnect: boolean; reason?: string } {
    const sourceNode = this.nodes.get(sourceNodeId)
    const targetNode = this.nodes.get(targetNodeId)

    if (!sourceNode) {
      return { canConnect: false, reason: `Source node '${sourceNodeId}' not found` }
    }
    if (!targetNode) {
      return { canConnect: false, reason: `Target node '${targetNodeId}' not found` }
    }

    if (!sourceNode.getOutput(sourceOutput)) {
      return { canConnect: false, reason: `Output '${sourceOutput}' not found on source node` }
    }
    if (!targetNode.getInput(targetInput)) {
      return { canConnect: false, reason: `Input '${targetInput}' not found on target node` }
    }

    const existingConnection = this.findConnectionToInput(targetNodeId, targetInput)
    if (existingConnection) {
      return { canConnect: false, reason: 'Target input is already connected' }
    }

    if (this.connections.size >= this.maxConnections) {
      return { canConnect: false, reason: 'Maximum number of connections reached' }
    }

    // Prevent feedback loops (basic check)
    if (this.wouldCreateCycle(sourceNodeId, targetNodeId)) {
      return { canConnect: false, reason: 'Connection would create feedback loop' }
    }

    return { canConnect: true }
  }

  // Simple cycle detection to prevent feedback loops
  private wouldCreateCycle(fromNodeId: string, toNodeId: string): boolean {
    const visited = new Set<string>()
    
    const hasPath = (currentNodeId: string, targetNodeId: string): boolean => {
      if (currentNodeId === targetNodeId) {
        return true
      }
      
      if (visited.has(currentNodeId)) {
        return false
      }
      
      visited.add(currentNodeId)
      
      const outConnections = this.getOutputConnections(currentNodeId)
      return outConnections.some(connection => 
        hasPath(connection.targetNodeId, targetNodeId)
      )
    }
    
    return hasPath(toNodeId, fromNodeId)
  }

  clear(): void {
    // Disconnect all connections
    const connectionIds = Array.from(this.connections.keys())
    connectionIds.forEach(id => {
      try {
        this.disconnect(id)
      } catch (error) {
        console.warn(`Failed to disconnect connection during clear: ${(error as Error).message}`)
      }
    })

    // Clear all nodes
    this.nodes.clear()
  }

  getStats(): {
    nodeCount: number
    connectionCount: number
    maxConnections: number
  } {
    return {
      nodeCount: this.nodes.size,
      connectionCount: this.connections.size,
      maxConnections: this.maxConnections,
    }
  }

  private generateConnectionId(): string {
    return `patch-${Math.random().toString(36).substr(2, 12)}`
  }
}

// Global singleton instance
let globalPatchManager: PatchManager | null = null

export function getPatchManager(): PatchManager {
  if (!globalPatchManager) {
    globalPatchManager = new PatchManager()
  }
  return globalPatchManager
}

export function resetPatchManager(): void {
  if (globalPatchManager) {
    globalPatchManager.clear()
    globalPatchManager = null
  }
}