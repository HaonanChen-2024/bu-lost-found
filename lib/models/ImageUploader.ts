// src/lib/models/ImageUploader.ts
import { supabase } from "@/lib/supabaseClient";

export class ImageUploader {
  bucket: string;
  pathPrefix: string;
  files: File[];
  uploadedUrls: string[];

  constructor(bucket = "post-images", pathPrefix = "") {
    this.bucket = bucket;
    this.pathPrefix = pathPrefix;
    this.files = [];
    this.uploadedUrls = [];
  }

  /** 1. 添加待上传文件 */
  addFile(file: File) {
    this.files.push(file);
  }

  /** 2. 移除指定下标文件 */
  removeFile(index: number) {
    this.files.splice(index, 1);
  }

  /** 3. 清空所有待上传文件 */
  clearFiles() {
    this.files = [];
    this.uploadedUrls = [];
  }

  /** 4. 列出当前待上传文件 */
  listFiles() {
    return [...this.files];
  }

  /** 5. 批量上传并收集所有 URL */
  async uploadAll(): Promise<string[]> {
    this.uploadedUrls = [];
    for (const file of this.files) {
      const { data, error } = await supabase.storage
        .from(this.bucket)
        .upload(
          `${this.pathPrefix}${Date.now()}-${file.name}`,
          file
        );
      if (error) throw error;
      const url = supabase.storage
        .from(this.bucket)
        .getPublicUrl(data.path).data.publicUrl;
      this.uploadedUrls.push(url);
    }
    return this.uploadedUrls;
  }

  /** 6. 获取已上传的 URL 列表 */
  getUrls() {
    return [...this.uploadedUrls];
  }
}
