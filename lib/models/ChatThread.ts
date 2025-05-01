// src/lib/models/ChatThread.ts
export class ChatThread {
    id?: string;
    postId: string;
    buyerId: string;
    sellerId: string;
    messages: { from: string; text: string; ts: string }[];
  
    constructor(opts: {
      id?: string;
      postId: string;
      buyerId: string;
      sellerId: string;
      messages?: { from: string; text: string; ts: string }[];
    }) {
      this.id = opts.id;
      this.postId = opts.postId;
      this.buyerId = opts.buyerId;
      this.sellerId = opts.sellerId;
      this.messages = opts.messages ?? [];
    }
  
    // 拿最后一条
    latest() {
      return this.messages[this.messages.length - 1]!;
    }
  
    // 向本地模型里加入一条消息
    addMessage(from: string, text: string) {
      this.messages.push({ from, text, ts: new Date().toISOString() });
    }
  
    // 用于写入数据库的格式
    toRow() {
      return {
        thread_id: this.id,
        sender_id: this.latest().from,
        body: this.latest().text,
        sent_at: this.latest().ts,
      };
    }
  
    // 从后台查询出的 chat_threads 行转成模型
    static fromRow(row: any) {
      return new ChatThread({
        id: row.id,
        postId: row.post_id,
        buyerId: row.buyer_id,
        sellerId: row.seller_id,
        // messages 这里先不填，后面单独读
      });
    }
  }
  