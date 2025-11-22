/**
 * Packet & Traffic Analysis Module
 * Provides network packet capture and traffic analysis capabilities
 */

const si = require('systeminformation');
const os = require('os');

class PacketAnalyzer {
    constructor() {
        this.captureActive = false;
        this.packets = [];
        this.statistics = {
            totalPackets: 0,
            totalBytes: 0,
            startTime: null,
            endTime: null,
            protocols: {},
            connections: {}
        };
    }

    /**
     * Start packet capture
     */
    async startCapture(options = {}) {
        if (this.captureActive) {
            throw new Error('Capture already in progress');
        }

        this.captureActive = true;
        this.packets = [];
        this.statistics = {
            totalPackets: 0,
            totalBytes: 0,
            startTime: Date.now(),
            endTime: null,
            protocols: {},
            connections: {}
        };

        return {
            success: true,
            message: 'Packet capture started',
            maxPackets: options.maxPackets || 100
        };
    }

    /**
     * Stop packet capture
     */
    stopCapture() {
        if (!this.captureActive) {
            throw new Error('No active capture');
        }

        this.captureActive = false;
        this.statistics.endTime = Date.now();

        return {
            success: true,
            message: 'Packet capture stopped',
            statistics: this.getStatistics()
        };
    }

    /**
     * Add a packet to the capture
     */
    addPacket(packet) {
        if (!this.captureActive) return;

        this.packets.push({
            timestamp: new Date().toISOString(),
            ...packet
        });

        // Update statistics
        this.statistics.totalPackets++;
        this.statistics.totalBytes += packet.length || 0;

        // Track protocols
        const protocol = packet.protocol || 'OTHER';
        this.statistics.protocols[protocol] = (this.statistics.protocols[protocol] || 0) + 1;

        // Track connections
        if (packet.sourceIP && packet.destIP) {
            const connKey = `${packet.sourceIP}:${packet.sourcePort || '*'} -> ${packet.destIP}:${packet.destPort || '*'}`;
            if (!this.statistics.connections[connKey]) {
                this.statistics.connections[connKey] = { count: 0, bytes: 0 };
            }
            this.statistics.connections[connKey].count++;
            this.statistics.connections[connKey].bytes += packet.length || 0;
        }
    }

    /**
     * Get captured packets
     */
    getPackets(limit = null) {
        if (limit) {
            return this.packets.slice(-limit);
        }
        return this.packets;
    }

    /**
     * Get traffic statistics
     */
    getStatistics() {
        const duration = this.statistics.endTime 
            ? this.statistics.endTime - this.statistics.startTime 
            : Date.now() - this.statistics.startTime;

        const durationSeconds = Math.max(duration / 1000, 1);

        return {
            totalPackets: this.statistics.totalPackets,
            totalBytes: this.statistics.totalBytes,
            duration: duration,
            durationSeconds: durationSeconds,
            packetsPerSecond: Math.round(this.statistics.totalPackets / durationSeconds),
            bytesPerSecond: Math.round(this.statistics.totalBytes / durationSeconds),
            protocols: this.statistics.protocols,
            topConnections: this.getTopConnections(10)
        };
    }

    /**
     * Get top connections by packet count
     */
    getTopConnections(limit = 10) {
        return Object.entries(this.statistics.connections)
            .map(([connection, data]) => ({
                connection,
                ...data
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    /**
     * Clear all captured data
     */
    clear() {
        this.packets = [];
        this.statistics = {
            totalPackets: 0,
            totalBytes: 0,
            startTime: null,
            endTime: null,
            protocols: {},
            connections: {}
        };
    }

    /**
     * Filter packets by criteria
     */
    filterPackets(filter) {
        return this.packets.filter(packet => {
            if (filter.protocol && packet.protocol !== filter.protocol) return false;
            if (filter.sourceIP && packet.sourceIP !== filter.sourceIP) return false;
            if (filter.destIP && packet.destIP !== filter.destIP) return false;
            if (filter.minBytes && packet.length < filter.minBytes) return false;
            if (filter.maxBytes && packet.length > filter.maxBytes) return false;
            return true;
        });
    }

    /**
     * Export packets as JSON
     */
    exportJSON() {
        return {
            metadata: {
                exportDate: new Date().toISOString(),
                totalPackets: this.statistics.totalPackets,
                totalBytes: this.statistics.totalBytes,
                duration: this.statistics.endTime 
                    ? this.statistics.endTime - this.statistics.startTime 
                    : 0
            },
            statistics: this.getStatistics(),
            packets: this.packets
        };
    }

    /**
     * Export packets as CSV
     */
    exportCSV() {
        let csv = 'Timestamp,Source IP,Source Port,Dest IP,Dest Port,Protocol,Length\n';
        
        this.packets.forEach(packet => {
            csv += `"${packet.timestamp}","${packet.sourceIP || ''}","${packet.sourcePort || ''}","${packet.destIP || ''}","${packet.destPort || ''}","${packet.protocol || ''}","${packet.length || 0}"\n`;
        });

        return csv;
    }
}

module.exports = PacketAnalyzer;
