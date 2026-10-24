import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { io } from 'socket.io-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Song from '../src/models/Song.js';

const BASE_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
};

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`  ${colors.green('✔')} ${testName}`);
    passedCount++;
  } else {
    console.error(`  ${colors.red('✖')} ${testName} - ${detail}`);
    failedCount++;
  }
}

// Helper to await socket event with timeout
function waitForEvent(socket, eventName, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event "${eventName}"`));
    }, timeoutMs);

    socket.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

// Helper to emit socket event with ack promise
function emitWithAck(socket, eventName, payload = {}, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for ack on "${eventName}"`));
    }, timeoutMs);

    socket.emit(eventName, payload, (res) => {
      clearTimeout(timer);
      resolve(res);
    });
  });
}

async function runRoomTests() {
  console.log(`\n${colors.cyan('========================================')}`);
  console.log(`${colors.cyan('       Vibely Rooms Test Suite          ')}`);
  console.log(`${colors.cyan('========================================')}\n`);

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'Vibely' });

  const timestamp = Date.now();
  const hostEmail = `room_host_${timestamp}@example.com`;
  const member1Email = `room_member1_${timestamp}@example.com`;
  const member2Email = `room_member2_${timestamp}@example.com`;
  const password = 'Password123!';

  let hostToken = null;
  let member1Token = null;
  let member2Token = null;
  let hostId = null;
  let member1Id = null;
  let member2Id = null;

  let hostSocket = null;
  let member1Socket = null;
  let member2Socket = null;

  let createdRoomCode = null;
  let sampleSong = null;

  try {
    // 1. Setup test users and find a valid song
    console.log(colors.yellow('1. Setting up test users and seed song:'));
    const regHost = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Room Host User', email: hostEmail, password }),
    });
    const regHostData = await regHost.json();
    hostToken = regHostData.token;
    hostId = regHostData.user.id;
    assert(hostToken && hostId, 'Host user registered and authenticated');

    const regMember1 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Room Member 1', email: member1Email, password }),
    });
    const regMember1Data = await regMember1.json();
    member1Token = regMember1Data.token;
    member1Id = regMember1Data.user.id;
    assert(member1Token && member1Id, 'Member 1 registered and authenticated');

    const regMember2 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Room Member 2', email: member2Email, password }),
    });
    const regMember2Data = await regMember2.json();
    member2Token = regMember2Data.token;
    member2Id = regMember2Data.user.id;
    assert(member2Token && member2Id, 'Member 2 registered and authenticated');

    sampleSong = await Song.findOne();
    assert(sampleSong && sampleSong._id, 'Found catalogue song for playback tests');

    // 2. Socket.IO Handshake Authentication
    console.log(colors.yellow('\n2. Testing Socket.IO Handshake Authentication:'));

    // 2a. Unauthenticated connection rejected
    const unauthSocket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: false,
      transports: ['websocket'],
    });

    const unauthError = await new Promise((resolve) => {
      unauthSocket.on('connect_error', (err) => resolve(err.message));
    });
    assert(
      unauthError.includes('Authentication required') || unauthError.includes('No token'),
      'Unauthenticated socket connection is rejected'
    );
    unauthSocket.disconnect();

    // 2b. Invalid token rejected
    const invalidSocket = io(SOCKET_URL, {
      auth: { token: 'invalid.jwt.token' },
      autoConnect: true,
      reconnection: false,
      transports: ['websocket'],
    });

    const invalidError = await new Promise((resolve) => {
      invalidSocket.on('connect_error', (err) => resolve(err.message));
    });
    assert(
      invalidError.includes('Authentication failed') || invalidError.includes('Invalid'),
      'Socket connection with invalid token is rejected'
    );
    invalidSocket.disconnect();

    // 2c. Valid connection succeeded
    hostSocket = io(SOCKET_URL, {
      auth: { token: hostToken },
      autoConnect: true,
      reconnection: false,
      transports: ['websocket'],
    });

    await new Promise((resolve, reject) => {
      hostSocket.on('connect', resolve);
      hostSocket.on('connect_error', reject);
    });
    assert(hostSocket.connected, 'Host socket connected successfully with valid JWT');

    // 3. Room Creation & Validation
    console.log(colors.yellow('\n3. Testing Room Creation & Validation:'));

    // 3a. Reject invalid room name
    const invalidNameRes = await emitWithAck(hostSocket, 'room:create', { name: 'A' });
    assert(
      invalidNameRes.success === false && invalidNameRes.error.includes('at least 2 characters'),
      'Reject room creation with name < 2 chars'
    );

    // 3b. Create valid room
    const createRes = await emitWithAck(hostSocket, 'room:create', {
      name: 'Chill Vibes Room',
      description: 'Late night lo-fi beats',
    });
    assert(createRes.success === true, 'Room creation succeeds with valid name');
    assert(createRes.room && createRes.room.code, 'Created room has a unique room code');
    assert(createRes.room.hostId === hostId, 'Creator is set as room host');
    assert(createRes.room.members.length === 1, 'Creator is automatically added as initial member');
    assert(createRes.room.name === 'Chill Vibes Room', 'Room name matches input');

    createdRoomCode = createRes.room.code;

    // 3c. REST API check
    const restRoomRes = await fetch(`${BASE_URL}/rooms/${createdRoomCode}`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    const restRoomData = await restRoomRes.json();
    assert(restRoomRes.status === 200, 'GET /api/rooms/:code returns HTTP 200');
    assert(restRoomData.data.code === createdRoomCode, 'REST endpoint returns the newly created room');

    const allRoomsRes = await fetch(`${BASE_URL}/rooms`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    const allRoomsData = await allRoomsRes.json();
    assert(allRoomsData.success === true, 'GET /api/rooms returns active rooms');
    assert(allRoomsData.data.some((r) => r.code === createdRoomCode), 'Active rooms list includes created room');

    // 4. Joining Room & Member Updates
    console.log(colors.yellow('\n4. Testing Room Joining & Member Updates:'));

    member1Socket = io(SOCKET_URL, {
      auth: { token: member1Token },
      autoConnect: true,
      reconnection: false,
      transports: ['websocket'],
    });

    await new Promise((resolve, reject) => {
      member1Socket.on('connect', resolve);
      member1Socket.on('connect_error', reject);
    });
    assert(member1Socket.connected, 'Member 1 socket connected successfully');

    // 4a. Reject invalid room code
    const invalidJoinRes = await emitWithAck(member1Socket, 'room:join', { code: 'NONEXIST' });
    assert(
      invalidJoinRes.success === false && invalidJoinRes.error.includes('not found'),
      'Joining nonexistent room code is rejected'
    );

    // 4b. Member 1 joins valid room; Host receives members_updated
    const hostMemberUpdatePromise = waitForEvent(hostSocket, 'room:members_updated');
    const joinRes = await emitWithAck(member1Socket, 'room:join', { code: createdRoomCode });
    assert(joinRes.success === true, 'Member 1 joins room successfully');
    assert(joinRes.room.members.length === 2, 'Room member count is now 2');
    assert(joinRes.room.members.some((m) => m.userId === member1Id), 'Member 1 is in room member list');

    const memberUpdateEvent = await hostMemberUpdatePromise;
    assert(
      memberUpdateEvent.members.length === 2 && memberUpdateEvent.members.some((m) => m.userId === member1Id),
      'Host received room:members_updated broadcast'
    );

    // 4c. Prevent duplicate join / idempotent re-join
    const duplicateJoinRes = await emitWithAck(member1Socket, 'room:join', { code: createdRoomCode });
    assert(duplicateJoinRes.success === true, 'Re-joining does not error');
    assert(duplicateJoinRes.room.members.length === 2, 'Duplicate join does not duplicate member in list');

    // 5. Host Playback Control & Member Synchronization
    console.log(colors.yellow('\n5. Testing Host Playback Control & Permissions:'));

    // 5a. Non-host attempts direct playback control -> Forbidden
    const unauthControlRes = await emitWithAck(member1Socket, 'room:host_control', {
      code: createdRoomCode,
      action: 'play',
    });
    assert(
      unauthControlRes.success === false && unauthControlRes.error.includes('Forbidden'),
      'Non-host attempt to control playback is rejected with Forbidden'
    );

    // 5b. Host changes track with invalid song ID -> Rejected
    const invalidSongRes = await emitWithAck(hostSocket, 'room:host_control', {
      code: createdRoomCode,
      action: 'change_track',
      payload: { songId: new mongoose.Types.ObjectId().toString() },
    });
    assert(
      invalidSongRes.success === false && invalidSongRes.error.includes('not exist in catalogue'),
      'Host change_track with invalid song ID is rejected'
    );

    // 5c. Host changes track with valid song -> Broadcast to members
    const memberStateUpdatePromise = waitForEvent(member1Socket, 'room:state_updated');
    const changeTrackRes = await emitWithAck(hostSocket, 'room:host_control', {
      code: createdRoomCode,
      action: 'change_track',
      payload: { songId: sampleSong._id.toString() },
    });
    assert(changeTrackRes.success === true, 'Host changes track successfully');
    assert(
      (changeTrackRes.state.currentSong.id || changeTrackRes.state.currentSong._id)?.toString() === sampleSong._id.toString(),
      'Current song updated in room state'
    );
    assert(changeTrackRes.state.isPlaying === true, 'State is marked as playing');

    const memberStateUpdate = await memberStateUpdatePromise;
    assert(
      (memberStateUpdate.state.currentSong.id || memberStateUpdate.state.currentSong._id)?.toString() === sampleSong._id.toString(),
      'Member 1 received room:state_updated with new song'
    );

    // 5d. Host seeks playback -> Broadcast
    const memberSeekPromise = waitForEvent(member1Socket, 'room:state_updated');
    const seekRes = await emitWithAck(hostSocket, 'room:host_control', {
      code: createdRoomCode,
      action: 'seek',
      payload: { position: 45.5 },
    });
    assert(seekRes.success === true && seekRes.state.position === 45.5, 'Host seeks playback position to 45.5s');

    const memberSeekUpdate = await memberSeekPromise;
    assert(memberSeekUpdate.state.position === 45.5, 'Member received room:state_updated with seek position');

    // 5e. Member requests state sync on-demand
    const syncRes = await emitWithAck(member1Socket, 'room:sync_request', { code: createdRoomCode });
    assert(syncRes.success === true, 'room:sync_request succeeds');
    assert(syncRes.state.position === 45.5, 'Synchronized state reflects current position');

    // 6. Member Playback Requests & Host Approval/Rejection
    console.log(colors.yellow('\n6. Testing Member Playback Requests & Host Responses:'));

    // 6a. Member submits pause request -> Host receives room:request_received
    const hostRequestPromise = waitForEvent(hostSocket, 'room:request_received');
    const requestRes = await emitWithAck(member1Socket, 'room:request_action', {
      code: createdRoomCode,
      action: 'pause',
      payload: { position: 45.5 },
    });
    assert(requestRes.success === true && requestRes.requestId, 'Member 1 submitted pause request with requestId');

    const hostReceivedRequest = await hostRequestPromise;
    assert(
      hostReceivedRequest.requestId === requestRes.requestId && hostReceivedRequest.action === 'pause',
      'Host received room:request_received for pause'
    );

    // 6b. Non-host attempts to respond to request -> Forbidden
    const unauthRespondRes = await emitWithAck(member1Socket, 'room:respond_request', {
      code: createdRoomCode,
      requestId: requestRes.requestId,
      approved: true,
    });
    assert(
      unauthRespondRes.success === false && unauthRespondRes.error.includes('Forbidden'),
      'Non-host attempt to respond to request is rejected with Forbidden'
    );

    // 6c. Host rejects request -> Broadcast room:request_handled (approved: false)
    const memberHandledRejectPromise = waitForEvent(member1Socket, 'room:request_handled');
    const rejectRes = await emitWithAck(hostSocket, 'room:respond_request', {
      code: createdRoomCode,
      requestId: requestRes.requestId,
      approved: false,
    });
    assert(rejectRes.success === true && rejectRes.approved === false, 'Host rejects request');

    const rejectHandledEvent = await memberHandledRejectPromise;
    assert(
      rejectHandledEvent.requestId === requestRes.requestId && rejectHandledEvent.approved === false,
      'Member received room:request_handled indicating rejection'
    );

    // 6d. Member submits track change request -> Host approves -> State updated
    const request2Res = await emitWithAck(member1Socket, 'room:request_action', {
      code: createdRoomCode,
      action: 'pause',
      payload: { position: 50 },
    });

    const memberStateAfterApprovalPromise = waitForEvent(member1Socket, 'room:state_updated');
    const approveRes = await emitWithAck(hostSocket, 'room:respond_request', {
      code: createdRoomCode,
      requestId: request2Res.requestId,
      approved: true,
    });
    assert(approveRes.success === true && approveRes.approved === true, 'Host approves pause request');

    const stateAfterApproval = await memberStateAfterApprovalPromise;
    assert(stateAfterApproval.state.isPlaying === false, 'Room state updated to paused after host approval');

    // 7. Member Join, Host Departure, and Deterministic Host Reassignment
    console.log(colors.yellow('\n7. Testing Host Departure & Reassignment:'));

    member2Socket = io(SOCKET_URL, {
      auth: { token: member2Token },
      autoConnect: true,
      reconnection: false,
      transports: ['websocket'],
    });

    await new Promise((resolve, reject) => {
      member2Socket.on('connect', resolve);
      member2Socket.on('connect_error', reject);
    });

    await emitWithAck(member2Socket, 'room:join', { code: createdRoomCode });
    assert(member2Socket.connected, 'Member 2 joined room (3 total members)');

    // Host A leaves room
    const member1HostChangedPromise = waitForEvent(member1Socket, 'room:host_changed');
    const member1MemberUpdatePromise = waitForEvent(member1Socket, 'room:members_updated');

    const hostLeaveRes = await emitWithAck(hostSocket, 'room:leave', { code: createdRoomCode });
    assert(hostLeaveRes.success === true, 'Host leaves room successfully');

    const hostChangedEvent = await member1HostChangedPromise;
    assert(
      hostChangedEvent.newHostId === member1Id,
      'Host role deterministically reassigned to oldest remaining member (Member 1)'
    );

    const membersAfterHostLeave = await member1MemberUpdatePromise;
    assert(
      membersAfterHostLeave.members.length === 2 && membersAfterHostLeave.hostId === member1Id,
      'Member list updated after host leave with new hostId'
    );

    // 8. Room Cleanup When Empty
    console.log(colors.yellow('\n8. Testing Room Deletion When Empty:'));

    await emitWithAck(member2Socket, 'room:leave', { code: createdRoomCode });
    await emitWithAck(member1Socket, 'room:leave', { code: createdRoomCode });

    const emptyRoomRes = await fetch(`${BASE_URL}/rooms/${createdRoomCode}`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    assert(emptyRoomRes.status === 404, 'Room was deleted from registry after all members left (HTTP 404)');

    const restCheckDeleted = await fetch(`${BASE_URL}/rooms`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    const restCheckDeletedData = await restCheckDeleted.json();
    assert(
      !restCheckDeletedData.data.some((r) => r.code === createdRoomCode),
      'Deleted room is no longer in active rooms list'
    );
  } catch (err) {
    console.error('Fatal test error:', err);
    failedCount++;
  } finally {
    if (hostSocket) hostSocket.disconnect();
    if (member1Socket) member1Socket.disconnect();
    if (member2Socket) member2Socket.disconnect();
    await mongoose.connection.close();
  }

  console.log(`\n${colors.cyan('========================================')}`);
  console.log(`Rooms Test Results: ${colors.green(`${passedCount} passed`)}, ${failedCount > 0 ? colors.red(`${failedCount} failed`) : '0 failed'}`);
  console.log(`${colors.cyan('========================================')}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runRoomTests();
