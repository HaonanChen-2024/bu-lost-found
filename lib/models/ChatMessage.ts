export class ChatMessage {
    id?: number;
    threadId: string;
    senderId: string;
    body: string;
    sentAt?: string;
  
    constructor(o: {
      threadId: string;
      senderId: string;
      body: string;
      id?: number;
      sentAt?: string;
    }) {
      Object.assign(this, o);
    }
  
    toRow() {
      return {
        thread_id: this.threadId,
        sender_id: this.senderId,
        body: this.body,
      };
    }
  
    static fromRow(r: any) {
      return new ChatMessage({
        id: r.id,
        threadId: r.thread_id,
        senderId: r.sender_id,
        body: r.body,
        sentAt: r.sent_at,
      });
    }
  }
  