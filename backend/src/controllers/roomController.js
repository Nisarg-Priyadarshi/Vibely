import * as roomService from '../services/roomService.js';

/**
 * List all active rooms.
 * GET /api/rooms
 */
export const getActiveRooms = (req, res) => {
  const rooms = roomService.getAllRooms();
  res.status(200).json({
    success: true,
    count: rooms.length,
    data: rooms,
  });
};

/**
 * Check/get room info by room code.
 * GET /api/rooms/:code
 */
export const getRoomByCode = (req, res) => {
  const { code } = req.params;
  const room = roomService.getRoom(code);

  if (!room) {
    return res.status(404).json({
      success: false,
      error: {
        message: `Room with code "${code}" not found.`,
        status: 404,
      },
    });
  }

  res.status(200).json({
    success: true,
    data: room,
  });
};

export default {
  getActiveRooms,
  getRoomByCode,
};
