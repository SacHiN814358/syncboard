'use client'

import mqtt from 'mqtt'

export const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://test.mosquitto.org:8081/mqtt',
]

/**
 * Connect to resilient public MQTT broker over WebSockets with automatic fallback.
 *
 * @param {string} clientId
 * @param {string} roomId
 * @param {object} [options]
 * @returns {mqtt.MqttClient}
 */
export function createMqttConnection(clientId, roomId, options = {}) {
  let brokerIndex = 0
  const brokerUrl = BROKERS[brokerIndex]

  const connectOptions = {
    clientId: `sb_${clientId}_${Math.random().toString(36).substring(2, 6)}`,
    clean: true,
    connectTimeout: 8000,
    reconnectPeriod: 3000,
    keepalive: 30,
    ...options,
  }

  if (roomId) {
    connectOptions.will = {
      topic: `syncboard/v2/room/${roomId}/presence`,
      payload: JSON.stringify({
        type: 'leave',
        userId: clientId,
      }),
      qos: 0,
      retain: false,
    }
  }

  const client = mqtt.connect(brokerUrl, connectOptions)

  // Failover to secondary broker if primary fails repeatedly
  let errorCount = 0
  client.on('error', (err) => {
    errorCount++
    if (errorCount > 3 && brokerIndex === 0) {
      brokerIndex = 1
      try {
        client.reconnect({ ...connectOptions, host: 'test.mosquitto.org', port: 8081, path: '/mqtt' })
      } catch (_) {}
    }
  })

  return client
}
