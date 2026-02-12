import { Post } from "../../../domain/models/post";
import { PostRepository } from "../../../domain/ports/repositories";
import { logger } from "../../config/settings";

type HappeoPost = {
  id?: string | number;
  title?: string;
  content?: string;
  publishedMs?: string | number;
};

type HappeoResponse = {
  posts?: HappeoPost[];
  items?: HappeoPost[];
};

export class HappeoAdapter implements PostRepository {
  private readonly baseUrl: string;
  private readonly channelId: string;
  private readonly apiKey: string;

  constructor(url?: string, key?: string, channelId?: string) {
    if (!url || !key || !channelId) {
      throw new Error("Faltan variables de entorno para Happeo (URL/KEY/CHANNEL_ID).");
    }
    this.baseUrl = url.replace(/\/$/, "");
    this.apiKey = key;
    this.channelId = channelId;
  }

  async getRecentPosts(hours: number): Promise<Post[]> {
    const endpoint = new URL(`${this.baseUrl}/posts`);
    endpoint.searchParams.set("amount", "50");
    endpoint.searchParams.set("order", "created_desc");
    endpoint.searchParams.set("includeChannel", this.channelId);

    let data: HappeoResponse;
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "x-happeo-apikey": this.apiKey,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      data = (await response.json()) as HappeoResponse;
    } catch (error) {
      logger.error(`Happeo Connection Error: ${String(error)}`);
      return [];
    }

    const postsRaw = data.posts ?? data.items ?? [];
    logger.info(`Happeo: retrieved ${postsRaw.length} raw items.`);

    const validPosts: Post[] = [];
    const limit = Date.now() - hours * 60 * 60 * 1000;
    const regex = /CCT\s*(\d+\/\d+)/gi;

    for (const p of postsRaw) {
      const title = p.title ?? "No Title";
      if (p.publishedMs == null) {
        continue;
      }

      const timestamp = Number(p.publishedMs);
      if (!Number.isFinite(timestamp) || timestamp < limit) {
        continue;
      }

      const content = p.content ?? "";
      const text = `${title} ${content}`;
      regex.lastIndex = 0;
      const ccts = [...new Set(Array.from(text.matchAll(regex), (match) => match[1]))];

      if (ccts.length > 0) {
        logger.info(`  [ACEPTADO] ${title.slice(0, 30)}... -> CCTs: ${JSON.stringify(ccts)}`);
        validPosts.push({
          id: String(p.id ?? ""),
          title,
          content: text,
          cctCodes: ccts,
        });
      }
    }

    return validPosts;
  }
}


