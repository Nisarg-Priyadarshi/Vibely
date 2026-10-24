import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { io } from 'socket.io-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import User from '../src/models/User.js';
import Friendship from '../src/models/Friendship.js';
import Message from '../src/models/Message.js';
import RoomInvitation from '../src/models/RoomInvitation.js';

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

async function registerUser(name, email, password) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  return { token: data.token, user: data.user };
}

async function runTests() {
  console.log(`\n${colors.cyan('========================================')}`);
  console.log(`${colors.cyan('    Vibely Social & Chat Test Suite     ')}`);
  console.log(`${colors.cyan('========================================')}\n`);

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'Vibely' });

  const timestamp = Date.now();
  let userA, userB, userC;
  let testRoomCode = null;

  try {
    // 1. Setup 3 test users
    console.log(colors.yellow('1. Setting up test users (Alice, Bob, Charlie):'));
    const pass = 'SecurePass123!';
    userA = await registerUser('Alice Listener', `alice_${timestamp}@vibely.test`, pass);
    userB = await registerUser('Bob Beats', `bob_${timestamp}@vibely.test`, pass);
    userC = await registerUser('Charlie Chill', `charlie_${timestamp}@vibely.test`, pass);

    assert(userA.token && userA.user.id, 'Registered User Alice');
    assert(userB.token && userB.user.id, 'Registered User Bob');
    assert(userC.token && userC.user.id, 'Registered User Charlie');

    // 2. User Search
    console.log(colors.yellow('\n2. Testing user search (/api/friends/search):'));
    const searchRes = await fetch(`${BASE_URL}/friends/search?q=Bob`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const searchData = await searchRes.json();
    assert(searchRes.status === 200, 'Search returns HTTP 200 OK');
    assert(searchData.success === true, 'Search returns success: true');
    const foundBob = searchData.users.find((u) => u.id === userB.user.id);
    assert(!!foundBob, 'Found Bob in search results');
    assert(foundBob.relationshipStatus === 'none', 'Initial relationship status is "none"');
    assert(
      !searchData.users.some((u) => u.id === userA.user.id),
      'Search results exclude current user (Alice)'
    );

    // 3. Friend Request Validations
    console.log(colors.yellow('\n3. Testing friend request creation & validations:'));
    // Self request
    const selfRes = await fetch(`${BASE_URL}/friends/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({ recipientId: userA.user.id }),
    });
    assert(selfRes.status === 400, 'Sending friend request to self rejected with HTTP 400');

    // Invalid recipient ID
    const invalidIdRes = await fetch(`${BASE_URL}/friends/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({ recipientId: 'not-a-valid-id' }),
    });
    assert(invalidIdRes.status === 400, 'Invalid recipient ID rejected with HTTP 400');

    // Alice sends friend request to Bob
    const sendReqRes = await fetch(`${BASE_URL}/friends/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({ recipientId: userB.user.id }),
    });
    const sendReqData = await sendReqRes.json();
    assert(sendReqRes.status === 201, 'Alice sent friend request to Bob (HTTP 201)');
    assert(sendReqData.status === 'pending', 'Friendship status marked as pending');
    const firstRequestId = sendReqData.friendshipId;

    // Duplicate request rejection
    const dupReqRes = await fetch(`${BASE_URL}/friends/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({ recipientId: userB.user.id }),
    });
    assert(dupReqRes.status === 400, 'Duplicate pending friend request rejected with HTTP 400');

    // 4. Pending Requests List
    console.log(colors.yellow('\n4. Testing pending friend requests listing:'));
    // Bob checks incoming requests
    const bobReqsRes = await fetch(`${BASE_URL}/friends/requests`, {
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    const bobReqsData = await bobReqsRes.json();
    assert(bobReqsRes.status === 200, 'Bob fetches requests (HTTP 200)');
    assert(bobReqsData.received.length === 1, 'Bob has 1 pending received request');
    assert(bobReqsData.received[0].user.name === 'Alice Listener', 'Requester is Alice');
    assert(bobReqsData.sent.length === 0, 'Bob has 0 pending sent requests');

    // Alice checks sent requests
    const aliceReqsRes = await fetch(`${BASE_URL}/friends/requests`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const aliceReqsData = await aliceReqsRes.json();
    assert(aliceReqsData.sent.length === 1, 'Alice has 1 pending sent request');
    assert(aliceReqsData.sent[0].user.name === 'Bob Beats', 'Recipient is Bob');

    // 5. Cancel Friend Request
    console.log(colors.yellow('\n5. Testing friend request cancellation:'));
    const cancelRes = await fetch(`${BASE_URL}/friends/requests/${firstRequestId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    assert(cancelRes.status === 200, 'Alice cancels request to Bob (HTTP 200)');

    const bobReqsAfterCancel = await fetch(`${BASE_URL}/friends/requests`, {
      headers: { Authorization: `Bearer ${userB.token}` },
    }).then((r) => r.json());
    assert(bobReqsAfterCancel.received.length === 0, 'Bob received list now empty');

    // 6. Send, Accept & Verify Friendship
    console.log(colors.yellow('\n6. Testing friend request acceptance:'));
    // Alice re-sends request to Bob
    const reSend = await fetch(`${BASE_URL}/friends/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({ recipientId: userB.user.id }),
    }).then((r) => r.json());

    const newRequestId = reSend.friendshipId;

    // Unauthorized acceptance attempt (Charlie tries to accept Alice's request to Bob)
    const rogueAccept = await fetch(`${BASE_URL}/friends/requests/${newRequestId}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userC.token}` },
    });
    assert(rogueAccept.status === 403, 'Unauthorized user cannot accept another user request (403)');

    // Bob accepts request from Alice
    const acceptRes = await fetch(`${BASE_URL}/friends/requests/${newRequestId}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    const acceptData = await acceptRes.json();
    assert(acceptRes.status === 200, 'Bob accepts Alice friend request (HTTP 200)');
    assert(acceptData.success === true, 'Accept returns success: true');

    // Check friends list for both users
    const aliceFriends = await fetch(`${BASE_URL}/friends`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    }).then((r) => r.json());
    assert(aliceFriends.friends.length === 1, 'Alice has 1 accepted friend');
    assert(aliceFriends.friends[0].name === 'Bob Beats', 'Alice friend is Bob');

    const bobFriends = await fetch(`${BASE_URL}/friends`, {
      headers: { Authorization: `Bearer ${userB.token}` },
    }).then((r) => r.json());
    assert(bobFriends.friends.length === 1, 'Bob has 1 accepted friend');
    assert(bobFriends.friends[0].name === 'Alice Listener', 'Bob friend is Alice');

    // 7. Persistent Private Chat - Friendship Authorization Check
    console.log(colors.yellow('\n7. Testing private chat server-side friendship authorization:'));
    // Alice and Charlie are NOT friends
    const unauthHistoryRes = await fetch(`${BASE_URL}/chat/${userC.user.id}`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    assert(
      unauthHistoryRes.status === 403,
      'Viewing chat history with non-friend is rejected with HTTP 403 Forbidden'
    );

    const unauthSendRes = await fetch(`${BASE_URL}/chat/${userC.user.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({ content: 'Hey Charlie!' }),
    });
    assert(
      unauthSendRes.status === 403,
      'Sending message to non-friend is rejected with HTTP 403 Forbidden'
    );

    // 8. Chat Messaging Between Accepted Friends
    console.log(colors.yellow('\n8. Testing chat messaging between accepted friends:'));
    // Message validation: empty content
    const emptyMsgRes = await fetch(`${BASE_URL}/chat/${userB.user.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({ content: '   ' }),
    });
    assert(emptyMsgRes.status === 400, 'Empty message content rejected with HTTP 400');

    // Alice sends message to Bob
    const msgText1 = 'Hey Bob, check out this track!';
    const sendMsg1 = await fetch(`${BASE_URL}/chat/${userB.user.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({ content: msgText1 }),
    });
    const msgData1 = await sendMsg1.json();
    assert(sendMsg1.status === 201, 'Alice sends message to Bob (HTTP 201)');
    assert(msgData1.message.content === msgText1, 'Message content matches input');
    assert(msgData1.message.sender === userA.user.id, 'Sender is Alice');
    assert(msgData1.message.recipient === userB.user.id, 'Recipient is Bob');

    // Bob sends reply to Alice
    const msgText2 = 'Awesome track, Alice!';
    const sendMsg2 = await fetch(`${BASE_URL}/chat/${userA.user.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userB.token}`,
      },
      body: JSON.stringify({ content: msgText2 }),
    });
    assert(sendMsg2.status === 201, 'Bob replies to Alice (HTTP 201)');

    // Verify conversation history
    const historyRes = await fetch(`${BASE_URL}/chat/${userB.user.id}`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const historyData = await historyRes.json();
    assert(historyRes.status === 200, 'Fetch conversation returns HTTP 200 OK');
    assert(historyData.messages.length === 2, 'Conversation contains both messages in order');
    assert(historyData.messages[0].content === msgText1, 'First message content correct');
    assert(historyData.messages[1].content === msgText2, 'Second message content correct');

    // Verify conversation overview endpoint
    const overviewRes = await fetch(`${BASE_URL}/chat/conversations`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const overviewData = await overviewRes.json();
    assert(overviewRes.status === 200, 'Conversations overview returns HTTP 200 OK');
    assert(overviewData.conversations.length === 1, 'Overview shows 1 active conversation');
    assert(overviewData.conversations[0].lastMessage.content === msgText2, 'Latest message reflected in overview');

    // 9. Room Invitations Integration
    console.log(colors.yellow('\n9. Testing room invitations integration:'));

    // Connect Alice Socket to the running server
    const aliceSocket = io(SOCKET_URL, {
      auth: { token: userA.token },
      transports: ['websocket'],
    });
    await new Promise((resolve) => aliceSocket.on('connect', resolve));

    // Connect Bob Socket to the running server
    const bobSocket = io(SOCKET_URL, {
      auth: { token: userB.token },
      transports: ['websocket'],
    });
    await new Promise((resolve) => bobSocket.on('connect', resolve));

    // Alice creates a room via socket
    const roomCreated = await new Promise((resolve, reject) => {
      aliceSocket.emit(
        'room:create',
        { name: 'Alice Lounge', description: 'Chilling with friends' },
        (res) => {
          if (res.success) resolve(res.room);
          else reject(new Error(res.error));
        }
      );
    });
    testRoomCode = roomCreated.code;
    assert(!!testRoomCode, 'Alice created active room via socket');

    // 9a. Non-member invites Bob -> should fail with 403
    const nonMemberInvite = await fetch(`${BASE_URL}/rooms/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userC.token}`, // Charlie is not in room
      },
      body: JSON.stringify({ roomCode: testRoomCode, friendId: userB.user.id }),
    });
    assert(nonMemberInvite.status === 403, 'Non-member cannot invite users to room (403 Forbidden)');

    // 9b. Member invites NON-friend (Alice invites Charlie, who is NOT her friend)
    const nonFriendInvite = await fetch(`${BASE_URL}/rooms/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({ roomCode: testRoomCode, friendId: userC.user.id }),
    });
    assert(nonFriendInvite.status === 403, 'Cannot invite non-friend to room (403 Forbidden)');

    // 9c. Member invites accepted friend (Alice invites Bob)
    const bobInvitePromise = new Promise((resolve) => {
      bobSocket.once('room:invitation_received', resolve);
    });

    const validInviteRes = await fetch(`${BASE_URL}/rooms/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({ roomCode: testRoomCode, friendId: userB.user.id }),
    });
    const validInviteData = await validInviteRes.json();
    assert(validInviteRes.status === 201, 'Alice invites accepted friend Bob to room (HTTP 201)');
    const invitationId = validInviteData.invitationId;

    const receivedViaSocket = await bobInvitePromise;
    assert(receivedViaSocket?.roomCode === testRoomCode, 'Bob received real-time room invitation via Socket.IO');

    // 9d. Bob checks pending room invitations via REST
    const bobInvitesRes = await fetch(`${BASE_URL}/rooms/invitations`, {
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    const bobInvitesData = await bobInvitesRes.json();
    assert(bobInvitesRes.status === 200, 'Bob fetches room invitations (HTTP 200)');
    assert(bobInvitesData.invitations.length === 1, 'Bob has 1 pending room invitation');
    assert(bobInvitesData.invitations[0].roomCode === testRoomCode, 'Invitation matches room code');
    assert(bobInvitesData.invitations[0].sender.name === 'Alice Listener', 'Inviter is Alice');

    // 9e. Bob accepts invitation
    const acceptInviteRes = await fetch(`${BASE_URL}/rooms/invitations/${invitationId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userB.token}`,
      },
      body: JSON.stringify({ accept: true }),
    });
    const acceptInviteData = await acceptInviteRes.json();
    assert(acceptInviteRes.status === 200, 'Bob accepts room invitation (HTTP 200)');
    assert(acceptInviteData.roomCode === testRoomCode, 'Accept response returns roomCode for client navigation');

    // Disconnect test sockets
    aliceSocket.disconnect();
    bobSocket.disconnect();

    // 10. Clean up
    console.log(colors.yellow('\n10. Cleaning up test artifacts:'));
    await Friendship.deleteMany({
      $or: [
        { requester: { $in: [userA.user.id, userB.user.id, userC.user.id] } },
        { recipient: { $in: [userA.user.id, userB.user.id, userC.user.id] } },
      ],
    });
    await Message.deleteMany({
      $or: [
        { sender: { $in: [userA.user.id, userB.user.id, userC.user.id] } },
        { recipient: { $in: [userA.user.id, userB.user.id, userC.user.id] } },
      ],
    });
    await RoomInvitation.deleteMany({
      $or: [
        { sender: { $in: [userA.user.id, userB.user.id, userC.user.id] } },
        { recipient: { $in: [userA.user.id, userB.user.id, userC.user.id] } },
      ],
    });
    await User.deleteMany({
      _id: { $in: [userA.user.id, userB.user.id, userC.user.id] },
    });

    assert(true, 'Test artifacts cleaned up successfully');
    await finishTests();
  } catch (error) {
    console.error(colors.red('\nUnexpected error during social test execution:'), error);
    failedCount++;
    await finishTests();
  }
}


async function finishTests() {
  await mongoose.disconnect();
  console.log(`\n${colors.cyan('========================================')}`);
  console.log(
    `Social Tests Finished: ${colors.green(`${passedCount} passed`)}, ${failedCount > 0 ? colors.red(`${failedCount} failed`) : '0 failed'}`
  );
  console.log(`${colors.cyan('========================================')}\n`);
  process.exit(failedCount > 0 ? 1 : 0);
}

runTests();
