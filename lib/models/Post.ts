// lib/models/Post.ts
export type PostStatus = "lost" | "found";

export class Post {
   /* ---------- 新增字段 ---------- */
  isFavorite: boolean = false;
  favorites: string[] = [];      // uuid 列表
  id?: string;
  userId!: string;
  title!: string;
  description!: string;
  status!: PostStatus;
  imageUrl?: string;
  location!: string;
  createdAt?: string;
  imageUrls?: string[];

  constructor(opts: {
    userId: string;
    title: string;
    description: string;
    status: PostStatus;
    imageUrls?: string[];
    location: string;
    /* 新增 ↓ */
    favorites?: string[];
    isFavorite?: boolean;
    /* 旧有可选字段 ↓ */
    id?: string;
    createdAt?: string;
  }) {
    Object.assign(this, opts);
  }


  toRow() {
    return {
      user_id: this.userId,
      title: this.title,
      description: this.description,
      status: this.status,
      location: this.location,
      image_urls: this.imageUrls,   // 保存数组
    };
  }

  static fromRow(row: any, currentUid: string | undefined = undefined) {
    return new Post({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      status: row.status,
      imageUrls: row.image_urls ?? [],
      location: row.location,
      createdAt: row.created_at,
      /** favorites / isFavorite 逻辑 ↓ */
      favorites: row.favorites ?? [],
      isFavorite: currentUid
        ? (row.favorites ?? []).includes(currentUid)
        : false,
    });
  }

  isExpired(hours = 48) {
    if (!this.createdAt) return false;
    const created = new Date(this.createdAt).getTime();
    return Date.now() - created > hours * 3600 * 1000;
  }

  brief(max = 80) {
    return this.description.length > max
      ? this.description.slice(0, max) + "…"
      : this.description;
  }
}
