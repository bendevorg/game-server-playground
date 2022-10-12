export default {
  DOUBLE_SIZE: 8,
  FLOAT_SIZE: 4,
  INT64_SIZE: 8,
  INT32_SIZE: 4,
  INT16_SIZE: 2,
  INT8_SIZE: 1,
  // ID (Int 16) + Type (UInt 16) + Position x (Int 16) + Position Z (Int 16) + Level (Uint8) + Experience (Int16) + Health (Int 16) + Max Health (Int 16) + Speed (UInt 8) + Attack Range (UInt 16) + Attack Speed (UInt 16)
  BUFFER_PLAYER_SIZE: 20,
  // ID (Int 16) + Type (UInt 16) + Position x (Int 16) + Position Z (Int 16) + Level (Uint8) + Experience (Int16) + Health (Int 16) + Max Health (Int 16) + Speed (UInt 8) + Attack Range (UInt 16) + Attack Speed (UInt 16)
  BUFFER_ENEMY_SIZE: 20,
  // ID (Int 16) + Position x (Int 16) + Position Z (Int 16)
  BUFFER_POSITION_SIZE: 6,
  // Event type (INT 8) + Value (Int 16) + New Health (Int 16)
  BUFFER_HIT_EVENT_SIZE: 5,
  // Event type (INT 8) + Target Id (Int 16)
  BUFFER_ATTACK_EVENT_SIZE: 3,
  // Position x (Int 16) + Position Z (Int 16)
  BUFFER_DEATH_EVENT_SIZE: 1,
  // Event type (INT 8)
  WAYPOINT_SIZE: 4,
  TIME_TO_TIMEOUT: 10000,
};
