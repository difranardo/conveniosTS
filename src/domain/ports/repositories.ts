import { Colaborador } from "../models/colaborador";
import { Post } from "../models/post";

export interface PostRepository {
  getRecentPosts(hours: number): Promise<Post[]>;
}

export interface CollabRepository {
  findByCct(cctCodes: string[]): Promise<Colaborador[]>;
}

export interface EmailSender {
  sendNotification(toEmail: string, subject: string, context: Record<string, unknown>): Promise<void>;
}
