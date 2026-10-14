'use client'

import mqtt from 'mqtt'

export const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt'

/**
 * Connect to resilient public MQTT broker over WebSockets.
 *
 * @param {string} clientId
 * @param {string} roomId
 * @param {object} [options]
 * @returns {mqtt.MqttClient}
 */
export function createMqttConnection(clientId, roomId, options = {}) {
  const connectOptions = {
    clientId: `sb_${clientId}_${Math.random().toString(36).substring(2, 6)}`,
    clean: true,
    connectTimeout: 8000,
    reconnectPeriod: 2500,
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

  const client = mqtt.connect(BROKER_URL, connectOptions)
  return client
}
