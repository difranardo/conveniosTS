import { LoggerPort } from "../ports/logger";
import { CollabRepository, EmailSender, PostRepository } from "../../domain/ports/repositories";

export class NotificationService {
  constructor(
    private readonly posts: PostRepository,
    private readonly collabs: CollabRepository,
    private readonly email: EmailSender,
    private readonly logger: LoggerPort,
  ) {}

  async run(hours: number): Promise<void> {
    this.logger.info(`Buscando posts recientes (Ultimas ${hours} horas)...`);
    const newPosts = await this.posts.getRecentPosts(hours);

    if (newPosts.length === 0) {
      this.logger.info("No se encontraron posts nuevos.");
      return;
    }

    this.logger.info(`Se encontraron ${newPosts.length} posts.`);

    const uniqueCcts = new Set<string>();
    for (const post of newPosts) {
      for (const cct of post.cctCodes) {
        uniqueCcts.add(cct);
      }
    }

    if (uniqueCcts.size === 0) {
      this.logger.info("Los posts encontrados no contienen Codigos de Convenio (CCT).");
      return;
    }

    const ccts = [...uniqueCcts];
    this.logger.info(`Buscando colaboradores para CCTs: ${JSON.stringify(ccts)}`);
    const employees = await this.collabs.findByCct(ccts);

    if (employees.length === 0) {
      this.logger.info("No hay colaboradores activos en base de datos para esos convenios.");
      return;
    }

    this.logger.info(`Se encontraron ${employees.length} destinatarios.`);

    for (const emp of employees) {
      const relevantPosts = newPosts.filter((post) => post.cctCodes.includes(emp.convenio));
      if (relevantPosts.length === 0) {
        continue;
      }

      const context = {
        nombre: emp.nombre,
        convenio: emp.convenio,
        link: relevantPosts.map((post) => ({ id: post.id, title: post.title })),
      };

      await this.email.sendNotification(emp.email, `Novedades Convenio ${emp.convenio}`, context);
    }

    this.logger.info("Proceso de notificaciones finalizado.");
  }
}
