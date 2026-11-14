ALTER TABLE "ChatConversation"
ADD COLUMN "announcementOnly" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ChatPoll" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatPoll_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatPollOption" (
  "id" TEXT NOT NULL,
  "pollId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  CONSTRAINT "ChatPollOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatPollVote" (
  "id" TEXT NOT NULL,
  "pollId" TEXT NOT NULL,
  "optionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatPollVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChatPoll_messageId_key" ON "ChatPoll"("messageId");
CREATE INDEX "ChatPoll_conversationId_createdAt_idx" ON "ChatPoll"("conversationId", "createdAt");
CREATE INDEX "ChatPollOption_pollId_idx" ON "ChatPollOption"("pollId");
CREATE UNIQUE INDEX "ChatPollVote_pollId_userId_key" ON "ChatPollVote"("pollId", "userId");
CREATE INDEX "ChatPollVote_userId_idx" ON "ChatPollVote"("userId");

ALTER TABLE "ChatPoll" ADD CONSTRAINT "ChatPoll_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatPoll" ADD CONSTRAINT "ChatPoll_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatPollOption" ADD CONSTRAINT "ChatPollOption_pollId_fkey"
FOREIGN KEY ("pollId") REFERENCES "ChatPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatPollVote" ADD CONSTRAINT "ChatPollVote_pollId_fkey"
FOREIGN KEY ("pollId") REFERENCES "ChatPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatPollVote" ADD CONSTRAINT "ChatPollVote_optionId_fkey"
FOREIGN KEY ("optionId") REFERENCES "ChatPollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatPollVote" ADD CONSTRAINT "ChatPollVote_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ChatVoiceRoom" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "ChatVoiceRoom_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ChatVoiceRoomMember" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt" TIMESTAMP(3),
  CONSTRAINT "ChatVoiceRoomMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ChatVoiceRoom_conversationId_key" ON "ChatVoiceRoom"("conversationId");
CREATE UNIQUE INDEX "ChatVoiceRoomMember_roomId_userId_key" ON "ChatVoiceRoomMember"("roomId", "userId");
CREATE INDEX "ChatVoiceRoomMember_userId_leftAt_idx" ON "ChatVoiceRoomMember"("userId", "leftAt");
ALTER TABLE "ChatVoiceRoom" ADD CONSTRAINT "ChatVoiceRoom_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatVoiceRoomMember" ADD CONSTRAINT "ChatVoiceRoomMember_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "ChatVoiceRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatVoiceRoomMember" ADD CONSTRAINT "ChatVoiceRoomMember_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
